import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { UserService } from '../../user/user.service';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly ttlMIN = 3600; // 1 giờ
  private readonly ttlMAX = 3600 * 7 * 24; // 7 ngày
  private readonly accessFrequencyHash = 'access_frequency';
  private readonly CACHE_THRESHOLD_PERCENTAGE = 0.8;
  private readonly CACHE_EVICTION_PERCENTAGE = 0.2;
  private readonly DEFAULT_TTL = 3600; // TTL mặc định nếu không truyền vào

  private changeStream: any;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly userservice: UserService,
  ) {}

  async onModuleInit() {
    this.redisClient.on('ready', () => {
      this.logger.log('Redis đã sẵn sàng');
    });

    // Kiểm tra xem MongoDB có hỗ trợ change stream không
    try {
      const adminDb = this.userModel.db.db.admin();
      const { ok } = await adminDb.command({ replSetGetStatus: 1 });
      if (ok !== 1) {
        this.logger.warn('MongoDB không chạy trong chế độ replica set, change stream sẽ không hoạt động.');
      } else {
        this.watchUserChanges();
      }
    } catch (error) {
      this.logger.error('Không thể kiểm tra trạng thái replica set của MongoDB:', error);
    }

    setImmediate(async () => {
      try {
        await this.cacheAllUsers();
        this.logger.log('Cache toàn bộ user thành công');
      } catch (err) {
        this.logger.error('Lỗi cacheAllUsers setImmediate:', err);
      }
    });
  }

  async onModuleDestroy() {
    this.logger.log('Đóng RedisService...');
    if (this.changeStream) {
      try {
        await this.changeStream.close();
        this.logger.log('Đã đóng changeStream');
      } catch (error) {
        this.logger.error('Lỗi khi đóng changeStream:', error);
      }
    }
    try {
      await this.redisClient.quit();
      this.logger.log('Đã tắt kết nối Redis');
    } catch (error) {
      this.logger.error('Lỗi khi tắt kết nối Redis:', error);
    }
  }

  async isRunning(): Promise<boolean> {
    return this.redisClient.status === 'ready';
  }

  async getJson(key: string): Promise<any> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể lấy JSON');
      return null;
    }
    try {
      const data = await this.redisClient.call('JSON.GET', key);
      this.logger.debug(`Lấy JSON cho key ${key}`);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      this.logger.error(`Lỗi khi lấy JSON cho key ${key}:`, error);
      return null;
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const stream = this.redisClient.scanStream({ match: pattern });
    const keys: string[] = [];
    for await (const keysBatch of stream) {
      keys.push(...keysBatch);
    }
    return keys;
  }

  async getAll(){
    let list: any[]= [];
    const pattern = `userId:*`;
    const keys = await this.scanKeys(pattern);
    for (const key of keys){
      const user = await this.getJson(key);
      list.push(user);
    }
    return list;
  }

  async setJson(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể set JSON');
      return;
    }
    try {
      await this.redisClient.call('JSON.SET', key, '$', JSON.stringify(value));
      let finalTTL = ttl;
      if (finalTTL < this.ttlMIN) {
        finalTTL = this.ttlMIN;
      } else if (finalTTL > this.ttlMAX) {
        finalTTL = this.ttlMAX;
      }
      await this.redisClient.expire(key, finalTTL);
      this.logger.debug(`Đã set JSON cho key ${key} với TTL ${finalTTL}`);
    } catch (error) {
      this.logger.error(`Lỗi khi set JSON cho key ${key}:`, error);
    }
  }

  async deleteCache(key: string): Promise<void> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể xóa cache');
      return;
    }
    try {
      await this.redisClient.del(key);
      this.logger.debug(`Đã xóa cache cho key ${key}`);
    } catch (error) {
      this.logger.error(`Lỗi khi xóa cache cho key ${key}:`, error);
    }
  }

  private async getMaxFrequency(): Promise<number> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể lấy max frequency');
      return 1;
    }
    try {
      const frequencies = await this.redisClient.hvals(this.accessFrequencyHash);
      if (!frequencies || frequencies.length === 0) {
        return 1;
      }
      const maxFreq = frequencies.reduce((max, val) => {
        const f = parseInt(val, 10);
        return f > max ? f : max;
      }, 0);
      return maxFreq === 0 ? 1 : maxFreq;
    } catch (error) {
      this.logger.error('Lỗi khi tính getMaxFrequency:', error);
      return 1;
    }
  }

  async CacheMISS(key: string) {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể xử lý CacheMISS');
      return;
    }
    const initialFreq = 1;
    await this.redisClient.hset(this.accessFrequencyHash, key, initialFreq.toString());

    const data = await this.getJson(key);
    if (data?.email) {
      await this.redisClient.expire(data.email, this.ttlMIN);
    }
    await this.redisClient.expire(key, this.ttlMIN);
    await this.manageCacheByMemoryUsage();
  }

  async CacheHIT(key: string) {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể xử lý CacheHIT');
      return;
    }
    let freq = 0;
    const currentFrequencyStr = await this.redisClient.hget(this.accessFrequencyHash, key);
    if (currentFrequencyStr) {
      freq = parseInt(currentFrequencyStr, 10);
    }
    freq += 1;
    await this.redisClient.hset(this.accessFrequencyHash, key, freq.toString());

    const maxFreq = await this.getMaxFrequency();
    const ratio = freq / maxFreq;
    let newTtl = this.ttlMIN + ratio * (this.ttlMAX - this.ttlMIN);
    newTtl = Math.floor(newTtl);

    const data = await this.getJson(key);
    if (data?.email) {
      await this.redisClient.expire(data.email, newTtl);
    }
    await this.redisClient.expire(key, newTtl);
    await this.manageCacheByMemoryUsage();
  }

  async manageCacheByMemoryUsage(): Promise<void> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể quản lý bộ nhớ');
      return;
    }
    try {
      // Lấy thông tin bộ nhớ đã sử dụng
      const usedMemoryBytesStr = await this.redisClient.config('GET', 'used_memory');
      const usedMemoryBytes = parseInt(usedMemoryBytesStr[1] || '0', 10);
      // Lấy thông tin bộ nhớ tối đa
      const maxMemoryConfig = await this.redisClient.config('GET', 'maxmemory');
      const maxMemoryBytes = parseInt(maxMemoryConfig[1] || '0', 10);

      if (maxMemoryBytes > 0 && (usedMemoryBytes / maxMemoryBytes) > this.CACHE_THRESHOLD_PERCENTAGE) {
        const freqPairsObj = await this.redisClient.hgetall(this.accessFrequencyHash);
        const freqPairs = Object.entries(freqPairsObj).map(([key, freq]) => ({
          key,
          frequency: parseInt(freq as string, 10),
        }));
        freqPairs.sort((a, b) => a.frequency - b.frequency);
        const countToRemove = Math.floor(freqPairs.length * this.CACHE_EVICTION_PERCENTAGE);
        const keysToRemove = freqPairs.slice(0, countToRemove);

        for (const item of keysToRemove) {
          const userId = await this.getJson(item.key);
          if (userId) {
            await this.deleteCache(userId);
          }
          await this.redisClient.hdel(this.accessFrequencyHash, item.key);
          await this.deleteCache(item.key);
        }
        this.logger.warn(`Đã xóa ${keysToRemove.length} key có tần suất thấp nhất để giảm dung lượng bộ nhớ.`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi quản lý bộ nhớ đệm theo dung lượng:', error);
    }
  }

  async cacheSingleUser(user: UserDocument): Promise<void> {
    if (!(await this.isRunning())) {
      this.logger.warn('Redis không sẵn sàng, không thể cache user');
      return;
    }
    const userData = user.toObject()
    delete userData.refreshToken;

    const pipeline = this.redisClient.pipeline();
    pipeline.call('JSON.SET', `user:${userData.email}`, '$', JSON.stringify(userData._id));
    pipeline.expire(`user:${userData.email}`, this.ttlMAX);
    pipeline.call('JSON.SET', `userId:${userData._id}`, '$', JSON.stringify(userData));
    pipeline.expire(`userId:${userData._id}`, this.ttlMAX);
    pipeline.hset(this.accessFrequencyHash, `userId:${userData._id}`, '0');
    await pipeline.exec();
    this.logger.debug(`Đã cache user với email: ${userData.email}`);
  }

  async cacheAllUsers(): Promise<void> {
    try {
      const profileUsers = await this.userservice.returnAllUserInfor();
      const pipeline = this.redisClient.pipeline();
      for (const user of profileUsers) {
        const userData = user.toObject ? user.toObject() : { ...user };
        delete userData.refreshToken;

        pipeline.call('JSON.SET', `user:${userData.email}`, '$', JSON.stringify(userData._id));
        pipeline.expire(`user:${userData.email}`, this.ttlMAX);
        pipeline.call('JSON.SET', `userId:${user._id}`, '$', JSON.stringify(userData));
        pipeline.expire(`userId:${user._id}`, this.ttlMAX);
        pipeline.hset(this.accessFrequencyHash, `userId:${userData._id}`, '0');
      }
      await pipeline.exec();
      this.logger.log(`Đã cache ${profileUsers.length} user`);
    } catch (error) {
      this.logger.error('Lỗi khi cache tất cả users:', error);
    }
  }

  async watchUserChanges() {
    try {
      this.changeStream = this.userModel.watch();
      this.logger.log('Bắt đầu theo dõi thay đổi trong User collection');

      this.changeStream.on('change', async (change) => {
        this.logger.debug(`Nhận được change event: ${JSON.stringify(change)}`);
        const ID = change.documentKey?._id;

        if (!(await this.isRunning())) {
          return;
        }
        if (!ID) {
          this.logger.warn('Không tìm thấy user trong change event');
          return;
        }

        let email: string;
        const dataCache = await this.getJson(ID);
        if (dataCache) {
          email = dataCache.email;
        } else if (change.fullDocument) {
          email = change.fullDocument.email;
        }

        switch (change.operationType) {
          case 'update':
            await this.handleUpdateEvent(ID, change);
            break;
          case 'insert':
            await this.handleInsertEvent(ID);
            break;
          case 'delete':
            if (email) {
              await this.handleDeleteEvent(ID, email);
            }
            break;
          default:
            this.logger.warn(`Sự kiện không được xử lý: ${change.operationType}`);
        }
      });

      this.changeStream.on('error', (error) => {
        this.logger.error('Lỗi trong changeStream:', error);
      });
    } catch (error) {
      this.logger.error('Lỗi khi thiết lập changeStream:', error);
    }
  }

  private async handleUpdateEvent(ID: string, change: any): Promise<void> {
    if (!change.updateDescription) {
      this.logger.debug(`Update event không có updateDescription cho document ${ID}`);
      return;
    }
    const updatedFields = Object.keys(change.updateDescription.updatedFields || {});
    const filteredFields = updatedFields.filter((field) => !['password', 'updatedAt'].includes(field));

    if (filteredFields.length === 0) {
      this.logger.debug(`Update event không chứa field cần cache cho document ${ID}`);
      return;
    }

    try {
      const cachedUser = await this.getJson(ID);
      if (cachedUser) {
        const updates = Object.fromEntries(
          filteredFields.map((field) => [field, change.updateDescription.updatedFields[field]]),
        );
        await this.setJson(ID, { ...cachedUser, ...updates });
        this.logger.log(`Đã cập nhật cache cho user ${ID} với fields: ${filteredFields.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi cập nhật một phần cache cho user:', error);
    }
  }

  private async handleInsertEvent(ID: string): Promise<void> {
    try {
      const user = await this.userModel.findById(ID).select('-updatedAt -password');
      if (user) {
        await this.cacheSingleUser(user);
        this.logger.log(`Cache được cập nhật cho user ${ID} sau insert`);
      } else {
        this.logger.warn(`Không tìm thấy user với id ${ID} để cache sau insert`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi cache user sau insert:', error);
    }
  }

  private async handleDeleteEvent(ID: string, email: string): Promise<void> {
    try {
      await this.redisClient.hdel(this.accessFrequencyHash, ID);
      await this.deleteCache(ID);
      await this.deleteCache(email);
      this.logger.log(`Đã xóa cache cho user với id ${ID} do bị xóa khỏi DB`);
    } catch (error) {
      this.logger.error('Lỗi khi xóa cache cho user sau delete:', error);
    }
  }
}
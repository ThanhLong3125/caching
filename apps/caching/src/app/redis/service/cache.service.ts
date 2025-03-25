import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Observable, of, tap } from 'rxjs';

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: any,
    protected readonly reflector: Reflector,
    private readonly redisService: RedisService
  ) {
    super(cacheManager, reflector);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>{
    const isRedisAvailable = await this.redisService.isRunning();
    const request = context.switchToHttp().getRequest();
    const userId = request.user?._id?.toString(); 

    if (!userId) {
      return next.handle();
    }

    const cacheKey = `userId:${userId}`;

    if (isRedisAvailable) {
      const cachedData = await this.redisService.getJson(cacheKey);
      if (cachedData) {
        console.log(`Key: ${cacheKey}`);
        return of(cachedData); 
      }

      return next.handle().pipe(
        tap(async (response) => {
          await this.redisService.setJson(cacheKey, response);
        })
      );
    } else {
      console.log('Redis bị lỗi, bỏ qua cache.');
      return next.handle();
    }
  }
}

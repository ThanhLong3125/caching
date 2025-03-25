import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './service/redis.service';
import { UserModule } from '../user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoUpdateAccess } from './service/newaccesstoken.service';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../user/schemas/user.schema';
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";
import { CustomCacheInterceptor } from './service/cache.service';


@Global()
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(()=>UserModule),
    CacheModule.register({
      store: redisStore,
      host: '172.20.0.2',
      port: 6379,
      isGlobal: false
  })
  ],
  providers: [
    RedisService,
    AutoUpdateAccess,
    CustomCacheInterceptor
  ],
  exports: [ RedisService, AutoUpdateAccess, CacheModule, CustomCacheInterceptor],
})
export class RedisModule {}
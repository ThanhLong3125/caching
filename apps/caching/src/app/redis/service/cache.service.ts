import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { CallHandler, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Observable } from 'rxjs';

@Injectable()
export class CustomCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) cacheManager: any, 
    protected readonly reflector: Reflector, 
    private readonly redisService: RedisService, 
  ) {
    super(cacheManager, reflector); 
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const isRedisAvailable = await this.redisService.isRunning();

    if (isRedisAvailable) {
      console.log('✅ Redis đang chạy, sử dụng cache.');
      return super.intercept(context, next); 
    } else {
      console.log('⚠️ Redis bị lỗi, bỏ qua cache.');
      return next.handle(); 
    }
  }
}

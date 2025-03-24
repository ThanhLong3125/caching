import { Module, Global, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './service/redis.service';
import { UserModule } from '../user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AutoUpdateAccess } from './service/newaccesstoken.service';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../user/schemas/user.schema';


@Global()
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(()=>UserModule),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const client = new Redis({
          host: configService.get<string>('REDIS_HOST'),
          port: configService.get<number>('REDIS_PORT'),
        });

        client.on('error', (err) => {
          console.error('Redis error:', err);
        });

        return client;
      },
      inject: [ConfigService],
    },
    RedisService,
    AutoUpdateAccess,
  ],
  exports: ['REDIS_CLIENT', RedisService, AutoUpdateAccess],
})
export class RedisModule {}
import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { RedisModule } from "../redis/redis.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { CustomCacheInterceptor } from "../redis/service/cache.service";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        forwardRef(() => RedisModule)
    ],
    providers: [
        UserService,
        {
            provide: APP_INTERCEPTOR,
            useClass: CustomCacheInterceptor,
        },
    ],
    exports: [UserService, MongooseModule],
    controllers: [UserController],

})
export class UserModule { }
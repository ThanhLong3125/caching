import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { RedisModule } from "../redis/redis.module";

@Module({
    imports: [
        MongooseModule.forFeature([{name: User.name, schema: UserSchema}]),
        forwardRef(()=>RedisModule)
    ],
    providers: [
        UserService,
    ],
    exports: [UserService, MongooseModule],
    controllers: [UserController],

})
export class UserModule{}
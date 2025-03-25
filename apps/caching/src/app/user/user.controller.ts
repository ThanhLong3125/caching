import { Controller, Body, Get, Patch, UseInterceptors } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UpdateUserInforDTO } from "./DTO/updateInfor.dto";
import { RedisService } from "../redis/service/redis.service";
import { CacheInterceptor } from "@nestjs/cache-manager";

@Controller("user")
@ApiTags("User")
@UseInterceptors(CacheInterceptor)
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly redisService: RedisService
  ) { }

  @Patch()
  @ApiOperation({ summary: "Update user common information" })
  async updateUserInfor(@Body() payload: UpdateUserInforDTO) {
    return this.userService.updateUserCommonInfor(payload);
  }

  @Get()
  @ApiOperation({ summary: "Get user common information" })
  async getUserInfor() {
    const isRunning = await this.redisService.isRunning();
    if (isRunning) {
      const data = await this.redisService.getAll();
      if (data) {
        return data;
      } else {
        const list = await this.userService.returnAllUserInfor();
        for(const user of list){
          await this.redisService.setJson(`user:${user.email}`, user._id);
          await this.redisService.setJson(`userId:${user._id}`, user);
        }
      }
    }
    return await this.userService.returnAllUserInfor();
  }
}
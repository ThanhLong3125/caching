import { Controller, Body, Get, Patch, UseInterceptors, UseGuards, Req } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { UpdateUserInforDTO } from "./DTO/updateInfor.dto";
import { RedisService } from "../redis/service/redis.service";
import { CacheInterceptor } from "@nestjs/cache-manager";
import { UserDocument } from "./schemas/user.schema";
import { JwtAuthGuard } from "../auth/passport/jwt-auth.guard";
import { CustomCacheInterceptor } from "../redis/service/cache.service";

interface RequestWithUser extends Request {
  user: UserDocument;
}

@Controller("user")
@ApiTags("User")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @UseInterceptors(CacheInterceptor)
  @ApiOperation({ summary: "Get user common information" })
  async getUserInfor() {
    console.log(`caching data`)
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

  @Get(':id')
  @UseInterceptors(CustomCacheInterceptor) 
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ description: `Get my profile` })
  async GetProfile(@Req() req: RequestWithUser) {
    console.log(`caching data`)
    if (req.user) {
      const ID = req.user._id.toString();
      return await this.userService.GetProfile(ID);
    }
  }
}
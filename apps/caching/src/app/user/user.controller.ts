import { Controller, Put, Body, Get } from "@nestjs/common";
import { UserService } from "./user.service";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UpdateUserInforDTO } from "./DTO/updateInfor.dto";

@Controller("user")
@ApiTags("User")
export class UserController{
  constructor(private readonly userService: UserService) {}

  @Put()
  @ApiOperation({ summary: "Update user common information" })
  async updateUserInfor(@Body() payload: UpdateUserInforDTO) {
    return this.userService.updateUserCommonInfor(payload);
  }
  
  @Get()
  @ApiOperation({ summary: "Get user common information" })
  async getUserInfor() {
    return this.userService.returnAllUserInfor();
  }
}
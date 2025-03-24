import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Register } from '../user/DTO/register.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'User Registration' })
  async register(@Body() registerDto: Register) {
    return this.authService.register(registerDto);
  }
}

import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Register } from './DTO/register.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Login } from './DTO/login.dto';

@ApiTags('Auth')
@Controller('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'User Registration' })
  async register(@Body() registerDto: Register) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() payload: Login) {
      return this.authService.login(payload);
  }
}

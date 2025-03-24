import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './DTO/jwtpayload.dto';
@Injectable()
export class TokenService {
  private readonly accessTokenOptions: { secret: string; expiresIn: string };
  private readonly refreshTokenOptions: { expiresIn: string };

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenOptions = {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRED'),
    };

    this.refreshTokenOptions = {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRED'),
    };
  }

  createAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, this.accessTokenOptions);
  }

  createRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, this.refreshTokenOptions);
  }
}

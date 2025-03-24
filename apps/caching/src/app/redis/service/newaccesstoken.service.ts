import {  Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import { TokenService } from '../../auth/token.service';

@Injectable()
export class AutoUpdateAccess {
  private readonly logger = new Logger(AutoUpdateAccess.name);
  private readonly timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly timecreateNewToken: number = 50;
  constructor(
    private readonly redisService: RedisService,
    private readonly tokenService: TokenService,
  ) {    }

  scheduleTimer(key: string, delay: number, callback: () => void): void {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.logger.log(`Cleared existing timer for key: ${key}`);
    }
    const timer = setTimeout(callback, delay);
    this.timers.set(key, timer);
    this.logger.log(`Scheduled timer for key: ${key} in ${delay} ms`);
  }

  cancelTimer(key: string): void {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
      this.logger.log(`Cancelled timer for key: ${key}`);
    }
  }

  scheduleTokenRefresh(ID: string, tokenCreatedAt?: number): void {
    const createdAt = tokenCreatedAt || Date.now();
    const expiresAt = createdAt + this.timecreateNewToken * 1000;
    const delay = Math.max(expiresAt - Date.now(), 0);

    this.scheduleTimer(ID, delay, async () => {
      try {
        await this.refreshToken(ID);
      } catch (error) {
        this.logger.error(`Error refreshing token for ${ID}: ${error.message}`);
      }
    });
  }

  async refreshToken(ID: string): Promise<void> {
    const tokenDataStr = await this.redisService.getJson(ID);
    if (!tokenDataStr) {
      this.logger.warn(`No token data found for ${ID}`);
      return;
    }
    const newAccessToken = this.tokenService.createAccessToken({ email: tokenDataStr.email, sub: ID });
    tokenDataStr.accessToken = newAccessToken;
    await this.redisService.setJson(ID, tokenDataStr);
    this.logger.log(`Refreshed token for ${ID}`);
    this.scheduleTokenRefresh(ID, Date.now());
  }
  cancelTokenRefresh(ID: string): void {
    this.cancelTimer(ID);
    this.logger.log(`Cancelled token refresh for ${ID}`);
  }
}

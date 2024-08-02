import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async generateTokens(payload: any) {
    const refreshTokenExpirationTime = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRATION_TIME',
    );

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = refreshTokenExpirationTime
      ? await this.jwtService.signAsync(payload, {
          expiresIn: refreshTokenExpirationTime,
        })
      : undefined;

    return { accessToken, refreshToken };
  }

  async createTokens(
    id: number,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: id };
    return this.generateTokens(payload);
  }

  async refreshTokens(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken);
    const newPayload = { sub: payload['sub'] };
    return this.generateTokens(newPayload);
  }
}

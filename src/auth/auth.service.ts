import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getJwt(id: number): Promise<{ accessToken: string }> {
    const payload = { sub: id };
    const secrect = this.configService.get<string>('JWT_SECRET');
    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}

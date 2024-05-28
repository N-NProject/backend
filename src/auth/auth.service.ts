import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly jwtService: JwtService,
    ) { }

    async getJwt(id: number): Promise<{ accessToken: string; }> {
        const payload = { sub: id };
        const accessToken = await this.jwtService.signAsync(payload);

        return { accessToken };
    }
}

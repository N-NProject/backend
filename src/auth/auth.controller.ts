import { BadRequestException, Controller, Get, Query, Redirect, Res } from '@nestjs/common';
import axios from 'axios';
import { Response } from 'express';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1/auth')
export class AuthController {
    readonly origin: string;
    readonly client_id: string;
    readonly redirect_uri: string;

    constructor(
        private readonly config: ConfigService,
        private readonly userService: UserService,
        private readonly authService: AuthService,
    ) {
        this.origin = this.config.get<string>('ORIGIN');
        this.client_id = this.config.get<string>('REST_API');

        this.redirect_uri = `${this.origin}/auth/redirect`;
    }

    @Get('authorize')
    @Redirect()
    authorize(@Query('scope') scope: string) {
        const scopeParam = scope ? `&scope=${scope}` : '';

        return {
            url: `https://kauth.kakao.com/oauth/authorize?client_id=${this.client_id}&redirect_uri=${this.redirect_uri}&response_type=code${scopeParam}`,
        };
    }

    @Get('redirect')
    async redirect(@Query('code') code: string) {
        const data = {
            grant_type: 'authorization_code',
            client_id: this.client_id,
            redirect_uri: this.redirect_uri,
            code: code,
        };

        try {
            const accessTokenResponse = await axios.post('https://kauth.kakao.com/oauth/token', data, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const kakaoUserInfoResponse = await axios.post('https://kapi.kakao.com/v2/user/me', {}, {
                headers: {
                    'Authorization': 'Bearer ' + accessTokenResponse.data.access_token,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            const kakaoId = kakaoUserInfoResponse.data.id;

            let user = await this.userService.getUserByKakaoId(kakaoId);
            if (!user) { user = await this.userService.createUserWithKakaoId(kakaoId); }

            return this.authService.getJwt(user.id);
        } catch {
            throw new BadRequestException();
        }
    }

    // 카카오 로그인 테스트 용도, 삭제 예정
    @Get()
    getTestHtml(@Res() res: Response): void {
        res.header('Content-Type', 'text/html');
        res.send(`
            <html>
                <body>
                    <a href="/auth/authorize">
                        <img src="//k.kakaocdn.net/14/dn/btqCn0WEmI3/nijroPfbpCa4at5EIsjyf0/o.jpg" width="222"/>
                    </a>
                </body>
            </html>
        `);
    };
}

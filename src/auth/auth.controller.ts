import {
  BadRequestException,
  Controller,
  Get,
  Logger,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import axios from 'axios';
import { Request, Response } from 'express';
import { UserService } from 'src/user/user.service';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  private readonly origin: string;
  private readonly client_id: string;
  private readonly redirect_uri: string;

  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {
    this.origin = this.config.get<string>('ORIGIN');
    this.client_id = this.config.get<string>('REST_API');

    this.redirect_uri = `${this.origin}/api/v1/auth/redirect`;
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
  async redirect(@Query('code') code: string, @Res() res: Response) {
    const data = {
      grant_type: 'authorization_code',
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      code: code,
    };

    try {
      const accessTokenResponse = await axios.post(
        'https://kauth.kakao.com/oauth/token',
        data,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const kakaoUserInfoResponse = await axios.post(
        'https://kapi.kakao.com/v2/user/me',
        {},
        {
          headers: {
            Authorization: 'Bearer ' + accessTokenResponse.data.access_token,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const kakaoId = kakaoUserInfoResponse.data.id;

      let user = await this.userService.getUserByKakaoId(kakaoId);
      if (!user) {
        user = await this.userService.createUserWithKakaoId(kakaoId);
      }

      const { accessToken, refreshToken } = await this.authService.createTokens(
        user.id,
      );

      this.setTokens(res, accessToken, refreshToken);
    } catch {
      throw new BadRequestException();
    }
  }

  @Get('redirect/refresh')
  async refresh(@Req() req: Request, @Res() res: Response) {
    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      req.cookies['refreshToken'],
    );

    this.setTokens(res, accessToken, refreshToken);
  }

  // 카카오 로그인 테스트 용도, 삭제 예정
  @Get()
  getTestHtml(@Res() res: Response): void {
    res.header('Content-Type', 'text/html');
    res.send(`
            <html>
                <body>
                    <a href="/api/v1/auth/authorize">
                        <img src="//k.kakaocdn.net/14/dn/btqCn0WEmI3/nijroPfbpCa4at5EIsjyf0/o.jpg" width="222"/>
                    </a>
                </body>
            </html>
        `);
  }

  private setTokens(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      // secure: true, // HTTPS 사용 시 활성화
      sameSite: 'strict',
      path: '/api/v1', // 쿠키가 /api/v1 경로에서만 유효
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      // secure: true, // HTTPS 사용 시 활성화
      sameSite: 'strict',
      path: '/api/v1/auth/redirect', // 쿠키가 /api/v1/auth/redirect 경로에서만 유효
    });

    this.logger.log(
      `Tokens issued - Access Token: ${accessToken}, Refresh Token: ${refreshToken}`,
    );

    res.sendStatus(200);
  }
}

import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const Token = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const token = request.token;
    console.log(`데코레이션애소의 토근`, token);

    return data ? token?.[data] : token;
  },
);

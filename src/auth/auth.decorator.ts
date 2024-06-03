import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const Token = createParamDecorator(
    (data: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const token = request.token;

        return data ? token?.[data] : token;
    },
);
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UploadedFiles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.files;
  },
);

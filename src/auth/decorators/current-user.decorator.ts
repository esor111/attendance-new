import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Decorator to extract current user from request
 * Usage: @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT authentication guard
 * Allows requests to proceed even if no token is provided
 * If token is provided, it will be validated and user attached to request
 * Used for endpoints that work with or without authentication
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    // Allow request to proceed even if no user is found
    // This makes the guard optional
    return user;
  }
}
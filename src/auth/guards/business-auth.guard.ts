import { Injectable, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

/**
 * Business authentication guard
 * Extends JwtAuthGuard to require Business Token with businessId
 * Used for business-specific endpoints that need business context
 */
@Injectable()
export class BusinessAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First verify the JWT token
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Extract user from request
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    // Verify that the token contains businessId (Business Token)
    if (!user.businessId) {
      throw new ForbiddenException(
        'Business token required for this endpoint. Please switch to a business profile.',
      );
    }

    return true;
  }
}
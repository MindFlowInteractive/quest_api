import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface JwtErrorInfo {
  name?: string;
  message?: string;
  expiredAt?: Date;
}
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Continue with JWT authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: JwtErrorInfo | undefined): any {
    // Handle JWT errors
    if (err || !user) {
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      } else if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      throw err || new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}

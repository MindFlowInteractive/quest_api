import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    // Get user from request
    const { user } = context.switchToHttp().getRequest();
    
    // Check if user exists and has required roles
    return user && user.roles && this.hasRequiredRoles(user.roles, requiredRoles);
  }

  private hasRequiredRoles(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
    return requiredRoles.some(role => userRoles.includes(role));
  }
}

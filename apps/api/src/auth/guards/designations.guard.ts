import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DESIGNATIONS_KEY } from '../decorators/designations.decorator';

/**
 * DesignationsGuard — companion to RolesGuard.
 * Checks that req.user.designations includes at least one of the allowed
 * designations attached via @Designations(). Bypasses the check when no
 * @Designations() metadata is present (open to all authenticated users).
 */
@Injectable()
export class DesignationsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(DESIGNATIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const designations: string[] = user?.designations ?? [];
    return required.some((d) => designations.includes(d));
  }
}

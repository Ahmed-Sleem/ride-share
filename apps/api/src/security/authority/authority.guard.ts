/* ══════════════════════════════════════════════════════════════════════
   The authority guard (§8.2). The ONLY sanctioned way to gate a route on a
   capability. M1 attaches the authenticated actor (with its role) to the
   request; until then there is no actor, so every guarded route denies —
   which is correct: nothing is reachable until authentication exists.
   ══════════════════════════════════════════════════════════════════════ */
import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, Capability } from './authority.resolver.js';
import { ForbiddenException } from '@nestjs/common';

export const CAPABILITY_KEY = 'requiredCapability';
export const RequireCapability = (capability: Capability) => SetMetadata(CAPABILITY_KEY, capability);

@Injectable()
export class AuthorityGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Capability | undefined>(CAPABILITY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true; // no capability required
    const req = context.switchToHttp().getRequest<{ actor?: { role?: string } }>();
    const role = (req.actor?.role as never) ?? undefined;
    if (!can(role, required)) {
      throw new ForbiddenException({ message_key: 'auth.forbidden', details: { capability: required } });
    }
    return true;
  }
}

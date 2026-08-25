/* ══════════════════════════════════════════════════════════════════════
   JWT auth guard — verifies the access token (jose, pinned iss/aud) and
   attaches the actor. The ONLY place an access token is verified; capability
   decisions stay in the single authority resolver (§8.2).
   ══════════════════════════════════════════════════════════════════════ */
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CONFIG, type Env } from '../config/env.js';
import { verifyAccessToken } from './token.js';
import { IdentityService } from '../modules/identity/application/identity.service.js';
import type { Actor } from '../modules/identity/contracts/types.js';

type RequestWithActor = FastifyRequest & { actor?: Actor };

@Injectable()
export class IdentityGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly env: Env,
    private readonly identity: IdentityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException({ message_key: 'auth.missing_token' });
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      const claims = await verifyAccessToken(this.env.JWT_SECRET, token);
      const live = await this.identity.liveActor(claims.sub);
      if (!live) throw new UnauthorizedException({ message_key: 'auth.invalid_token' });
      req.actor = live;
      return true;
    } catch {
      throw new UnauthorizedException({ message_key: 'auth.invalid_token' });
    }
  }
}

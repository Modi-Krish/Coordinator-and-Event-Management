import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client.handshake.headers.authorization);

    if (!token) {
      throw new WsException('Unauthorized access');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret',
      });
      client.data.user = payload;
    } catch {
      throw new WsException('Unauthorized access');
    }

    return true;
  }

  private extractTokenFromHeader(authorization?: string): string | undefined {
    if (!authorization) return undefined;
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

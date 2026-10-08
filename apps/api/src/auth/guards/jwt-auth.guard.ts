import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private supabase;
  constructor(private prisma: PrismaService) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }
    
    const token = authHeader.split(' ')[1];
    console.log("JWT Auth Guard: Checking token", token.substring(0, 10) + "...");
    
    // Verify token directly with Supabase
    const { data: { user }, error } = await this.supabase.auth.getUser(token);
    
    if (error || !user) {
      console.log("Supabase getUser error:", error);
      throw new UnauthorizedException(error?.message || 'Invalid token');
    }
    
    console.log("Supabase Auth Success, finding user DB record for ID:", user.id);
    
    // Fetch public profile to get roles
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (!dbUser) {
      console.log("User not found in DB for ID:", user.id);
      throw new UnauthorizedException('User not found in DB');
    }
    
    console.log("JwtAuthGuard Success:", dbUser.email);
    
    request.user = {
      userId: dbUser.id,
      email: dbUser.email,
      roles: dbUser.roles
    };
    
    return true;
  }
}

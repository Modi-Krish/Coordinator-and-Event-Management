import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async register(data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 1. Create user in Supabase Auth (auth.users)
    const { data: authData, error } = await this.supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (error) {
      throw new ConflictException(error.message);
    }

    // 2. Create the public profile in our database
    const _user = await this.prisma.user.create({
      data: {
        id: authData.user.id,
        email: data.email,
        name: data.name,
        passwordHash: '', // Deprecated in Supabase migration
        roles: [Role.CITIZEN],
        designations: ['STUDENT']
      },
    });

    return this.login({ email: data.email, password: data.password });
  }

  async login(userOrData: any) {
    if (userOrData.email && userOrData.password) {
      // Authenticate with Supabase
      const { data: authData, error } = await this.supabase.auth.signInWithPassword({
        email: userOrData.email,
        password: userOrData.password,
      });

      if (error) {
        throw new UnauthorizedException(error.message);
      }

      // Fetch our public database profile to get roles
      const user = await this.prisma.user.findUnique({
        where: { id: authData.user.id },
      });

      if (!user) {
        throw new UnauthorizedException('User profile not found');
      }

      return {
        access_token: authData.session.access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          designations: user.designations,
        }
      };
    }
    
    throw new UnauthorizedException('Invalid payload');
  }
}

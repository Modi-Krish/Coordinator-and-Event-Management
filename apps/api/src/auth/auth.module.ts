import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { AuthorizationService } from './authorization.service';
import { DesignationsGuard } from './guards/designations.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, JwtStrategy, AuthorizationService, DesignationsGuard],
  controllers: [AuthController],
  exports: [AuthorizationService, DesignationsGuard],
})
export class AuthModule {}

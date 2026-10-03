import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async createUser(managerId: string, data: any) {
    // 1. Check email
    const existingUser = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);

    // 2. Create User
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        passwordHash: hashedPassword,
        role: data.role,
        departmentId: data.departmentId,
      },
    });

    // 3. Establish Relationship
    if (managerId) {
      await this.prisma.userRelationship.create({
        data: {
          managerUserId: managerId,
          subordinateUserId: user.id,
          relationshipType: 'DIRECT_REPORT',
        },
      });
    }

    return user;
  }

  async getMyTeam(userId: string, role: Role) {
    if (role === Role.SUPERVISOR || role === Role.ADMIN) {
      return this.prisma.user.findMany(); // Manager sees all
    }

    // For other roles, recursively (or just directly) get subordinates
    const relations = await this.prisma.userRelationship.findMany({
      where: { managerUserId: userId },
      include: {
        subordinate: true,
      },
    });
    
    return relations.map((r: any) => r.subordinate);
  }

  async getHierarchy(userId: string) {
    // Basic implementation for 1 level down
    const relations = await this.prisma.userRelationship.findMany({
      where: { managerUserId: userId },
      include: {
        subordinate: {
          include: {
            subordinateRelations: {
              include: {
                subordinate: true
              }
            }
          }
        }
      }
    });
    return relations;
  }
}

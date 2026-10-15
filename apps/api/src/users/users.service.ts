import { Injectable, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { AuthorizationService } from '../auth/authorization.service';

// Staleness threshold: 5 minutes
const LOCATION_STALE_THRESHOLD_MS = 5 * 60 * 1000;

export type LocationStatus =
  | 'LIVE'
  | 'STALE'
  | 'SHARING_DISABLED'
  | 'UNAVAILABLE';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authorizationService: AuthorizationService,
  ) {}

  async createUser(managerId: string, data: any) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password || 'password123', 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        phone: data.phone,
        passwordHash: hashedPassword,
        roles: data.roles || (data.role ? [data.role] : [Role.STAFF]),
        designations: data.designations || (data.designation ? [data.designation] : []),
        departmentId: data.departmentId,
      },
    });

    if (managerId) {
      await this.prisma.userRelationship.upsert({
        where: {
          managerUserId_subordinateUserId: {
            managerUserId: managerId,
            subordinateUserId: user.id,
          },
        },
        update: {},
        create: {
          managerUserId: managerId,
          subordinateUserId: user.id,
          relationshipType: 'DIRECT_REPORT',
        },
      });
    }

    return user;
  }

  async getMyTeam(userId: string, roles: Role[], designations: string[] = []) {
    const isSupervisorOrAdmin =
      roles.includes(Role.SUPERVISOR) || roles.includes(Role.ADMIN);
    const isManager = designations.map((d) => d.toUpperCase()).includes('MANAGER');

    if (isSupervisorOrAdmin || isManager) {
      return this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          roles: true,
          designations: true,
          status: true,
          isActive: true,
          locationSharingEnabled: true,
          lastLocationAt: true,
        },
      });
    }

    const relations = await this.prisma.userRelationship.findMany({
      where: { managerUserId: userId },
      include: {
        subordinate: {
          select: {
            id: true,
            name: true,
            email: true,
            roles: true,
            designations: true,
            status: true,
            isActive: true,
            locationSharingEnabled: true,
            lastLocationAt: true,
          },
        },
      },
    });

    return relations.map((r: any) => r.subordinate);
  }

  async getHierarchy(userId: string) {
    return this.prisma.userRelationship.findMany({
      where: { managerUserId: userId },
      include: {
        subordinate: {
          include: {
            subordinateRelations: {
              include: {
                subordinate: {
                  select: {
                    id: true,
                    name: true,
                    designations: true,
                    roles: true,
                    status: true,
                    locationSharingEnabled: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateRolesAndDesignations(userId: string, roles?: Role[], designations?: string[]) {
    const data: any = {};
    if (roles) data.roles = roles;
    if (designations) data.designations = designations;

    if (Object.keys(data).length === 0) return null;

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Location Sharing Controls (Phase 5)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Toggle location sharing on/off for the current user.
   * Returns the updated user record.
   */
  async setLocationSharing(userId: string, enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { locationSharingEnabled: enabled },
      select: { id: true, name: true, locationSharingEnabled: true, lastLocationAt: true },
    });
  }

  /**
   * Get location status of users visible to the requesting supervisor.
   */
  async getTeamLocations(viewer: any) {
    const canViewAll =
      viewer.roles?.includes(Role.SUPERVISOR) ||
      viewer.roles?.includes(Role.ADMIN) ||
      (viewer.designations ?? []).map((d: string) => d.toUpperCase()).includes('MANAGER');

    let targetUsers: any[];

    if (canViewAll) {
      targetUsers = await this.prisma.user.findMany({
        select: {
          id: true,
          name: true,
          designations: true,
          status: true,
          locationSharingEnabled: true,
          lastLocationAt: true,
        },
      });
    } else {
      const rels = await this.prisma.userRelationship.findMany({
        where: { managerUserId: viewer.userId },
        include: {
          subordinate: {
            select: {
              id: true,
              name: true,
              designations: true,
              status: true,
              locationSharingEnabled: true,
              lastLocationAt: true,
            },
          },
        },
      });
      targetUsers = rels.map((r: any) => r.subordinate);
    }

    const now = Date.now();

    return targetUsers.map((u: any) => {
      let locationStatus: LocationStatus = 'UNAVAILABLE';

      if (!u.locationSharingEnabled) {
        locationStatus = 'SHARING_DISABLED';
      } else if (u.lastLocationAt) {
        const ageMs = now - new Date(u.lastLocationAt).getTime();
        locationStatus = ageMs <= LOCATION_STALE_THRESHOLD_MS ? 'LIVE' : 'STALE';
      }

      return {
        userId: u.id,
        name: u.name,
        designations: u.designations,
        status: u.status,
        locationSharingEnabled: u.locationSharingEnabled,
        lastLocationAt: u.lastLocationAt,
        locationStatus,
      };
    });
  }

  /**
   * Get the last known location of a specific user if viewer is authorized.
   */
  async getUserLastLocation(viewer: any, targetUserId: string) {
    const canView = await this.authorizationService.canViewUserLocation(viewer, targetUserId);
    if (!canView) {
      throw new ForbiddenException('Not authorized to view this user\'s location.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { locationSharingEnabled: true, lastLocationAt: true },
    });

    if (!target?.locationSharingEnabled) {
      return { locationStatus: 'SHARING_DISABLED', location: null };
    }

    const lastLoc = await this.prisma.locationHistory.findFirst({
      where: { userId: targetUserId },
      orderBy: { recordedAt: 'desc' },
    });

    if (!lastLoc) {
      return { locationStatus: 'UNAVAILABLE', location: null };
    }

    const ageMs = Date.now() - new Date(lastLoc.recordedAt).getTime();
    const locationStatus: LocationStatus =
      ageMs <= LOCATION_STALE_THRESHOLD_MS ? 'LIVE' : 'STALE';

    return {
      locationStatus,
      lastLocationAt: lastLoc.recordedAt,
      location: {
        latitude: lastLoc.latitude,
        longitude: lastLoc.longitude,
        accuracy: lastLoc.accuracy,
      },
    };
  }
}

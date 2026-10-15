import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsersService } from './users.service.js';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('UsersService - Location Sharing & Team Visibility', () => {
  let service: UsersService;
  let mockPrisma: any;
  let mockAuthService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        update: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      userRelationship: {
        findMany: vi.fn(),
      },
    };

    mockAuthService = {
      canViewUserLocation: vi.fn(),
    };

    service = new UsersService(mockPrisma, mockAuthService);
  });

  describe('setLocationSharing', () => {
    it('should update locationSharingEnabled flag in DB', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'coord-1',
        name: 'Alice',
        locationSharingEnabled: true,
        lastLocationAt: null,
      });

      const res = await service.setLocationSharing('coord-1', true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'coord-1' },
        data: { locationSharingEnabled: true },
        select: expect.any(Object),
      });
      expect(res.locationSharingEnabled).toBe(true);
    });
  });

  describe('getTeamLocations', () => {
    it('should classify locationStatus as SHARING_DISABLED when user has sharing turned off', async () => {
      const supervisor = {
        userId: 'sup-1',
        roles: [Role.SUPERVISOR],
        designations: [],
      };

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          name: 'Disabled Coord',
          locationSharingEnabled: false,
          lastLocationAt: new Date(),
        },
      ]);

      const list = await service.getTeamLocations(supervisor);
      expect(list[0].locationStatus).toBe('SHARING_DISABLED');
    });

    it('should classify locationStatus as LIVE when updated recently', async () => {
      const supervisor = {
        userId: 'sup-1',
        roles: [Role.SUPERVISOR],
        designations: [],
      };

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-2',
          name: 'Active Coord',
          locationSharingEnabled: true,
          lastLocationAt: new Date(Date.now() - 30 * 1000), // 30 sec ago (threshold is 5 mins)
        },
      ]);

      const list = await service.getTeamLocations(supervisor);
      expect(list[0].locationStatus).toBe('LIVE');
    });

    it('should classify locationStatus as STALE when older than 5 minutes', async () => {
      const supervisor = {
        userId: 'sup-1',
        roles: [Role.SUPERVISOR],
        designations: [],
      };

      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-3',
          name: 'Stale Coord',
          locationSharingEnabled: true,
          lastLocationAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
        },
      ]);

      const list = await service.getTeamLocations(supervisor);
      expect(list[0].locationStatus).toBe('STALE');
    });
  });

  describe('getUserLastLocation', () => {
    it('should throw ForbiddenException if viewer is not authorized by authService', async () => {
      mockAuthService.canViewUserLocation.mockResolvedValue(false);

      await expect(
        service.getUserLastLocation({ userId: 'other-coord' }, 'target-coord'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

/**
 * AuthorizationService
 *
 * Centralized RBAC + designation-aware authorization logic.
 * All rule functions throw ForbiddenException when the caller is not permitted,
 * or return void when the action is allowed — so callers can use them inline.
 *
 * Designation hierarchy (low → high):
 *   STUDENT < COORDINATOR < INTERN ≈ CORE < FACULTY < MANAGER
 *
 * Task assignment matrix:
 *   MANAGER  → anyone in their hierarchy
 *   FACULTY  → INTERN, CORE, COORDINATOR within scope
 *   INTERN   → COORDINATOR within scope
 *   CORE     → COORDINATOR within scope
 *   COORDINATOR → NO ONE
 *   STUDENT  → NO ONE
 */
@Injectable()
export class AuthorizationService {
  constructor(private prisma: PrismaService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: get the designation(s) of a user (array, lowercased for matching)
  // ─────────────────────────────────────────────────────────────────────────
  private desig(user: any): string[] {
    return (user?.designations ?? []).map((d: string) => d.toUpperCase());
  }

  private hasDesignation(user: any, ...desigs: string[]): boolean {
    const d = this.desig(user);
    return desigs.some((x) => d.includes(x.toUpperCase()));
  }

  private isSupervisorOrAdmin(user: any): boolean {
    return (
      user?.roles?.includes(Role.SUPERVISOR) ||
      user?.roles?.includes(Role.ADMIN)
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Hierarchy: is `targetUserId` a subordinate of `managerId` in the DB?
  // ─────────────────────────────────────────────────────────────────────────
  async isSubordinate(managerId: string, targetUserId: string): Promise<boolean> {
    if (managerId === targetUserId) return false;
    const rel = await this.prisma.userRelationship.findFirst({
      where: { managerUserId: managerId, subordinateUserId: targetUserId },
    });
    return !!rel;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canAssignTask
  // ─────────────────────────────────────────────────────────────────────────
  async canAssignTask(
    assigner: any,
    assigneeId: string,
  ): Promise<void> {
    // Coordinator and Student cannot assign tasks to anyone
    if (
      this.hasDesignation(assigner, 'COORDINATOR', 'STUDENT') &&
      !this.isSupervisorOrAdmin(assigner)
    ) {
      throw new ForbiddenException(
        'Coordinators and Students cannot assign tasks to others.',
      );
    }

    // ADMINs bypass scope checks
    if (assigner?.roles?.includes(Role.ADMIN)) return;

    // Fetch the potential assignee
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
      select: { id: true, designations: true, roles: true },
    });

    if (!assignee) {
      throw new ForbiddenException('Assignee not found.');
    }

    const assigneeDesig = (assignee.designations ?? []).map((d) => d.toUpperCase());

    // MANAGER — can assign to anyone in their hierarchy
    if (this.hasDesignation(assigner, 'MANAGER')) {
      const inScope = await this.isSubordinate(assigner.userId, assigneeId);
      // Managers see everyone; for supervisors with manager designation allow broad scope
      if (!inScope && !this.isSupervisorOrAdmin(assigner)) {
        throw new ForbiddenException(
          'Manager can only assign tasks to users within their organizational scope.',
        );
      }
      return; // allowed
    }

    // FACULTY — can assign to INTERN, CORE, COORDINATOR within scope
    if (this.hasDesignation(assigner, 'FACULTY')) {
      const allowedAssigneeDesigs = ['INTERN', 'CORE', 'COORDINATOR'];
      const assigneeOk = allowedAssigneeDesigs.some((d) => assigneeDesig.includes(d));
      if (!assigneeOk) {
        throw new ForbiddenException(
          'Faculty can only assign tasks to Interns, Core Members, or Coordinators.',
        );
      }
      const inScope = await this.isSubordinate(assigner.userId, assigneeId);
      if (!inScope) {
        throw new ForbiddenException(
          'Faculty can only assign tasks to users within their authorized scope.',
        );
      }
      return;
    }

    // INTERN or CORE — can assign to COORDINATOR within scope
    if (this.hasDesignation(assigner, 'INTERN', 'CORE')) {
      const assigneeOk = assigneeDesig.includes('COORDINATOR');
      if (!assigneeOk) {
        throw new ForbiddenException(
          'Interns and Core Members can only assign tasks to Coordinators.',
        );
      }
      const inScope = await this.isSubordinate(assigner.userId, assigneeId);
      if (!inScope) {
        throw new ForbiddenException(
          'You can only assign tasks to Coordinators within your authorized scope.',
        );
      }
      return;
    }

    // SUPERVISOR role (without a specific designation) — treat as MANAGER-level
    if (this.isSupervisorOrAdmin(assigner)) return;

    // Default deny
    throw new ForbiddenException('You are not authorized to assign tasks.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canViewIssue
  // ─────────────────────────────────────────────────────────────────────────
  async canViewIssue(user: any, issue: any): Promise<boolean> {
    if (!issue) return false;

    // Admin/Supervisor — full visibility
    if (this.isSupervisorOrAdmin(user)) return true;

    // Reporter or direct assignee
    if (issue.reportedById === user.userId) return true;
    if (issue.assignedToId === user.userId) return true;

    // Interns/Core/Faculty: can see issues assigned to their subordinates
    if (this.hasDesignation(user, 'MANAGER', 'FACULTY', 'INTERN', 'CORE')) {
      if (issue.assignedToId) {
        const inScope = await this.isSubordinate(user.userId, issue.assignedToId);
        if (inScope) return true;
      }
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canAssignIssue (direct assignment by authority)
  // ─────────────────────────────────────────────────────────────────────────
  async canAssignIssue(assigner: any, assigneeId: string): Promise<void> {
    if (assigner?.roles?.includes(Role.ADMIN)) return;

    // Coordinators and Students cannot assign issues
    if (this.hasDesignation(assigner, 'COORDINATOR', 'STUDENT')) {
      throw new ForbiddenException('Coordinators cannot assign issues to others.');
    }

    // Supervisors/Managers can assign broadly
    if (this.isSupervisorOrAdmin(assigner)) return;

    // Faculty/Intern/Core must have scope relationship
    if (this.hasDesignation(assigner, 'MANAGER', 'FACULTY', 'INTERN', 'CORE')) {
      const inScope = await this.isSubordinate(assigner.userId, assigneeId);
      if (!inScope) {
        throw new ForbiddenException(
          'You can only assign issues to users within your authorized scope.',
        );
      }
      return;
    }

    throw new ForbiddenException('You are not authorized to assign issues.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canUpdateIssue
  // ─────────────────────────────────────────────────────────────────────────
  async canUpdateIssue(user: any, issue: any): Promise<void> {
    const isOwner = issue.reportedById === user.userId;
    const isAssignee = issue.assignedToId === user.userId;
    const isSupervisorOrAdmin = this.isSupervisorOrAdmin(user);

    if (!isOwner && !isAssignee && !isSupervisorOrAdmin) {
      // Interns/Core/Faculty managing subordinate issues
      if (
        this.hasDesignation(user, 'MANAGER', 'FACULTY', 'INTERN', 'CORE') &&
        issue.assignedToId
      ) {
        const inScope = await this.isSubordinate(user.userId, issue.assignedToId);
        if (inScope) return;
      }
      throw new ForbiddenException('Not authorized to update this issue.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canViewUserLocation
  // ─────────────────────────────────────────────────────────────────────────
  async canViewUserLocation(viewer: any, targetUserId: string): Promise<boolean> {
    if (this.isSupervisorOrAdmin(viewer)) return true;
    if (this.hasDesignation(viewer, 'MANAGER')) return true;
    if (this.hasDesignation(viewer, 'FACULTY', 'INTERN', 'CORE')) {
      return this.isSubordinate(viewer.userId, targetUserId);
    }
    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canResolveIssue
  // ─────────────────────────────────────────────────────────────────────────
  canResolveIssue(user: any, issue: any): boolean {
    const isAssignee = issue.assignedToId === user.userId;
    const isSupervisorOrAdmin = this.isSupervisorOrAdmin(user);
    return isAssignee || isSupervisorOrAdmin;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // canVerifyIssue — SUPERVISOR or ADMIN only
  // ─────────────────────────────────────────────────────────────────────────
  canVerifyIssue(user: any): boolean {
    return this.isSupervisorOrAdmin(user);
  }
}

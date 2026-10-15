"use client";

import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  designations: string[];
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  return user;
}

// ─── Role/designation helpers ────────────────────────────────────────────────

export function hasDesignation(user: CurrentUser | null, ...desigs: string[]): boolean {
  if (!user) return false;
  const userDesigs = user.designations.map((d) => d.toUpperCase());
  return desigs.some((d) => userDesigs.includes(d.toUpperCase()));
}

export function hasRole(user: CurrentUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.some((r) => user.roles.includes(r));
}

export function isSupervisorOrAdmin(user: CurrentUser | null): boolean {
  return hasRole(user, "SUPERVISOR", "ADMIN");
}

export function isManager(user: CurrentUser | null): boolean {
  return hasDesignation(user, "MANAGER");
}

export function isFaculty(user: CurrentUser | null): boolean {
  return hasDesignation(user, "FACULTY");
}

export function isCoordinator(user: CurrentUser | null): boolean {
  return hasDesignation(user, "COORDINATOR");
}

export function canAssignTasks(user: CurrentUser | null): boolean {
  if (!user) return false;
  // Coordinators and Students cannot assign tasks
  if (hasDesignation(user, "COORDINATOR", "STUDENT") && !isSupervisorOrAdmin(user)) {
    return false;
  }
  return isSupervisorOrAdmin(user) || hasDesignation(user, "MANAGER", "FACULTY", "INTERN", "CORE");
}

export function canVerifyIssues(user: CurrentUser | null): boolean {
  return isSupervisorOrAdmin(user);
}

export function canViewLocationMap(user: CurrentUser | null): boolean {
  return (
    isSupervisorOrAdmin(user) ||
    hasDesignation(user, "MANAGER", "FACULTY", "INTERN", "CORE")
  );
}

export function canReportIssues(user: CurrentUser | null): boolean {
  if (!user) return false;
  return true; // All authenticated users can report
}

export function canCreateTasks(user: CurrentUser | null): boolean {
  if (!user) return false;
  if (hasRole(user, "CITIZEN") && !isSupervisorOrAdmin(user)) return false;
  return true;
}

export function getUserDisplayDesignation(user: CurrentUser | null): string {
  if (!user) return "";
  if (user.designations.length > 0) return user.designations[0];
  if (user.roles.length > 0) return user.roles[0];
  return "";
}

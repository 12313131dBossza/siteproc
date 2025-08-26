"use client";
import React, { ReactNode } from 'react';
import { useRoleGuard } from '@/lib/useRoleGuard';

export default function RoleGate({ role, children }: { role: string; children: ReactNode }) {
  useRoleGuard(role);
  return <>{children}</>;
}

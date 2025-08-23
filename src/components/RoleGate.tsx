"use client";
import React from 'react';
import { useRoleGuard } from '@/lib/useRoleGuard';

export default function RoleGate({ role, children }: { role: string; children: React.ReactNode }) {
  useRoleGuard(role);
  return <>{children}</>;
}

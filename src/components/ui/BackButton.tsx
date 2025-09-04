"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface BackButtonProps {
  /** Custom href to navigate to. If not provided, uses browser history */
  href?: string;
  /** Custom label for the button */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use Link component (for href) or router.back() */
  useHistory?: boolean;
}

export function BackButton({ 
  href, 
  label = "Go Back", 
  className = "", 
  useHistory = false 
}: BackButtonProps) {
  const router = useRouter();

  const baseClasses = "inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50 transition-colors";
  const combinedClasses = `${baseClasses} ${className}`;

  if (href && !useHistory) {
    return (
      <Link href={href} className={combinedClasses}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    );
  }

  return (
    <button 
      onClick={() => router.back()} 
      className={combinedClasses}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );
}

export default BackButton;

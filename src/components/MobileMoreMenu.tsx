"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Building2,
  FileText,
  HardHat,
  Settings,
  User,
  CreditCard,
  BarChart3,
  X,
  ChevronRight,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const moreMenuItems: MenuItem[] = [
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    description: "Manage client relationships",
  },
  {
    name: "Contractors",
    href: "/contractors",
    icon: HardHat,
    description: "Contractor directory",
  },
  {
    name: "Bids",
    href: "/bids",
    icon: FileText,
    description: "View and manage bids",
  },
  {
    name: "Companies",
    href: "/companies",
    icon: Building2,
    description: "Company management",
  },
  {
    name: "Change Orders",
    href: "/change-orders",
    icon: FileText,
    description: "Track change orders",
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Payment tracking",
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    description: "Analytics and reports",
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
    description: "Your profile settings",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "App preferences",
  },
];

interface MobileMoreMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ isOpen, onClose }: MobileMoreMenuProps) {
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        style={{ animation: "fadeIn 0.2s ease-out" }}
      />

      {/* Menu Modal */}
      <div
        className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl"
        style={{
          maxHeight: "85vh",
          animation: "slideUp 0.3s ease-out",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">More</h2>
            <p className="text-sm text-gray-500 mt-0.5">Access all features</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="overflow-y-auto px-4 py-3" style={{ maxHeight: "calc(85vh - 140px)" }}>
          <div className="space-y-1">
            {moreMenuItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl transition-all active:scale-98
                    ${
                      isActive
                        ? "bg-blue-50 border-2 border-blue-200"
                        : "bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }
                  `}
                >
                  <div
                    className={`
                    p-2.5 rounded-xl
                    ${isActive ? "bg-blue-600" : "bg-gray-100"}
                  `}
                  >
                    <Icon
                      className={`h-5 w-5 ${isActive ? "text-white" : "text-gray-600"}`}
                      strokeWidth={2.5}
                    />
                  </div>

                  <div className="flex-1">
                    <div
                      className={`font-semibold ${
                        isActive ? "text-blue-900" : "text-gray-900"
                      }`}
                    >
                      {item.name}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${
                        isActive ? "text-blue-600" : "text-gray-500"
                      }`}
                    >
                      {item.description}
                    </div>
                  </div>

                  <ChevronRight
                    className={`h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-400"}`}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

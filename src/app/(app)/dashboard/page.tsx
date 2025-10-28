import { AppLayout } from "@/components/app-layout";
import EnhancedDashboard from "./EnhancedDashboard";
import { BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <AppLayout
      title="Dashboard"
      description="Welcome back! Here's an overview of your projects and financial metrics"
      actions={
        <div className="hidden md:flex gap-2">
          <Link href="/reports">
            <Button variant="ghost" leftIcon={<BarChart3 className="h-4 w-4" />}>
              Full Reports
            </Button>
          </Link>
          <Link href="/projects">
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              New Project
            </Button>
          </Link>
        </div>
      }
    >
      <EnhancedDashboard />
    </AppLayout>
  );
}

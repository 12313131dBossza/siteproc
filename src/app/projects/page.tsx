"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Search, DollarSign, Clock, CheckCircle, AlertCircle, TrendingUp, TrendingDown, BarChart3, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormModal, FormModalActions, Input, Select } from '@/components/ui';

interface Project {
  id: string;
  name: string;
  code?: string | null;
  status: "active" | "on_hold" | "closed";
  budget: number;
  actual_expenses?: number; // Auto-calculated by triggers
  variance?: number; // Auto-calculated by triggers
  rollup?: { actual_expenses?: number; variance?: number; }; // Fallback from rollup API
  created_at?: string;
}

const tabs = [
  { id: "all", label: "All Projects", icon: FolderOpen },
  { id: "active", label: "Active", icon: Clock },
  { id: "on_hold", label: "On Hold", icon: AlertCircle },
  { id: "closed", label: "Completed", icon: CheckCircle },
];

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({ name: "", budget: 0, code: "", status: "active" });
  const [isCreating, setIsCreating] = useState(false);
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch("/api/projects", { headers: { Accept: "application/json" } });
      const json = await res.json().catch(()=>({}));
      if (res.ok) {
        const projectsData = Array.isArray(json) ? json : (json.data || []);
        const projectsWithRollup = await Promise.all(
          projectsData.map(async (project: Project) => {
            try {
              const rollupRes = await fetch(`/api/projects/${project.id}/rollup`);
              const rollupData = await rollupRes.json();
              return { ...project, rollup: rollupData.data };
            } catch { return project; }
          })
        );
        setProjects(projectsWithRollup);
      } else {
        setProjects([]);
        setError(json?.error || `Failed to load projects (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setProjects([]);
      setError(e?.message || "Failed to load projects");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createProject() {
    // Prevent double submission
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Accept: "application/json" }, 
        body: JSON.stringify(form) 
      });
      if (res.ok) {
        const j = await res.json().catch(()=>({}));
        const created = j?.id ? j : (j?.data);
        if (created) setProjects(prev => [created, ...prev]);
        setShowCreateModal(false);
        setForm({ name: "", budget: 0, code: "", status: "active" });
        load();
      } else {
        const e = await res.json().catch(()=>({}));
        console.error('Project creation failed:', e);
        const errorMsg = e.details ? `${e.error}: ${e.details}` : (e.error || "Failed to create project");
        alert(errorMsg);
      }
    } finally {
      setIsCreating(false);
    }
  }

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    if (activeTab !== "all") filtered = filtered.filter(p => p.status === activeTab);
    if (searchTerm) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered;
  }, [projects, activeTab, searchTerm]);

  const stats = useMemo(() => {
    const totalBudget = projects.reduce((sum, p) => sum + Number(p.budget), 0);
    const totalActual = projects.reduce((sum, p) => sum + Number(p.actual_expenses ?? p.rollup?.actual_expenses ?? 0), 0);
    const totalVariance = totalBudget - totalActual;
    const activeCount = projects.filter(p => p.status === "active").length;
    return { totalBudget, totalActual, totalVariance, activeCount, totalCount: projects.length };
  }, [projects]);

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Manage project budgets and track expenses</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 w-full md:w-auto justify-center">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {error && (<div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 p-3"><div className="font-medium mb-1">Couldn not load projects</div><div className="text-sm">{error}</div></div>)}

        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"><div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2"><div><p className="text-xs md:text-sm text-gray-500">Total Budget</p><p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalBudget)}</p></div><div className="bg-blue-100 rounded-full p-2 md:p-3"><BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" /></div></div></div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"><div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2"><div><p className="text-xs md:text-sm text-gray-500">Total Actual</p><p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats.totalActual)}</p></div><div className="bg-green-100 rounded-full p-2 md:p-3"><DollarSign className="h-5 w-5 md:h-6 md:w-6 text-green-600" /></div></div></div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"><div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2"><div><p className="text-xs md:text-sm text-gray-500">Total Variance</p><p className={cn("text-lg md:text-2xl font-bold mt-1", stats.totalVariance >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(stats.totalVariance)}</p></div><div className={cn("rounded-full p-2 md:p-3", stats.totalVariance >= 0 ? "bg-green-100" : "bg-red-100")}>{stats.totalVariance >= 0 ? <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600" /> : <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-600" />}</div></div></div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 md:p-6"><div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2"><div><p className="text-xs md:text-sm text-gray-500">Active Projects</p><p className="text-lg md:text-2xl font-bold text-gray-900 mt-1">{stats.activeCount}</p><p className="text-xs text-gray-500 mt-1">of {stats.totalCount} total</p></div><div className="bg-indigo-100 rounded-full p-2 md:p-3"><FolderOpen className="h-5 w-5 md:h-6 md:w-6 text-indigo-600" /></div></div></div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div className="flex items-center gap-2 overflow-x-auto">{tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors", activeTab === tab.id ? "bg-blue-100 text-blue-700 font-medium" : "text-gray-600 hover:bg-gray-100")}><tab.icon className="h-4 w-4" />{tab.label}<span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-white/50">{tab.id === "all" ? projects.length : projects.filter(p => p.status === tab.id).length}</span></button>))}</div><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search projects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" /></div></div></div>

        {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{Array.from({ length: 6 }).map((_, i) => (<div key={i} className="animate-pulse bg-white border border-gray-200 rounded-lg p-4 md:p-6"><div className="h-5 w-40 bg-gray-200 rounded mb-2" /><div className="h-3 w-24 bg-gray-100 rounded mb-4" /><div className="grid grid-cols-3 gap-3"><div className="h-4 bg-gray-100 rounded" /><div className="h-4 bg-gray-100 rounded" /><div className="h-4 bg-gray-100 rounded" /></div></div>))}</div>) : filteredProjects.length === 0 ? (<div className="text-center py-12 bg-white rounded-lg border border-gray-200"><FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" /><h3 className="text-lg font-medium text-gray-900 mb-2">{searchTerm ? "No projects found" : "No projects yet"}</h3><p className="text-gray-500 mb-4">{searchTerm ? "Try adjusting your search criteria" : "Create your first project to track budget, actuals, and deliveries"}</p>{!searchTerm && (<Button onClick={() => setShowCreateModal(true)} className="mx-auto"><Plus className="h-4 w-4 mr-2" />Create Project</Button>)}</div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">{filteredProjects.map(p => (<ProjectCard key={p.id} project={p} formatCurrency={formatCurrency} />))}</div>)}

        <FormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="New Project"
          description="Create a new project to track budget, expenses, and deliveries"
          icon={<FolderOpen className="h-5 w-5" />}
          size="md"
        >
          <form onSubmit={(e) => { e.preventDefault(); createProject(); }} className="space-y-4">
            <Input
              label="Project Name"
              required
              value={form.name}
              onChange={e => setForm(f => ({...f, name: e.target.value}))}
              placeholder="e.g., Main Building Construction"
              fullWidth
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget"
                type="number"
                required
                min={0}
                value={form.budget}
                onChange={e => setForm(f => ({...f, budget: Number(e.target.value)}))}
                placeholder="50000"
                leftIcon={<DollarSign className="h-4 w-4" />}
              />

              <Input
                label="Code"
                value={form.code}
                onChange={e => setForm(f => ({...f, code: e.target.value}))}
                placeholder="PRJ-001"
                helpText="Optional project code"
              />
            </div>

            <Select
              label="Status"
              value={form.status}
              onChange={e => setForm(f => ({...f, status: e.target.value}))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'closed', label: 'Closed' }
              ]}
            />

            <FormModalActions
              onCancel={() => setShowCreateModal(false)}
              submitLabel="Create Project"
              isSubmitting={isCreating}
              submitDisabled={!form.name || form.budget <= 0 || isCreating}
            />
          </form>
        </FormModal>
      </div>
    </AppLayout>
  );
}

function ProjectCard({ project, formatCurrency }: { project: Project; formatCurrency: (n: number) => string }) {
  const router = useRouter();
  const variance = (project.rollup?.variance !== undefined) ? project.rollup.variance : Number(project.budget) - Number(project.rollup?.actual_expenses || 0);
  const variancePercentage = Number(project.budget) > 0 ? (variance / Number(project.budget)) * 100 : 0;

  return (
    <div onClick={() => router.push(`/projects/${project.id}`)} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{project.name}</h3>
          {project.code && (<p className="text-sm text-gray-500 mt-1">Code: {project.code}</p>)}
        </div>
        <span className={cn("px-3 py-1 text-xs font-medium rounded-full", project.status === "active" && "bg-green-100 text-green-800", project.status === "on_hold" && "bg-yellow-100 text-yellow-800", project.status === "closed" && "bg-gray-100 text-gray-800")}>{project.status === "on_hold" ? "On Hold" : project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
      </div>
      <div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div><p className="text-xs text-gray-500 mb-1">Budget</p><p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(project.budget))}</p></div><div><p className="text-xs text-gray-500 mb-1">Actual</p><p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(project.rollup?.actual_expenses || 0))}</p></div><div><p className="text-xs text-gray-500 mb-1">Variance</p><p className={cn("text-sm font-semibold", variance >= 0 ? "text-green-600" : "text-red-600")}>{formatCurrency(variance)}</p></div></div><div className="pt-3 border-t border-gray-100"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className={cn("h-2 w-2 rounded-full", variance >= 0 ? "bg-green-500" : "bg-red-500")} /><span className="text-xs text-gray-500">{variance >= 0 ? "On Budget" : "Over Budget"}</span></div><span className={cn("text-xs font-medium", variancePercentage >= 0 ? "text-green-600" : "text-red-600")}>{variancePercentage >= 0 ? "+" : ""}{variancePercentage.toFixed(1)}%</span></div></div></div>
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500"><span>Click to view details</span><Eye className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" /></div>
    </div>
  );
}

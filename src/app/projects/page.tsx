"use client";

import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { 
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Calendar,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  MapPin,
  Eye,
  Edit,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  code?: string | null;
  status: "active" | "on_hold" | "closed";
  budget: number;
  rollup?: {
    actual_expenses?: number;
    variance?: number;
  };
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
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', budget: 0, code: '', status: 'active' });
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch('/api/projects', { headers: { 'Accept': 'application/json' } });
      const json = await res.json().catch(()=>({}));
      if (res.ok) {
        const projectsData = json.data || [];
        // Fetch rollup data for each project
        const projectsWithRollup = await Promise.all(
          projectsData.map(async (project: Project) => {
            try {
              const rollupRes = await fetch(`/api/projects/${project.id}/rollup`);
              const rollupData = await rollupRes.json();
              return {
                ...project,
                rollup: rollupData.data
              };
            } catch {
              return project;
            }
          })
        );
        setProjects(projectsWithRollup);
      } else {
        setProjects([]);
        setError(json?.error || `Failed to load projects (HTTP ${res.status})`);
      }
    } catch (e: any) {
      setProjects([]);
      setError(e?.message || 'Failed to load projects');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createProject() {
    const res = await fetch('/api/projects', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
      body: JSON.stringify(form) 
    });
    if (res.ok) {
      const j = await res.json().catch(()=>({}));
      const created = j?.data;
      if (created) setProjects(prev => [created, ...prev]);
      setModal(false);
      setForm({ name: '', budget: 0, code: '', status: 'active' });
      load();
    } else {
      const e = await res.json().catch(()=>({}));
      alert(e.error || 'Failed to create project');
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">New Project</button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 text-red-700 p-3">
          <div className="font-medium mb-1">Couldn’t load projects</div>
          <div className="text-sm">{error}</div>
          <div className="text-xs mt-2 text-red-600/80">If this is a new environment, make sure the database migration for projects has been applied (sql/projects.sql) and you’re signed in.</div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_,i)=> (
            <div key={i} className="animate-pulse bg-white border rounded-lg p-5">
              <div className="h-5 w-40 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-24 bg-gray-100 rounded mb-4" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
                <div className="h-4 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-gray-600 border border-dashed rounded-lg p-8 text-center">
          <div className="text-lg font-medium mb-1">No projects yet</div>
          <div className="text-sm mb-4">Create your first project to track budget, actuals, and deliveries.</div>
          <button onClick={()=>setModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Create a Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => <ProjectCard key={p.id} p={p} />)}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">New Project</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600">Name</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="w-full border rounded px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600">Budget</label>
                  <input type="number" min={0} value={form.budget} onChange={e=>setForm(f=>({...f,budget:Number(e.target.value)}))} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600">Code</label>
                  <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Status</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="w-full border rounded px-3 py-2">
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={()=>setModal(false)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={createProject} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectCard({ p }: { p: Project }) {
  const [rollup, setRollup] = useState<any>(null)
  useEffect(() => {
  fetch(`/api/projects/${p.id}/rollup`).then(r=>r.json()).then(j=>setRollup(j.data)).catch(()=>setRollup(null))
  }, [p.id])

  const varianceColor = useMemo(() => {
    const v = Number(rollup?.variance || 0)
    return v >= 0 ? 'text-green-600' : 'text-red-600'
  }, [rollup])

  return (
  <a href={`/projects/${p.id}`} className="block bg-white border rounded-lg p-5 hover:shadow-md transition">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-lg">{p.name}</div>
        <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">{p.status}</span>
      </div>
      {p.code && <div className="text-xs text-gray-500 mb-3">Code: {p.code}</div>}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-gray-500">Budget</div>
          <div>${Number(p.budget).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Actual</div>
          <div>${Number(rollup?.actual_expenses || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-gray-500">Variance</div>
          <div className={varianceColor}>${Number(rollup?.variance || 0).toFixed(2)}</div>
        </div>
      </div>
    </a>
  )
}

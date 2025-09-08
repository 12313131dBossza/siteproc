"use client"
import { useEffect, useMemo, useState } from 'react'

type Project = {
  id: string
  name: string
  code: string | null
  status: 'active'|'on_hold'|'closed'
  budget: number
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', budget: 0, code: '', status: 'active' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/projects')
    const json = await res.json()
    if (res.ok) setProjects(json.data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function createProject() {
    const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setModal(false)
      setForm({ name: '', budget: 0, code: '', status: 'active' })
      load()
    } else {
      const e = await res.json().catch(()=>({}))
      alert(e.error || 'Failed to create project')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Projects</h1>
        <button onClick={() => setModal(true)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">New Project</button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-gray-600">No projects yet.</div>
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
    fetch(`/api/projects/${p.id}/rollup`).then(r=>r.json()).then(j=>setRollup(j.data)).catch(()=>{})
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

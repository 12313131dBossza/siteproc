'use client'

import { useState, useEffect } from 'react'
import { UserPlus, X, Check, Loader2, Truck, FolderOpen } from 'lucide-react'
import { toast } from 'sonner'

interface Supplier {
  id: string
  email: string
  full_name: string
}

interface Project {
  id: string
  name: string
}

interface AssignSupplierModalProps {
  deliveryId: string
  isOpen: boolean
  onClose: () => void
  onAssigned?: () => void
  currentSupplier?: { id: string; full_name: string; email: string } | null
}

export function AssignSupplierModal({
  deliveryId,
  isOpen,
  onClose,
  onAssigned,
  currentSupplier
}: AssignSupplierModalProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<string>(currentSupplier?.id || '')

  useEffect(() => {
    if (isOpen) {
      fetchProjects()
      setSelectedSupplier(currentSupplier?.id || '')
      setSelectedProject('')
      setSuppliers([])
    }
  }, [isOpen, currentSupplier])

  // Fetch suppliers when project is selected
  useEffect(() => {
    if (selectedProject) {
      fetchProjectSuppliers(selectedProject)
    } else {
      setSuppliers([])
    }
  }, [selectedProject])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      if (data.data) {
        setProjects(data.data)
      } else if (Array.isArray(data)) {
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjectSuppliers = async (projectId: string) => {
    setLoadingSuppliers(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/suppliers`)
      const data = await res.json()
      if (data.suppliers) {
        setSuppliers(data.suppliers)
      } else {
        setSuppliers([])
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
      setSuppliers([])
    } finally {
      setLoadingSuppliers(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedSupplier) {
      toast.error('Please select a supplier')
      return
    }

    setAssigning(true)
    try {
      console.log('Assigning supplier:', selectedSupplier, 'to delivery:', deliveryId)
      const res = await fetch(`/api/deliveries/${deliveryId}/assign-supplier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier_id: selectedSupplier })
      })

      const data = await res.json()
      console.log('Assignment response:', res.status, data)
      
      if (res.ok && data.success) {
        toast.success('Supplier assigned successfully')
        // Call onAssigned callback to refresh the list
        if (onAssigned) {
          console.log('Calling onAssigned callback to refresh deliveries...')
          onAssigned()
        }
        onClose()
      } else {
        toast.error(data.error || 'Failed to assign supplier')
      }
    } catch (error) {
      console.error('Error assigning supplier:', error)
      toast.error('Failed to assign supplier')
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async () => {
    setAssigning(true)
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/assign-supplier`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (res.ok) {
        toast.success('Supplier assignment removed')
        onAssigned?.()
        onClose()
      } else {
        toast.error(data.error || 'Failed to remove assignment')
      }
    } catch (error) {
      console.error('Error removing assignment:', error)
      toast.error('Failed to remove assignment')
    } finally {
      setAssigning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Truck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Assign Supplier</h3>
              <p className="text-sm text-gray-500">Select a supplier for this delivery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current Assignment */}
              {currentSupplier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium mb-1">Currently Assigned</p>
                  <p className="text-sm text-blue-900">{currentSupplier.full_name}</p>
                  <p className="text-xs text-blue-700">{currentSupplier.email}</p>
                </div>
              )}

              {/* Project Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FolderOpen className="h-4 w-4 inline mr-1" />
                  Select Project First
                </label>
                <select
                  value={selectedProject}
                  onChange={(e) => {
                    setSelectedProject(e.target.value)
                    setSelectedSupplier('')
                  }}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">-- Choose a project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a project to see its assigned suppliers
                </p>
              </div>

              {/* Supplier Selection - only show when project is selected */}
              {selectedProject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Supplier
                  </label>
                  {loadingSuppliers ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    </div>
                  ) : suppliers.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-lg">
                      <UserPlus className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No suppliers in this project</p>
                      <p className="text-xs text-gray-400">
                        Add suppliers via Project Access first
                      </p>
                    </div>
                  ) : (
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">-- Choose a supplier --</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.full_name} ({supplier.email})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Info */}
              {selectedSupplier && (
                <p className="text-xs text-gray-500">
                  Only the assigned supplier will see this delivery in their Deliveries page.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div>
            {currentSupplier && (
              <button
                onClick={handleRemove}
                disabled={assigning}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Remove Assignment
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAssign}
              disabled={assigning || !selectedSupplier || suppliers.length === 0}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {assigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

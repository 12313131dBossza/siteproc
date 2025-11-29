'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Circle, 
  AlertCircle,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  X
} from 'lucide-react';

interface Milestone {
  id: string;
  name: string;
  description?: string;
  target_date: string;
  completed: boolean;
  completed_at?: string;
  sort_order: number;
  linked_delivery_id?: string;
  linked_order_id?: string;
  linked_payment_id?: string;
  auto_complete_on?: string;
  completed_by_profile?: { full_name?: string; username?: string };
}

interface ProjectTimelineProps {
  projectId: string;
  projectStatus?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  canEdit?: boolean;
}

export default function ProjectTimeline({ 
  projectId,
  projectStatus,
  projectStartDate,
  projectEndDate,
  canEdit = true
}: ProjectTimelineProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetDate, setFormTargetDate] = useState('');

  const fetchMilestones = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/milestones`);
      
      if (response.ok) {
        const data = await response.json();
        setMilestones(data.milestones || []);
        setProgress(data.progress || 0);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchMilestones();
  }, [fetchMilestones]);

  const handleToggleComplete = async (milestone: Milestone) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !milestone.completed, name: milestone.name }),
      });

      if (response.ok) {
        fetchMilestones();
      }
    } catch (error) {
      console.error('Error toggling milestone:', error);
    }
  };

  const handleAddMilestone = async () => {
    if (!formName || !formTargetDate) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${projectId}/milestones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          target_date: formTargetDate,
        }),
      });

      if (response.ok) {
        setShowAddModal(false);
        resetForm();
        fetchMilestones();
      }
    } catch (error) {
      console.error('Error adding milestone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMilestone = async () => {
    if (!editingMilestone || !formName || !formTargetDate) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/projects/${projectId}/milestones/${editingMilestone.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          target_date: formTargetDate,
        }),
      });

      if (response.ok) {
        setEditingMilestone(null);
        resetForm();
        fetchMilestones();
      }
    } catch (error) {
      console.error('Error updating milestone:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMilestones();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete milestone');
      }
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTargetDate('');
  };

  const openEditModal = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setFormName(milestone.name);
    setFormDescription(milestone.description || '');
    setFormTargetDate(milestone.target_date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (milestone: Milestone) => {
    if (milestone.completed) return false;
    const today = new Date().toISOString().split('T')[0];
    return milestone.target_date < today;
  };

  const completedCount = milestones.filter(m => m.completed).length;
  const overdueCount = milestones.filter(m => isOverdue(m)).length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Project Timeline</h3>
                <p className="text-sm text-gray-500">
                  {completedCount} of {milestones.length} milestones completed
                  {overdueCount > 0 && (
                    <span className="text-red-500 ml-2">• {overdueCount} overdue</span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Progress bar */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      overdueCount > 0 ? 'bg-red-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">{progress}%</span>
              </div>
              
              {expanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        {expanded && (
          <div className="p-4">
            {/* Add Milestone Button */}
            {canEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowAddModal(true); }}
                className="w-full mb-4 flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Add Milestone</span>
              </button>
            )}

            {milestones.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No milestones yet</p>
                <p className="text-sm text-gray-400">Add your first milestone to track progress</p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

                <div className="space-y-4">
                  {milestones.map((milestone) => {
                    const overdue = isOverdue(milestone);
                    
                    return (
                      <div key={milestone.id} className="relative flex gap-4 group">
                        {/* Status indicator - clickable to toggle */}
                        <button
                          onClick={() => canEdit && handleToggleComplete(milestone)}
                          disabled={!canEdit}
                          className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
                            milestone.completed 
                              ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                              : overdue
                                ? 'border-red-500 bg-red-50 hover:bg-red-100'
                                : 'border-gray-300 bg-white hover:bg-gray-50'
                          } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                          {milestone.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-500" />
                          ) : overdue ? (
                            <AlertCircle className="w-6 h-6 text-red-500" />
                          ) : (
                            <Circle className="w-6 h-6 text-gray-300" />
                          )}
                        </button>

                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`font-medium ${milestone.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {milestone.name}
                                </h4>
                                {overdue && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                    Overdue
                                  </span>
                                )}
                                {milestone.completed && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                    Complete
                                  </span>
                                )}
                              </div>
                              {milestone.description && (
                                <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Target: {formatDate(milestone.target_date)}
                                </span>
                                {milestone.completed && milestone.completed_by_profile && (
                                  <span>
                                    Completed by {milestone.completed_by_profile.full_name || milestone.completed_by_profile.username}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            {canEdit && milestone.name !== 'Project Started' && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditModal(milestone)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMilestone(milestone.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingMilestone) && (
        <div className="fixed inset-0 z-[100] flex flex-col md:items-center md:justify-center md:p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); setEditingMilestone(null); resetForm(); }}
          />
          <div className="relative bg-white w-full h-[100dvh] md:h-auto md:rounded-xl shadow-xl md:max-w-md flex flex-col">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingMilestone(null); resetForm(); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Milestone Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Foundation Complete"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  value={formTargetDate}
                  onChange={(e) => setFormTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Add details about this milestone..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t bg-gray-50 md:rounded-b-xl">
              <button
                onClick={() => { setShowAddModal(false); setEditingMilestone(null); resetForm(); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingMilestone ? handleUpdateMilestone : handleAddMilestone}
                disabled={!formName || !formTargetDate || saving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingMilestone ? 'Save Changes' : 'Add Milestone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

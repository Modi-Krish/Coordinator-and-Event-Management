"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, PlayCircle, XCircle, MapPin, Search, Filter, Plus, X } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function TasksView() {
  const [activeTab, setActiveTab] = useState('Pending');
  const [tasks, setTasks] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedToId: '',
    category: 'General',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [tasksData, teamData] = await Promise.all([
        fetchAPI('/tasks'),
        fetchAPI('/users/team').catch(() => [])
      ]);
      setTasks(tasksData);
      setTeam(teamData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchAPI('/tasks', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowCreateModal(false);
      setFormData({ title: '', description: '', priority: 'MEDIUM', assignedToId: '', category: 'General' });
      loadData();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: string) {
    try {
      await fetchAPI(`/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      loadData();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 h-full flex flex-col">
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Assigned Tasks</h1>
          <p className="text-white/60 mt-1">Manage and update your daily operations.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative glass-panel rounded-lg overflow-hidden flex items-center px-3 py-2 w-full sm:w-64">
            <Search size={16} className="text-white/40" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="bg-transparent border-none text-sm text-white w-full ml-2 focus:outline-none placeholder-white/30"
            />
          </div>
          <button className="glass-panel px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors rounded-lg">
            <Filter size={16} /> Filters
          </button>
          
          {['MANAGER', 'FACULTY', 'CORE_MEMBER'].includes(currentUser?.role) && (
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Create Task
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-2">
        {['Pending', 'In Progress', 'Completed'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                : 'text-white/60 hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : tasks.filter(t => mapStatusToTab(t.status) === activeTab).length === 0 ? (
          <div className="col-span-full py-12 text-center text-white/40">
            No {activeTab.toLowerCase()} tasks found.
          </div>
        ) : (
          tasks
            .filter(t => mapStatusToTab(t.status) === activeTab)
            .map((task) => (
              <TaskCard 
                key={task.id}
                task={task}
                currentUser={currentUser}
                onStatusChange={handleStatusChange}
              />
            ))
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Create New Task</h2>
              <p className="text-sm text-white/60">Assign a task to a coordinator</p>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Task Title</label>
                <input 
                  type="text" required 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Description</label>
                <textarea 
                  required rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Priority</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="LOW" className="bg-[#0f1115]">Low</option>
                    <option value="MEDIUM" className="bg-[#0f1115]">Medium</option>
                    <option value="HIGH" className="bg-[#0f1115]">High</option>
                    <option value="CRITICAL" className="bg-[#0f1115]">Critical</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Assign To</label>
                  <select 
                    required
                    value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="" className="bg-[#0f1115]">Select user...</option>
                    {team.map(member => (
                      <option key={member.id} value={member.id} className="bg-[#0f1115]">{member.name} ({member.role})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-colors shadow-lg shadow-blue-500/20"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function mapStatusToTab(status: string) {
  if (['ASSIGNED', 'ACCEPTED'].includes(status)) return 'Pending';
  if (['IN_PROGRESS'].includes(status)) return 'In Progress';
  if (['COMPLETED', 'VERIFIED', 'CLOSED'].includes(status)) return 'Completed';
  return 'Pending';
}

function TaskCard({ task, currentUser, onStatusChange }: any) {
  const priorityColors: any = {
    'LOW': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'MEDIUM': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'HIGH': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    'CRITICAL': 'bg-red-500/20 text-red-400 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]',
  };

  const statusIcons: any = {
    'ASSIGNED': <Clock size={16} className="text-yellow-400" />,
    'ACCEPTED': <Clock size={16} className="text-blue-400" />,
    'IN_PROGRESS': <PlayCircle size={16} className="text-blue-400" />,
    'COMPLETED': <CheckCircle2 size={16} className="text-green-400" />,
    'VERIFIED': <CheckCircle2 size={16} className="text-emerald-400" />,
  };

  const isAssignee = currentUser?.id === task.assignedToId;
  const isSupervisor = ['MANAGER', 'FACULTY', 'CORE_MEMBER'].includes(currentUser?.role);

  return (
    <div className="glass-panel p-5 flex flex-col justify-between hover:-translate-y-1 transition-transform duration-200 cursor-pointer group border border-transparent hover:border-white/10">
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-bold ${priorityColors[task.priority] || priorityColors.MEDIUM}`}>
            {task.priority || 'MEDIUM'}
          </span>
          <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded text-xs font-medium border border-white/5">
            {statusIcons[task.status] || <Clock size={16} />}
            {task.status?.replace('_', ' ')}
          </div>
        </div>
        
        <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
          {task.title}
        </h3>
        <p className="text-sm text-white/50 mb-4 line-clamp-2">{task.description}</p>
        
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Clock size={14} className="text-white/40" />
            <span className="font-medium">Created:</span> {new Date(task.createdAt).toLocaleString()}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <MapPin size={14} className="text-white/40" />
            <span className="font-medium">Loc:</span> {task.category || 'General'}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 flex gap-2">
        {/* Assignee Actions */}
        {isAssignee && task.status === 'ASSIGNED' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'ACCEPTED'); }}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 py-2 rounded-lg text-sm font-bold border border-blue-500/30 transition-colors flex justify-center items-center gap-2"
          >
            Accept Task
          </button>
        )}
        {isAssignee && task.status === 'ACCEPTED' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'IN_PROGRESS'); }}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 py-2 rounded-lg text-sm font-bold border border-blue-500/30 transition-colors flex justify-center items-center gap-2"
          >
            <PlayCircle size={16} /> Start Task
          </button>
        )}
        {isAssignee && task.status === 'IN_PROGRESS' && (
          <button 
            onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'COMPLETED'); }}
            className="flex-1 bg-green-500/20 hover:bg-green-500/40 text-green-400 py-2 rounded-lg text-sm font-bold border border-green-500/30 transition-colors flex justify-center items-center gap-2"
          >
            <CheckCircle2 size={16} /> Complete
          </button>
        )}
        
        {/* Supervisor Actions */}
        {isSupervisor && task.status === 'COMPLETED' && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'VERIFIED'); }}
              className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 py-2 rounded-lg text-sm font-bold border border-emerald-500/30 transition-colors flex justify-center items-center gap-2"
            >
              <CheckCircle2 size={16} /> Verify
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onStatusChange(task.id, 'REJECTED'); }}
              className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors flex items-center justify-center"
            >
              <XCircle size={18} />
            </button>
          </>
        )}

        {/* Read Only States */}
        {!isAssignee && !isSupervisor && ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(task.status) && (
          <div className="w-full text-center text-xs text-white/40 py-2">
            In progress by assignee
          </div>
        )}
        {task.status === 'VERIFIED' && (
          <div className="w-full text-center text-xs text-emerald-400/60 py-2 font-medium flex justify-center items-center gap-1">
            <CheckCircle2 size={14} /> Verified & Closed
          </div>
        )}
        {task.status === 'REJECTED' && (
          <div className="w-full text-center text-xs text-red-400/60 py-2 font-medium flex justify-center items-center gap-1">
            <XCircle size={14} /> Rejected
          </div>
        )}
      </div>
    </div>
  );
}

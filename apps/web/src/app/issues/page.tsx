"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/components/SocketProvider";
import { AlertCircle, Clock, CheckCircle2, MoreVertical, Search, Filter, Trash2 } from "lucide-react";

export default function IssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadIssues();
  }, []);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleIssueNew = (issue: any) => {
      setIssues(prev => [issue, ...prev]);
    };
    const handleIssueUpdated = (issue: any) => {
      setIssues(prev => prev.map(i => i.id === issue.id ? issue : i));
    };

    socket.on('issue:new', handleIssueNew);
    socket.on('issue:updated', handleIssueUpdated);

    return () => {
      socket.off('issue:new', handleIssueNew);
      socket.off('issue:updated', handleIssueUpdated);
    };
  }, [socket, isConnected]);

  async function loadIssues() {
    try {
      const data = await fetchAPI('/issues?type=ISSUE');
      setIssues(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    try {
      await fetchAPI(`/issues/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      loadIssues();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function updatePriority(id: string, newPriority: string) {
    try {
      await fetchAPI(`/issues/${id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority })
      });
      loadIssues();
    } catch (err) {
      console.error("Failed to update priority", err);
    }
  }

  async function deleteIssue(id: string) {
    if (!confirm('Are you sure you want to delete this issue?')) return;
    try {
      await fetchAPI(`/issues/${id}`, { method: 'DELETE' });
      loadIssues();
    } catch (err: any) {
      console.error("Failed to delete issue", err);
      alert("Failed to delete issue: " + err.message);
    }
  }

  const filteredIssues = issues.filter(issue => 
    issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    issue.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'REPORTED':
      case 'ASSIGNED': return 'text-[#EA580C] bg-[#EA580C]/10 border-[#EA580C]/20 shadow-[0_0_10px_rgba(234,88,12,0.2)]';
      case 'ACCEPTED':
      case 'IN_PROGRESS': return 'text-[#F7931A] bg-[#F7931A]/10 border-[#F7931A]/20 shadow-[0_0_10px_rgba(247,147,26,0.2)]';
      case 'RESOLVED': return 'text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/20 shadow-[0_0_10px_rgba(255,214,0,0.2)]';
      case 'VERIFIED':
      case 'CLOSED': return 'text-[#94A3B8] bg-[#1E293B] border-transparent opacity-60';
      case 'ESCALATED': return 'text-red-500 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
      default: return 'text-[#94A3B8] bg-[#1E293B] border-transparent';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'HIGH': return 'text-[#EA580C]';
      case 'MEDIUM': return 'text-[#F7931A]';
      case 'LOW': return 'text-[#FFD600]';
      default: return 'text-[#94A3B8]';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
            Issues <span className="text-gradient">Tracker</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-2 tracking-wide uppercase">Manage and resolve reported problems</p>
        </div>
        
        <div className="flex gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F7931A] group-focus-within:text-[#FFD600] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search active issues..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="crypto-input !pl-12 pr-4 w-full md:w-80 rounded-t-lg"
            />
          </div>
          <button className="btn-outline text-[13px]">
            <Filter size={16} className="mr-2" /> Filter
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 font-mono text-[#F7931A] animate-pulse uppercase tracking-widest text-sm">Synchronizing ledger...</div>
      ) : (
        <div className="crypto-card !p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1E293B] bg-[#030304]">
                  <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">Issue Details</th>
                  <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">Category</th>
                  <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">Priority</th>
                  <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">Status</th>
                  <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredIssues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/50">
                      No issues found.
                    </td>
                  </tr>
                ) : (
                  filteredIssues.map((issue) => (
                    <tr key={issue.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-5 border-t border-[#1E293B]">
                        <div className="flex items-start gap-4">
                          <div className="mt-1 p-2 rounded-lg bg-[#030304] border border-[#1E293B]">
                            {issue.status === 'RESOLVED' ? (
                              <CheckCircle2 size={16} className="text-[#FFD600]" />
                            ) : issue.status === 'IN_PROGRESS' ? (
                              <Clock size={16} className="text-[#F7931A]" />
                            ) : (
                              <AlertCircle size={16} className="text-[#EA580C]" />
                            )}
                          </div>
                          <div>
                            <p className="font-heading font-semibold text-white tracking-wide">{issue.title}</p>
                            <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1 max-w-xs">{issue.description}</p>
                            <p className="text-[10px] font-mono text-[#94A3B8]/60 mt-2 uppercase tracking-widest">Reported {new Date(issue.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 border-t border-[#1E293B]">
                        <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">{issue.category || 'General'}</span>
                      </td>
                      <td className="p-5 border-t border-[#1E293B]">
                        {(currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('SUPERVISOR') || currentUser?.roles?.includes('STAFF')) ? (
                          <select 
                            className={`bg-transparent border border-transparent rounded-lg px-2 py-1 text-[10px] font-mono uppercase tracking-widest font-bold outline-none cursor-pointer transition-all hover:bg-white/5 ${getPriorityColor(issue.priority)}`}
                            value={issue.priority || 'MEDIUM'}
                            onChange={(e) => updatePriority(issue.id, e.target.value)}
                          >
                            <option value="LOW" className="bg-[#030304] text-[#FFD600]">LOW</option>
                            <option value="MEDIUM" className="bg-[#030304] text-[#F7931A]">MEDIUM</option>
                            <option value="HIGH" className="bg-[#030304] text-[#EA580C]">HIGH</option>
                            <option value="CRITICAL" className="bg-[#030304] text-red-500">CRITICAL</option>
                          </select>
                        ) : (
                          <span className={`text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-2 px-2 ${getPriorityColor(issue.priority)}`}>
                            <div className={`w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]`}></div>
                            {issue.priority || 'MEDIUM'}
                          </span>
                        )}
                      </td>
                      <td className="p-5 border-t border-[#1E293B]">
                        <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border ${getStatusColor(issue.status)} font-medium`}>
                          {issue.status?.replace('_', ' ') || 'OPEN'}
                        </span>
                      </td>
                      <td className="p-5 border-t border-[#1E293B] text-right">
                        <select 
                          className="bg-[#030304] border border-[#1E293B] rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-white outline-none focus:border-[#F7931A] focus:shadow-[0_0_15px_-5px_rgba(247,147,26,0.3)] cursor-pointer transition-all"
                          value={issue.status}
                          onChange={(e) => updateStatus(issue.id, e.target.value)}
                        >
                          {/* Coordinator Flow */}
                          <option value="ASSIGNED" className="bg-[#030304]" disabled>Assigned</option>
                          <option value="ACCEPTED" className="bg-[#030304]">Accept</option>
                          <option value="IN_PROGRESS" className="bg-[#030304]">In Progress</option>
                          <option value="RESOLVED" className="bg-[#030304]">Resolve</option>
                          
                          {/* Supervisor Flow */}
                          {['MANAGER', 'FACULTY', 'CORE_MEMBER'].includes(currentUser?.role) && (
                            <>
                              <option value="VERIFIED" className="bg-[#030304] text-[#FFD600]">Verify</option>
                              <option value="CLOSED" className="bg-[#030304] text-[#94A3B8]">Close</option>
                              <option value="ESCALATED" className="bg-[#030304] text-red-500">Escalate</option>
                              <option value="REJECTED" className="bg-[#030304] text-[#EA580C]">Reject</option>
                            </>
                          )}
                        </select>
                        {(currentUser?.roles?.includes('ADMIN') || currentUser?.roles?.includes('SUPERVISOR') || issue.reportedById === currentUser?.id) && (
                          <button 
                            onClick={() => deleteIssue(issue.id)}
                            className="p-2 ml-3 text-[#94A3B8] hover:text-[#EA580C] hover:bg-[#EA580C]/10 rounded-lg transition-colors inline-flex align-middle border border-transparent hover:border-[#EA580C]/30"
                            title="Delete Issue"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { AlertCircle, Clock, CheckCircle2, MoreVertical, Search, Filter } from "lucide-react";

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

  async function loadIssues() {
    try {
      const data = await fetchAPI('/issues');
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

  const filteredIssues = issues.filter(issue => 
    issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    issue.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'REPORTED':
      case 'ASSIGNED': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'ACCEPTED':
      case 'IN_PROGRESS': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'RESOLVED': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'VERIFIED':
      case 'CLOSED': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'ESCALATED': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch(priority) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Issues Tracker</h1>
          <p className="text-white/60 mt-1">Manage and resolve reported problems</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text" 
              placeholder="Search issues..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
          <button className="glass-panel px-4 py-2 flex items-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors">
            <Filter size={16} /> Filter
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 text-white/50">Loading issues...</div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20">
                  <th className="p-4 text-sm font-medium text-white/60">Issue Details</th>
                  <th className="p-4 text-sm font-medium text-white/60">Category</th>
                  <th className="p-4 text-sm font-medium text-white/60">Priority</th>
                  <th className="p-4 text-sm font-medium text-white/60">Status</th>
                  <th className="p-4 text-sm font-medium text-white/60 text-right">Actions</th>
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
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {issue.status === 'RESOLVED' ? (
                              <CheckCircle2 size={18} className="text-green-400" />
                            ) : issue.status === 'IN_PROGRESS' ? (
                              <Clock size={18} className="text-yellow-400" />
                            ) : (
                              <AlertCircle size={18} className="text-red-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white">{issue.title}</p>
                            <p className="text-xs text-white/50 mt-1 line-clamp-1 max-w-xs">{issue.description}</p>
                            <p className="text-[10px] text-white/30 mt-1">Reported {new Date(issue.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-white/70">{issue.category || 'General'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-bold flex items-center gap-1 ${getPriorityColor(issue.priority)}`}>
                          <div className={`w-1.5 h-1.5 rounded-full bg-current`}></div>
                          {issue.priority || 'MEDIUM'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(issue.status)} font-medium tracking-wide`}>
                          {issue.status?.replace('_', ' ') || 'OPEN'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <select 
                          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                          value={issue.status}
                          onChange={(e) => updateStatus(issue.id, e.target.value)}
                        >
                          {/* Coordinator Flow */}
                          <option value="ASSIGNED" className="bg-[#0f1115]" disabled>Assigned</option>
                          <option value="ACCEPTED" className="bg-[#0f1115]">Accept Issue</option>
                          <option value="IN_PROGRESS" className="bg-[#0f1115]">In Progress</option>
                          <option value="RESOLVED" className="bg-[#0f1115]">Resolve</option>
                          
                          {/* Supervisor Flow */}
                          {['MANAGER', 'FACULTY', 'CORE_MEMBER'].includes(currentUser?.role) && (
                            <>
                              <option value="VERIFIED" className="bg-[#0f1115]">Verify</option>
                              <option value="CLOSED" className="bg-[#0f1115]">Close</option>
                              <option value="ESCALATED" className="bg-[#0f1115]">Escalate</option>
                              <option value="REJECTED" className="bg-[#0f1115]">Reject</option>
                            </>
                          )}
                        </select>
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

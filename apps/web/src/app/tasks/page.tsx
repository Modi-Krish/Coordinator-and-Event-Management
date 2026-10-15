"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/components/SocketProvider";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Trash2,
  Plus,
  UserPlus,
  Eye,
  ImageIcon,
} from "lucide-react";
import {
  useCurrentUser,
  canAssignTasks,
  canVerifyIssues,
  isSupervisorOrAdmin,
  hasDesignation,
} from "@/lib/useCurrentUser";
import { IssueDetailModal } from "@/components/IssueDetailModal";

export default function TasksPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<{ issueId: string; title: string } | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const currentUser = useCurrentUser();

  useEffect(() => {
    loadIssues();
    // Load team members for assignment dropdown
    fetchAPI("/users/team")
      .then(setTeamMembers)
      .catch(() => {});
  }, []);

  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIssueNew = (issue: any) => {
      if (issue.type === "TASK") setIssues((prev) => [issue, ...prev]);
    };
    const handleIssueUpdated = (issue: any) => {
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? issue : i)));
    };
    const handleIssueDeleted = (issueId: string) => {
      setIssues((prev) => prev.filter((i) => i.id !== issueId));
    };

    socket.on("issue:new", handleIssueNew);
    socket.on("issue:updated", handleIssueUpdated);
    socket.on("issue:deleted", handleIssueDeleted);

    return () => {
      socket.off("issue:new", handleIssueNew);
      socket.off("issue:updated", handleIssueUpdated);
      socket.off("issue:deleted", handleIssueDeleted);
    };
  }, [socket, isConnected]);

  async function loadIssues() {
    try {
      const data = await fetchAPI("/issues?type=TASK");
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
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      loadIssues();
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  async function updatePriority(id: string, newPriority: string) {
    try {
      await fetchAPI(`/issues/${id}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority: newPriority }),
      });
      loadIssues();
    } catch (err) {
      console.error("Failed to update priority", err);
    }
  }

  async function deleteTask(id: string) {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      await fetchAPI(`/issues/${id}`, { method: "DELETE" });
      loadIssues();
    } catch (err: any) {
      console.error("Failed to delete task", err);
      alert("Failed to delete task: " + err.message);
    }
  }

  async function assignTask(issueId: string, assigneeId: string, remarks?: string) {
    try {
      await fetchAPI(`/issues/${issueId}/assign`, {
        method: "PATCH",
        body: JSON.stringify({ assigneeId, remarks }),
      });
      setShowAssignModal(null);
      loadIssues();
    } catch (err: any) {
      alert("Assignment failed: " + err.message);
    }
  }

  const filteredIssues = issues.filter(
    (issue) =>
      issue.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REPORTED":
      case "ASSIGNED":
        return "text-[#EA580C] bg-[#EA580C]/10 border-[#EA580C]/20";
      case "ACCEPTED":
      case "IN_PROGRESS":
        return "text-[#F7931A] bg-[#F7931A]/10 border-[#F7931A]/20";
      case "RESOLVED":
        return "text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/20";
      case "VERIFIED":
      case "CLOSED":
        return "text-[#94A3B8] bg-[#1E293B] border-transparent opacity-60";
      case "ESCALATED":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      default:
        return "text-[#94A3B8] bg-[#1E293B] border-transparent";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "CRITICAL": return "text-red-500";
      case "HIGH": return "text-[#EA580C]";
      case "MEDIUM": return "text-[#F7931A]";
      case "LOW": return "text-[#FFD600]";
      default: return "text-[#94A3B8]";
    }
  };

  // Status options based on user's designation
  const getStatusOptions = (issue: any) => {
    const isAssignee = issue.assignedToId === currentUser?.id;
    const isAuthorized = isSupervisorOrAdmin(currentUser) || isAssignee;

    const options: { value: string; label: string }[] = [];

    if (isAuthorized) {
      options.push(
        { value: "ACCEPTED", label: "Accept" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "RESOLVED", label: "Mark Resolved" }
      );
    }

    if (canVerifyIssues(currentUser)) {
      options.push(
        { value: "VERIFIED", label: "Verify ✓" },
        { value: "CLOSED", label: "Close" },
        { value: "ESCALATED", label: "Escalate" },
        { value: "REJECTED", label: "Reject" }
      );
    }

    return options;
  };

  const userCanAssign = canAssignTasks(currentUser);
  const userCanDelete = isSupervisorOrAdmin(currentUser) || hasDesignation(currentUser, "MANAGER");

  return (
    <div className="max-w-7xl mx-auto pb-12 min-w-0">
      <header className="mb-6 sm:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl font-heading font-bold text-white tracking-tight break-words">
            Tasks <span className="text-gradient">Tracker</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-xs sm:text-sm mt-1 sm:mt-2 tracking-wide uppercase">
            Manage and resolve tasks
            {currentUser && (
              <span className="ml-2 text-[#F7931A]">
                — {currentUser.designations?.[0] || currentUser.roles?.[0]}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:flex-initial w-full sm:w-auto min-w-[200px]">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F7931A]"
              size={17}
            />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="crypto-input !pl-11 pr-4 w-full sm:w-64 md:w-72 rounded-lg text-xs sm:text-sm"
            />
          </div>
          <button className="btn-outline text-xs sm:text-[13px] flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 min-h-[40px] shrink-0">
            <Filter size={15} /> Filter
          </button>
          {/* Only show Create Task button for users who can assign tasks */}
          {userCanAssign && (
            <button
              id="create-task-btn"
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-xs sm:text-[13px] flex items-center justify-center gap-1.5 py-2 px-3 sm:px-4 min-h-[40px] shrink-0"
            >
              <Plus size={16} /> Create Task
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 font-mono text-[#F7931A] animate-pulse uppercase tracking-widest text-sm">
          Loading tasks...
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="crypto-card p-12 text-center text-white/50">
          <p className="font-heading text-lg text-white/70 mb-1">No tasks found.</p>
          <p className="text-xs text-[#94A3B8]">There are currently no tasks matching your filters.</p>
        </div>
      ) : (
        <>
          {/* ─── Mobile Card View (< 768px) ─── */}
          <div className="block md:hidden space-y-3.5">
            {filteredIssues.map((issue) => {
              const statusOptions = getStatusOptions(issue);
              return (
                <div 
                  key={issue.id} 
                  onClick={() => setSelectedIssueId(issue.id)}
                  className="crypto-card !p-4 space-y-3 relative group cursor-pointer hover:border-[#F7931A]/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className={`text-[9px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-full border ${getStatusColor(issue.status)} font-medium shrink-0`}>
                        {issue.status?.replace("_", " ") || "OPEN"}
                      </span>
                      {issue.category && (
                        <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider truncate">
                          {issue.category}
                        </span>
                      )}
                      {issue.attachments?.length > 0 && (
                        <span className="text-[9px] font-mono text-[#FFD600] bg-[#FFD600]/10 px-2 py-0.5 rounded border border-[#FFD600]/30 flex items-center gap-1 font-semibold shrink-0">
                          <ImageIcon size={10} /> {issue.attachments.length} {issue.attachments.length === 1 ? 'Photo' : 'Photos'}
                        </span>
                      )}
                    </div>

                    {(isSupervisorOrAdmin(currentUser) || hasDesignation(currentUser, "MANAGER", "FACULTY")) ? (
                      <select
                        className={`bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono uppercase tracking-widest font-bold outline-none cursor-pointer ${getPriorityColor(issue.priority)} shrink-0`}
                        value={issue.priority || "MEDIUM"}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          updatePriority(issue.id, e.target.value);
                        }}
                      >
                        <option value="LOW" className="bg-[#030304] text-[#FFD600]">LOW</option>
                        <option value="MEDIUM" className="bg-[#030304] text-[#F7931A]">MEDIUM</option>
                        <option value="HIGH" className="bg-[#030304] text-[#EA580C]">HIGH</option>
                        <option value="CRITICAL" className="bg-[#030304] text-red-500">CRITICAL</option>
                      </select>
                    ) : (
                      <span className={`text-[10px] font-mono uppercase tracking-widest font-bold flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 ${getPriorityColor(issue.priority)} shrink-0`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]"></span>
                        {issue.priority || "MEDIUM"}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-heading font-semibold text-white text-base tracking-wide group-hover:text-[#F7931A] transition-colors">{issue.title}</h3>
                    <p className="text-xs text-[#94A3B8] mt-1 line-clamp-2">{issue.description}</p>
                  </div>

                  {/* Assignee section */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#030304] border border-[#1E293B]" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 min-w-0">
                      {issue.assignedTo ? (
                        <>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                            {issue.assignedTo.name?.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-white font-medium truncate">{issue.assignedTo.name}</p>
                            <p className="text-[10px] text-[#94A3B8] truncate">{issue.assignedTo.designations?.[0] || "Staff"}</p>
                          </div>
                        </>
                      ) : (
                        <span className="text-[11px] font-mono text-red-400/80 uppercase">Unassigned</span>
                      )}
                    </div>
                    {userCanAssign && (
                      <button
                        onClick={() => setShowAssignModal({ issueId: issue.id, title: issue.title })}
                        className="p-1.5 px-2.5 rounded-md bg-[#F7931A]/10 text-[#F7931A] hover:bg-[#F7931A]/20 border border-[#F7931A]/30 text-[10px] font-mono uppercase flex items-center gap-1 shrink-0"
                      >
                        <UserPlus size={12} /> Assign
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] font-mono text-[#94A3B8]/60 uppercase tracking-widest">
                    Created {new Date(issue.createdAt).toLocaleDateString()}
                  </p>

                  {/* Actions Toolbar */}
                  <div className="pt-2 border-t border-[#1E293B] flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedIssueId(issue.id)}
                      className="btn-outline !py-2 !px-3 text-xs flex items-center gap-1.5 text-[#F7931A] border-[#F7931A]/30 shrink-0"
                      title="View Full Status & Photos"
                    >
                      <Eye size={14} /> View
                    </button>

                    {statusOptions.length > 0 && (
                      <select
                        className="flex-1 bg-[#030304] border border-[#1E293B] rounded-lg px-3 py-2.5 text-xs font-mono uppercase tracking-wider text-white outline-none focus:border-[#F7931A] min-h-[44px]"
                        value={issue.status}
                        onChange={(e) => updateStatus(issue.id, e.target.value)}
                      >
                        <option value={issue.status} disabled className="bg-[#030304]">
                          — Status: {issue.status} —
                        </option>
                        {statusOptions.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#030304]">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {userCanDelete && (
                      <button
                        onClick={() => deleteTask(issue.id)}
                        className="p-2.5 text-[#94A3B8] hover:text-[#EA580C] hover:bg-[#EA580C]/10 rounded-lg transition-colors border border-[#1E293B] hover:border-[#EA580C]/30 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
                        title="Delete Task"
                        aria-label="Delete Task"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ─── Desktop Table View (>= 768px) ─── */}
          <div className="hidden md:block crypto-card !p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1E293B] bg-[#030304]">
                    <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">
                      Task Details
                    </th>
                    <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">
                      Assignee
                    </th>
                    <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">
                      Priority
                    </th>
                    <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest">
                      Status
                    </th>
                    <th className="p-5 font-mono text-[10px] text-[#94A3B8] uppercase tracking-widest text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredIssues.map((issue) => {
                    const statusOptions = getStatusOptions(issue);
                    return (
                      <tr 
                        key={issue.id} 
                        onClick={() => setSelectedIssueId(issue.id)}
                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <td className="p-5 border-t border-[#1E293B]">
                          <div className="flex items-start gap-4">
                            <div className="mt-1 p-2 rounded-lg bg-[#030304] border border-[#1E293B] group-hover:border-[#F7931A]/30 transition-colors">
                              {issue.status === "RESOLVED" || issue.status === "VERIFIED" ? (
                                <CheckCircle2 size={16} className="text-[#FFD600]" />
                              ) : issue.status === "IN_PROGRESS" ? (
                                <Clock size={16} className="text-[#F7931A]" />
                              ) : (
                                <AlertCircle size={16} className="text-[#EA580C]" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-heading font-semibold text-white tracking-wide group-hover:text-[#F7931A] transition-colors">
                                  {issue.title}
                                </p>
                                {issue.attachments?.length > 0 && (
                                  <span className="text-[9px] font-mono text-[#FFD600] bg-[#FFD600]/10 px-1.5 py-0.5 rounded border border-[#FFD600]/30 inline-flex items-center gap-1 font-semibold" title={`${issue.attachments.length} photo(s) attached`}>
                                    <ImageIcon size={10} /> {issue.attachments.length}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1 max-w-xs">
                                {issue.description}
                              </p>
                              <p className="text-[10px] font-mono text-[#94A3B8]/60 mt-2 uppercase tracking-widest">
                                {new Date(issue.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 border-t border-[#1E293B]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {issue.assignedTo ? (
                              <>
                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white text-[10px] font-bold">
                                  {issue.assignedTo.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-xs text-white font-medium">{issue.assignedTo.name}</p>
                                  <p className="text-[10px] text-[#94A3B8]">{issue.assignedTo.designations?.[0] || "Staff"}</p>
                                </div>
                              </>
                            ) : (
                              <span className="text-[11px] font-mono text-red-400/70 uppercase">Unassigned</span>
                            )}
                            {userCanAssign && (
                              <button
                                id={`assign-task-${issue.id}`}
                                onClick={() => setShowAssignModal({ issueId: issue.id, title: issue.title })}
                                className="ml-2 p-1.5 rounded-md bg-white/5 hover:bg-[#F7931A]/10 text-[#94A3B8] hover:text-[#F7931A] border border-transparent hover:border-[#F7931A]/30 transition-all"
                                title="Reassign task"
                              >
                                <UserPlus size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-5 border-t border-[#1E293B]" onClick={(e) => e.stopPropagation()}>
                          {(isSupervisorOrAdmin(currentUser) || hasDesignation(currentUser, "MANAGER", "FACULTY")) ? (
                            <select
                              className={`bg-transparent border border-transparent rounded-lg px-2 py-1 text-[10px] font-mono uppercase tracking-widest font-bold outline-none cursor-pointer transition-all hover:bg-white/5 ${getPriorityColor(issue.priority)}`}
                              value={issue.priority || "MEDIUM"}
                              onChange={(e) => updatePriority(issue.id, e.target.value)}
                            >
                              <option value="LOW" className="bg-[#030304] text-[#FFD600]">LOW</option>
                              <option value="MEDIUM" className="bg-[#030304] text-[#F7931A]">MEDIUM</option>
                              <option value="HIGH" className="bg-[#030304] text-[#EA580C]">HIGH</option>
                              <option value="CRITICAL" className="bg-[#030304] text-red-500">CRITICAL</option>
                            </select>
                          ) : (
                            <span className={`text-[10px] font-mono uppercase tracking-widest font-bold ${getPriorityColor(issue.priority)}`}>
                              {issue.priority || "MEDIUM"}
                            </span>
                          )}
                        </td>
                        <td className="p-5 border-t border-[#1E293B]">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border ${getStatusColor(issue.status)} font-medium`}>
                            {issue.status?.replace("_", " ") || "OPEN"}
                          </span>
                        </td>
                        <td className="p-5 border-t border-[#1E293B] text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedIssueId(issue.id)}
                            className="p-2 mr-2 text-[#94A3B8] hover:text-[#F7931A] hover:bg-[#F7931A]/10 rounded-lg transition-colors inline-flex align-middle border border-transparent hover:border-[#F7931A]/30"
                            title="View Full Status & Photos"
                          >
                            <Eye size={16} />
                          </button>
                          {statusOptions.length > 0 && (
                            <select
                              className="bg-[#030304] border border-[#1E293B] rounded-lg px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-white outline-none focus:border-[#F7931A] cursor-pointer transition-all"
                              value={issue.status}
                              onChange={(e) => updateStatus(issue.id, e.target.value)}
                            >
                              <option value={issue.status} disabled className="bg-[#030304]">
                                — Update Status —
                              </option>
                              {statusOptions.map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-[#030304]">
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {userCanDelete && (
                            <button
                              onClick={() => deleteTask(issue.id)}
                              className="p-2 ml-3 text-[#94A3B8] hover:text-[#EA580C] hover:bg-[#EA580C]/10 rounded-lg transition-colors inline-flex align-middle border border-transparent hover:border-[#EA580C]/30"
                              title="Delete Task"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Task Details & Status/Images Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadIssues}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadIssues();
          }}
        />
      )}

      {/* Assign Task Modal */}
      {showAssignModal && (
        <AssignTaskModal
          issueId={showAssignModal.issueId}
          issueTitle={showAssignModal.title}
          teamMembers={teamMembers}
          currentUser={currentUser}
          onClose={() => setShowAssignModal(null)}
          onAssigned={(assigneeId: string, remarks?: string) => assignTask(showAssignModal.issueId, assigneeId, remarks)}
        />
      )}
    </div>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────
function CreateTaskModal({ teamMembers, currentUser, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "MEDIUM",
    assignedToId: "",
    deadline: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const userCanAssign = canAssignTasks(currentUser);

  // Filter eligible assignees based on designation
  const eligibleAssignees = teamMembers.filter((m: any) => {
    const desigs = (m.designations ?? []).map((d: string) => d.toUpperCase());
    const userDesigs = (currentUser?.designations ?? []).map((d: string) => d.toUpperCase());

    if (isSupervisorOrAdmin(currentUser) || userDesigs.includes("MANAGER")) return true;
    if (userDesigs.includes("FACULTY")) {
      return desigs.some((d: string) => ["INTERN", "CORE", "COORDINATOR"].includes(d));
    }
    if (userDesigs.some((d: string) => ["INTERN", "CORE"].includes(d))) {
      return desigs.includes("COORDINATOR");
    }
    return false;
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchAPI("/issues/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          type: "TASK",
          assignedToId: form.assignedToId || undefined,
        }),
      });
      onCreated();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel max-w-lg w-full p-4 sm:p-6 md:p-8 my-auto max-h-[90dvh] overflow-y-auto rounded-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-lg sm:text-xl font-heading font-bold text-white mb-4 sm:mb-6">Create Task</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Title *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="crypto-input w-full"
              placeholder="Task title"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="crypto-input w-full h-24 resize-none"
              placeholder="Detailed description..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="crypto-input w-full"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Category</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="crypto-input w-full"
                placeholder="e.g. Maintenance"
              />
            </div>
          </div>

          {userCanAssign && (
            <div>
              <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Assign To</label>
              <select
                value={form.assignedToId}
                onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
                className="crypto-input w-full"
              >
                <option value="">— Unassigned —</option>
                {eligibleAssignees.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.designations?.[0] || "Staff"})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Deadline</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="crypto-input w-full"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1 min-h-[44px]">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 min-h-[44px] disabled:opacity-50">
              {submitting ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Task Modal ────────────────────────────────────────────────────────
function AssignTaskModal({ issueId, issueTitle, teamMembers, currentUser, onClose, onAssigned }: any) {
  const [assigneeId, setAssigneeId] = useState("");
  const [remarks, setRemarks] = useState("");

  const eligibleAssignees = teamMembers.filter((m: any) => {
    const desigs = (m.designations ?? []).map((d: string) => d.toUpperCase());
    const userDesigs = (currentUser?.designations ?? []).map((d: string) => d.toUpperCase());
    if (isSupervisorOrAdmin(currentUser) || userDesigs.includes("MANAGER")) return true;
    if (userDesigs.includes("FACULTY")) {
      return desigs.some((d: string) => ["INTERN", "CORE", "COORDINATOR"].includes(d));
    }
    if (userDesigs.some((d: string) => ["INTERN", "CORE"].includes(d))) {
      return desigs.includes("COORDINATOR");
    }
    return false;
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="glass-panel max-w-md w-full p-4 sm:p-6 md:p-8 my-auto max-h-[90dvh] overflow-y-auto rounded-2xl animate-in fade-in zoom-in duration-200">
        <h2 className="text-lg sm:text-xl font-heading font-bold text-white mb-2">Assign Task</h2>
        <p className="text-xs sm:text-sm text-[#94A3B8] mb-4 sm:mb-6 line-clamp-1">{issueTitle}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Assign To *</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="crypto-input w-full"
            >
              <option value="">— Select assignee —</option>
              {eligibleAssignees.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.designations?.[0] || "Staff"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-[#94A3B8] uppercase tracking-widest mb-1.5 block">Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="crypto-input w-full h-20 resize-none"
              placeholder="Optional assignment notes..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-outline flex-1 min-h-[44px]">Cancel</button>
            <button
              onClick={() => assigneeId && onAssigned(assigneeId, remarks)}
              disabled={!assigneeId}
              className="btn-primary flex-1 min-h-[44px] disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

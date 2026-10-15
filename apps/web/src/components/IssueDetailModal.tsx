"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { fetchAPI, getAttachmentUrl, uploadIssueAttachment } from "@/lib/api";
import { useSocket } from "@/components/SocketProvider";
import { useCall } from "@/components/CallProvider";
import {
  useCurrentUser,
  isSupervisorOrAdmin,
  canVerifyIssues,
} from "@/lib/useCurrentUser";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  User,
  PhoneCall,
  ExternalLink,
  Download,
  Camera,
  Upload,
  ZoomIn,
  ShieldCheck,
  Tag,
  Calendar,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ImageIcon,
} from "lucide-react";

interface IssueDetailModalProps {
  issueId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function IssueDetailModal({ issueId, onClose, onUpdated }: IssueDetailModalProps) {
  const [issue, setIssue] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [selectedNewStatus, setSelectedNewStatus] = useState<string>("");
  const [showAdvancedStatus, setShowAdvancedStatus] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    title: string;
    size?: string;
    uploadedBy?: string;
    createdAt?: string;
  } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = useCurrentUser();
  const { initiateCall } = useCall();
  const { socket, isConnected } = useSocket();

  const isSupervisor = isSupervisorOrAdmin(currentUser);
  const canVerify = canVerifyIssues(currentUser);
  const isAssignee = issue?.assignedToId === currentUser?.id;
  const isReporter = issue?.reportedById === currentUser?.id;
  const canUploadProof = isAssignee || isSupervisor || isReporter;

  // Load issue details & audit history
  const loadIssueData = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      const [issueData, historyData] = await Promise.all([
        fetchAPI(`/issues/${id}`),
        fetchAPI(`/issues/${id}/history`).catch(() => []),
      ]);
      setIssue(issueData);
      setHistory(historyData);
      setSelectedNewStatus(issueData.status);
    } catch (err: any) {
      console.error("Failed to load issue details", err);
      setLoadError(err.message || "Failed to load issue details");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (issueId) {
      loadIssueData(issueId);
    } else {
      setIssue(null);
      setHistory([]);
    }
  }, [issueId, loadIssueData]);

  // Real-time updates via socket
  useEffect(() => {
    if (!socket || !isConnected || !issueId) return;

    const handleIssueUpdated = (updated: any) => {
      if (updated.id === issueId) {
        setIssue((prev: any) => ({
          ...prev,
          ...updated,
          attachments: updated.attachments || prev?.attachments || [],
        }));
        // Reload history to reflect newly appended state transition
        fetchAPI(`/issues/${issueId}/history`)
          .then(setHistory)
          .catch(() => {});
      }
    };

    const handleIssueDeleted = (data: { id: string } | string) => {
      const deletedId = typeof data === "string" ? data : data.id;
      if (deletedId === issueId) {
        alert("This issue has been deleted.");
        onClose();
        onUpdated?.();
      }
    };

    socket.on("issue:updated", handleIssueUpdated);
    socket.on("issue:deleted", handleIssueDeleted);

    return () => {
      socket.off("issue:updated", handleIssueUpdated);
      socket.off("issue:deleted", handleIssueDeleted);
    };
  }, [socket, isConnected, issueId, onClose, onUpdated]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedImage) {
          setSelectedImage(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, onClose]);

  if (!issueId) return null;

  // Status transition handler
  async function handleStatusChange(newStatus: string, customRemarks?: string) {
    if (!issueId || !newStatus) return;
    try {
      setIsUpdatingStatus(true);
      const res = await fetchAPI(`/issues/${issueId}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: newStatus,
          remarks: customRemarks || statusRemarks || undefined,
        }),
      });
      setIssue((prev: any) => ({ ...prev, ...res }));
      setStatusRemarks("");
      setShowAdvancedStatus(false);
      // Reload history
      const updatedHistory = await fetchAPI(`/issues/${issueId}/history`).catch(() => []);
      setHistory(updatedHistory);
      onUpdated?.();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  // Priority transition handler
  async function handlePriorityChange(newPriority: string) {
    if (!issueId) return;
    try {
      const res = await fetchAPI(`/issues/${issueId}/priority`, {
        method: "PATCH",
        body: JSON.stringify({ priority: newPriority }),
      });
      setIssue((prev: any) => ({ ...prev, ...res }));
      onUpdated?.();
    } catch (err: any) {
      alert("Failed to update priority: " + err.message);
    }
  }

  // Attachment upload handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !issueId) return;

    try {
      setIsUploadingPhoto(true);
      setUploadError(null);
      await uploadIssueAttachment(issueId, file);
      // Reload issue data to get the new attachment
      await loadIssueData(issueId);
      onUpdated?.();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Upload failed", err);
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  // Copy tracking ID
  const copyTrackingId = () => {
    const idToCopy = issue?.issueNumber || issue?.id || "";
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Copy GPS coordinates
  const copyCoordinates = () => {
    if (issue?.locationLat && issue?.locationLng) {
      navigator.clipboard.writeText(`${issue.locationLat}, ${issue.locationLng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2000);
    }
  };

  // Stepper milestone steps definition
  const PIPELINE_STEPS = [
    { key: "REPORTED", label: "Reported", desc: "Ticket created" },
    { key: "ASSIGNED", label: "Assigned", desc: "Coordinator dispatched" },
    { key: "ACCEPTED", label: "Accepted", desc: "Staff acknowledged" },
    { key: "IN_PROGRESS", label: "In Progress", desc: "Work ongoing" },
    { key: "RESOLVED", label: "Resolved", desc: "Fix completed" },
    { key: "VERIFIED", label: "Verified", desc: "Supervisor confirmed" },
    { key: "CLOSED", label: "Closed", desc: "Archived & finished" },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "REPORTED": return 0;
      case "ASSIGNED": return 1;
      case "ACCEPTED": return 2;
      case "IN_PROGRESS": return 3;
      case "RESOLVED": return 4;
      case "VERIFIED": return 5;
      case "CLOSED": return 6;
      default: return -1;
    }
  };

  const currentStepIdx = issue ? getStepIndex(issue.status) : 0;
  const isEscalated = issue?.status === "ESCALATED";
  const isRejected = issue?.status === "REJECTED";

  // Status visual styles
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "REPORTED":
      case "ASSIGNED":
        return "text-[#EA580C] bg-[#EA580C]/15 border-[#EA580C]/30 shadow-[0_0_15px_rgba(234,88,12,0.25)]";
      case "ACCEPTED":
      case "IN_PROGRESS":
        return "text-[#F7931A] bg-[#F7931A]/15 border-[#F7931A]/30 shadow-[0_0_15px_rgba(247,147,26,0.25)]";
      case "RESOLVED":
        return "text-[#FFD600] bg-[#FFD600]/15 border-[#FFD600]/30 shadow-[0_0_15px_rgba(255,214,0,0.3)]";
      case "VERIFIED":
        return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.3)]";
      case "CLOSED":
        return "text-[#94A3B8] bg-[#1E293B] border-transparent opacity-75";
      case "ESCALATED":
        return "text-red-400 bg-red-500/15 border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.35)]";
      case "REJECTED":
        return "text-rose-500 bg-rose-500/15 border-rose-500/30";
      default:
        return "text-[#94A3B8] bg-[#1E293B] border-transparent";
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "CRITICAL":
        return "text-red-400 bg-red-500/10 border-red-500/30";
      case "HIGH":
        return "text-[#EA580C] bg-[#EA580C]/10 border-[#EA580C]/30";
      case "MEDIUM":
        return "text-[#F7931A] bg-[#F7931A]/10 border-[#F7931A]/30";
      case "LOW":
        return "text-[#FFD600] bg-[#FFD600]/10 border-[#FFD600]/30";
      default:
        return "text-[#94A3B8] bg-white/5 border-white/10";
    }
  };

  const formatFileSize = (bytes?: number | bigint) => {
    if (!bytes) return "";
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      {/* Lightbox / Zoom modal for viewing high-res image */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in zoom-in-95 duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full flex flex-col items-center" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Toolbar */}
            <div className="w-full flex items-center justify-between p-3 sm:p-4 bg-[#090B0E]/90 border border-white/10 rounded-t-2xl backdrop-blur-md">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-heading font-semibold text-white truncate">
                  {selectedImage.title}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-[#94A3B8] mt-0.5">
                  {selectedImage.size && <span>{selectedImage.size}</span>}
                  {selectedImage.uploadedBy && (
                    <span>• Uploaded by {selectedImage.uploadedBy}</span>
                  )}
                  {selectedImage.createdAt && (
                    <span>• {new Date(selectedImage.createdAt).toLocaleString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="btn-outline !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                  title="Open original in new tab"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Open Full</span>
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                  aria-label="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Image Preview Container */}
            <div className="relative w-full bg-black/60 border-x border-b border-white/10 rounded-b-2xl overflow-hidden flex items-center justify-center min-h-[300px] max-h-[75vh] p-2 sm:p-4">
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl transition-transform"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Modal Dialog */}
      <div 
        className="glass-panel bg-[#090B0E]/95 border border-[#1E293B] shadow-[0_0_60px_rgba(0,0,0,0.85)] rounded-2xl w-full max-w-4xl my-auto max-h-[92dvh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="p-4 sm:p-6 border-b border-[#1E293B] bg-[#030304]/80 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-[#F7931A] uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#F7931A]/10 border border-[#F7931A]/30 flex items-center gap-1">
                <Tag size={11} /> {issue?.type || "ISSUE"}
              </span>

              {issue?.issueNumber && (
                <button
                  onClick={copyTrackingId}
                  className="font-mono text-[10px] text-[#94A3B8] hover:text-white px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-white/20 flex items-center gap-1 transition-colors"
                  title="Click to copy tracking ID"
                >
                  #{issue.issueNumber}
                  {copiedId ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              )}

              <span className="font-mono text-[10px] text-[#94A3B8] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 border border-white/10">
                {issue?.category || "General"}
              </span>

              <span className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border font-semibold ${getPriorityStyle(issue?.priority || "MEDIUM")}`}>
                {issue?.priority || "MEDIUM"}
              </span>
            </div>

            <h2 className="text-lg sm:text-2xl font-heading font-bold text-white tracking-tight break-words">
              {isLoading ? "Loading Issue Details..." : issue?.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => issueId && loadIssueData(issueId)}
              disabled={isLoading}
              className="p-2 text-[#94A3B8] hover:text-[#F7931A] hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-[#1E293B]"
              title="Refresh"
            >
              <RefreshCw size={17} className={isLoading ? "animate-spin text-[#F7931A]" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#94A3B8] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close Modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
          {loadError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs sm:text-sm flex items-center justify-between">
              <span>{loadError}</span>
              <button
                onClick={() => issueId && loadIssueData(issueId)}
                className="btn-outline text-xs py-1 px-3"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-24 text-center font-mono text-[#F7931A] text-xs sm:text-sm uppercase tracking-widest animate-pulse">
              Retrieving ledger records & telemetry...
            </div>
          ) : !issue ? (
            <div className="py-16 text-center text-[#94A3B8] text-sm">
              Issue record not found.
            </div>
          ) : (
            <>
              {/* ─── Status Hero Card & Visual Lifecycle Stepper ─── */}
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-[#030304] border border-[#1E293B] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-inner">
                  <div className="space-y-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8]">
                      Current Lifecycle State
                    </p>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs sm:text-sm font-mono uppercase tracking-widest px-3.5 py-1.5 rounded-full border font-bold flex items-center gap-2 ${getStatusBadgeStyle(issue.status)}`}>
                        <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
                        {issue.status?.replace("_", " ")}
                      </span>
                      {isEscalated && (
                        <span className="text-[11px] font-mono text-red-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle size={14} /> Escalated SLA
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons for Coordinator & Supervisor */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
                    {/* Coordinator assigned actions */}
                    {isAssignee && issue.status === "ASSIGNED" && (
                      <button
                        onClick={() => handleStatusChange("ACCEPTED", "Coordinator accepted assignment")}
                        disabled={isUpdatingStatus}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Accept Assignment
                      </button>
                    )}

                    {isAssignee && issue.status === "ACCEPTED" && (
                      <button
                        onClick={() => handleStatusChange("IN_PROGRESS", "Coordinator began on-site work")}
                        disabled={isUpdatingStatus}
                        className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                      >
                        <Clock size={14} /> Start Working
                      </button>
                    )}

                    {isAssignee && issue.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleStatusChange("RESOLVED", "Coordinator finished task/fix")}
                        disabled={isUpdatingStatus}
                        className="bg-gradient-to-r from-[#FFD600] to-[#F7931A] text-black font-heading font-bold text-xs py-2 px-3.5 rounded-lg hover:brightness-110 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,214,0,0.3)]"
                      >
                        <CheckCircle2 size={14} /> Mark as Resolved
                      </button>
                    )}

                    {/* Supervisor verification gate */}
                    {canVerify && issue.status === "RESOLVED" && (
                      <button
                        onClick={() => handleStatusChange("VERIFIED", "Supervisor verified completion")}
                        disabled={isUpdatingStatus}
                        className="bg-emerald-500 hover:bg-emerald-400 text-black font-heading font-bold text-xs py-2 px-3.5 rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                      >
                        <ShieldCheck size={14} /> Verify Resolution ✓
                      </button>
                    )}

                    {canVerify && issue.status === "VERIFIED" && (
                      <button
                        onClick={() => handleStatusChange("CLOSED", "Ticket officially closed")}
                        disabled={isUpdatingStatus}
                        className="btn-outline text-xs py-2 px-3.5 flex items-center gap-1.5 text-white/80"
                      >
                        <Check size={14} /> Close Ticket
                      </button>
                    )}

                    {/* Advanced toggle for custom remarks / status selection */}
                    {(isSupervisor || isAssignee) && (
                      <button
                        onClick={() => setShowAdvancedStatus(!showAdvancedStatus)}
                        className="btn-outline text-xs py-2 px-3 text-[#94A3B8] hover:text-white"
                      >
                        {showAdvancedStatus ? "Hide Controls" : "Change Status / Notes"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Advanced Status Transition Drawer */}
                {showAdvancedStatus && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-[#1E293B] space-y-3 animate-in fade-in duration-150">
                    <p className="text-[11px] font-mono text-[#F7931A] uppercase tracking-wider font-semibold">
                      Transition Status & Record Remarks
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] uppercase block mb-1">
                          New Status
                        </label>
                        <select
                          value={selectedNewStatus}
                          onChange={(e) => setSelectedNewStatus(e.target.value)}
                          className="w-full crypto-input text-xs"
                        >
                          <option value="REPORTED">Reported</option>
                          <option value="ASSIGNED">Assigned</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="RESOLVED">Resolved</option>
                          {canVerify && (
                            <>
                              <option value="VERIFIED">Verified ✓</option>
                              <option value="CLOSED">Closed</option>
                              <option value="ESCALATED">Escalated</option>
                              <option value="REJECTED">Rejected</option>
                            </>
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-[#94A3B8] uppercase block mb-1">
                          Audit Remarks (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Completed electrical rewiring on 2nd floor"
                          value={statusRemarks}
                          onChange={(e) => setStatusRemarks(e.target.value)}
                          className="w-full crypto-input text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setShowAdvancedStatus(false)}
                        className="btn-outline text-xs py-1.5 px-3"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedNewStatus, statusRemarks)}
                        disabled={isUpdatingStatus || selectedNewStatus === issue.status}
                        className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                      >
                        {isUpdatingStatus ? "Applying..." : "Confirm Transition"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Visual Lifecycle Stepper Pipeline */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#030304]/60 border border-[#1E293B]">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] mb-4">
                    Lifecycle Pipeline Progress
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const isCompleted = currentStepIdx > idx;
                      const isCurrent = currentStepIdx === idx && !isEscalated && !isRejected;

                      return (
                        <div
                          key={step.key}
                          className={`p-2.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                            isCurrent
                              ? "bg-[#F7931A]/15 border-[#F7931A] shadow-[0_0_15px_rgba(247,147,26,0.3)]"
                              : isCompleted
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-white/[0.02] border-white/5 text-[#94A3B8]/60 opacity-60"
                          }`}
                        >
                          <div className="mb-1.5">
                            {isCompleted ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : isCurrent ? (
                              <div className="w-3.5 h-3.5 rounded-full bg-[#F7931A] animate-pulse shadow-[0_0_8px_#F7931A]"></div>
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-white/20"></div>
                            )}
                          </div>
                          <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            isCurrent ? "text-[#F7931A]" : isCompleted ? "text-emerald-400" : "text-[#94A3B8]"
                          }`}>
                            {step.label}
                          </p>
                          <span className="text-[8px] font-mono text-[#94A3B8]/70 mt-0.5 leading-tight">
                            {step.desc}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Escalation alert banner if applicable */}
                  {isEscalated && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400">
                      <AlertTriangle size={18} className="shrink-0" />
                      <div className="text-xs font-mono">
                        <p className="font-bold uppercase tracking-wider">SLA Escalation Triggered</p>
                        <p className="text-[11px] text-red-300/80 mt-0.5">
                          Unresolved after 2 hours. Ticket has been automatically routed to senior management.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Rejection alert banner if applicable */}
                  {isRejected && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-400">
                      <AlertCircle size={18} className="shrink-0" />
                      <div className="text-xs font-mono">
                        <p className="font-bold uppercase tracking-wider">Ticket Rejected</p>
                        <p className="text-[11px] text-rose-300/80 mt-0.5">
                          This issue was evaluated and marked as rejected by authority.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Evidence & Photo Attachments Gallery (The Core Feature) ─── */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[#030304] border border-[#1E293B] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                      <ImageIcon size={18} className="text-[#F7931A]" />
                      Evidence & Attached Photos
                      <span className="text-xs font-mono font-normal text-[#94A3B8] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 ml-1">
                        {issue.attachments?.length || 0}
                      </span>
                    </h3>
                    <p className="text-xs text-[#94A3B8] font-mono mt-0.5">
                      Coordinators and supervisors can inspect high-resolution images or upload proof of resolution
                    </p>
                  </div>

                  {/* Upload photo action for field coordinators & staff */}
                  {canUploadProof && (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="btn-outline !py-2 !px-3.5 text-xs flex items-center gap-2 text-[#F7931A] border-[#F7931A]/30 hover:border-[#F7931A]"
                      >
                        <Camera size={15} />
                        {isUploadingPhoto ? "Uploading Photo..." : "Add Photo / Proof"}
                      </button>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="text-xs font-mono text-red-400 bg-red-500/10 p-2.5 rounded-lg border border-red-500/20">
                    {uploadError}
                  </p>
                )}

                {/* Attachments Grid */}
                {!issue.attachments || issue.attachments.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-white/[0.01] border border-dashed border-[#1E293B] text-[#94A3B8]">
                    <Camera size={32} className="mx-auto mb-2 text-[#94A3B8]/40" />
                    <p className="text-xs font-mono uppercase tracking-wider text-white/60">
                      No photos attached to this report
                    </p>
                    {canUploadProof && (
                      <p className="text-[11px] font-mono text-[#94A3B8]/60 mt-1">
                        Tap "Add Photo / Proof" above to upload evidence or resolution confirmation
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                    {issue.attachments.map((att: any, idx: number) => {
                      const fullUrl = getAttachmentUrl(att.fileUrl);
                      const isImage = !att.mimeType || att.mimeType.startsWith("image/");
                      const fileName = att.fileUrl?.split("/").pop() || `Photo #${idx + 1}`;
                      const formattedSize = formatFileSize(att.fileSize);
                      const uploaderName = att.uploadedBy?.name || "Reporter";

                      return (
                        <div
                          key={att.id || idx}
                          onClick={() => {
                            if (isImage) {
                              setSelectedImage({
                                url: fullUrl,
                                title: fileName,
                                size: formattedSize,
                                uploadedBy: uploaderName,
                                createdAt: att.createdAt,
                              });
                            }
                          }}
                          className="group relative rounded-xl bg-[#090B0E] border border-[#1E293B] hover:border-[#F7931A]/50 transition-all overflow-hidden cursor-pointer shadow-md hover:shadow-[0_0_20px_rgba(247,147,26,0.25)] flex flex-col"
                        >
                          {/* Image Thumbnail */}
                          <div className="relative aspect-video w-full bg-black/40 overflow-hidden flex items-center justify-center">
                            {isImage ? (
                              <img
                                src={fullUrl}
                                alt={fileName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  // Fallback placeholder if image link fails
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center p-4 text-[#94A3B8]">
                                <Upload size={24} className="mb-1" />
                                <span className="text-[10px] font-mono uppercase">Document / Media</span>
                              </div>
                            )}

                            {/* Hover overlay hint */}
                            {isImage && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                                <span className="text-xs font-mono uppercase tracking-widest bg-black/70 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5">
                                  <ZoomIn size={14} className="text-[#FFD600]" /> Inspect Full Image
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Image Metadata Footer */}
                          <div className="p-3 bg-[#030304] border-t border-[#1E293B] flex items-center justify-between text-[11px] font-mono">
                            <div className="min-w-0 pr-2">
                              <p className="text-white font-medium truncate" title={fileName}>
                                {fileName}
                              </p>
                              <p className="text-[#94A3B8] text-[10px] truncate">
                                {formattedSize ? `${formattedSize} • ` : ""}By {uploaderName}
                              </p>
                            </div>

                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7931A] transition-colors shrink-0"
                              title="Open original file"
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ─── Description & Location Grid ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Description Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#030304] border border-[#1E293B] space-y-3">
                  <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-wider text-[#F7931A] flex items-center gap-2">
                    <AlertCircle size={15} /> Description
                  </h3>
                  <p className="text-xs sm:text-sm text-[#94A3B8] whitespace-pre-wrap leading-relaxed">
                    {issue.description || "No detailed description provided."}
                  </p>
                </div>

                {/* Location & GPS Telemetry */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#030304] border border-[#1E293B] space-y-3">
                  <h3 className="font-heading font-semibold text-white text-sm uppercase tracking-wider text-[#EA580C] flex items-center gap-2">
                    <MapPin size={15} /> Location Telemetry
                  </h3>
                  {issue.locationLat && issue.locationLng ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-[#1E293B]">
                        <span className="text-xs font-mono text-white">
                          {issue.locationLat.toFixed(5)}, {issue.locationLng.toFixed(5)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={copyCoordinates}
                            className="p-1.5 rounded-md hover:bg-white/10 text-[#94A3B8] hover:text-white text-[10px] font-mono flex items-center gap-1"
                            title="Copy GPS coordinates"
                          >
                            {copiedCoords ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <a
                            href={`https://www.google.com/maps?q=${issue.locationLat},${issue.locationLng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-md hover:bg-[#F7931A]/10 text-[#94A3B8] hover:text-[#F7931A] text-[10px] font-mono flex items-center gap-1"
                            title="Open in Google Maps"
                          >
                            <ExternalLink size={12} /> Maps
                          </a>
                        </div>
                      </div>
                      {issue.address && (
                        <p className="text-xs text-[#94A3B8] font-mono">
                          Address: <span className="text-white">{issue.address}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-[#94A3B8]/60 font-mono">
                      No GPS coordinates logged for this issue.
                    </p>
                  )}
                </div>
              </div>

              {/* ─── Assigned Coordinator & Reporter Personnel Grid ─── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Assignee Card */}
                <div className="p-4 rounded-xl bg-[#030304] border border-[#1E293B] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-heading font-bold text-sm shrink-0 shadow-[0_0_12px_rgba(247,147,26,0.3)]">
                      {issue.assignedTo?.name ? issue.assignedTo.name.substring(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest">
                        Assigned Coordinator
                      </p>
                      <p className="text-sm font-heading font-semibold text-white truncate">
                        {issue.assignedTo?.name || "Unassigned"}
                      </p>
                      <p className="text-[10px] font-mono text-[#F7931A]">
                        {issue.assignedTo?.designations?.[0] || "Staff Coordinator"}
                      </p>
                    </div>
                  </div>

                  {issue.assignedTo && issue.assignedTo.id !== currentUser?.id && (
                    <button
                      onClick={() => initiateCall(issue.assignedTo.id, issue.assignedTo.name, false)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-[#F7931A]/20 text-[#94A3B8] hover:text-[#F7931A] border border-[#1E293B] hover:border-[#F7931A]/40 transition-all shrink-0"
                      title="Voice/Video Call Coordinator"
                    >
                      <PhoneCall size={16} />
                    </button>
                  )}
                </div>

                {/* Reporter Card */}
                <div className="p-4 rounded-xl bg-[#030304] border border-[#1E293B] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center text-white/80 font-heading font-bold text-sm shrink-0">
                      {issue.reportedBy?.name ? issue.reportedBy.name.substring(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-widest">
                        Reported By
                      </p>
                      <p className="text-sm font-heading font-semibold text-white truncate">
                        {issue.reportedBy?.name || "Anonymous / System"}
                      </p>
                      <p className="text-[10px] font-mono text-[#94A3B8]/70">
                        {new Date(issue.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {issue.reportedBy && issue.reportedBy.id !== currentUser?.id && (
                    <button
                      onClick={() => initiateCall(issue.reportedBy.id, issue.reportedBy.name, false)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-[#1E293B] transition-all shrink-0"
                      title="Call Reporter"
                    >
                      <PhoneCall size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* ─── Chronological Audit Trail & Status History ─── */}
              <div className="p-4 sm:p-6 rounded-2xl bg-[#030304] border border-[#1E293B] space-y-4">
                <h3 className="font-heading font-bold text-white text-base flex items-center gap-2">
                  <Clock size={16} className="text-[#FFD600]" />
                  Status Audit Trail & History
                  <span className="text-xs font-mono text-[#94A3B8] px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                    {history.length} Events
                  </span>
                </h3>

                {history.length === 0 ? (
                  <p className="text-xs font-mono text-[#94A3B8]/60">
                    No state transitions logged yet.
                  </p>
                ) : (
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#1E293B]">
                    {history.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="relative pl-8 text-xs font-mono">
                        {/* Dot on line */}
                        <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 -translate-x-1/2 rounded-full bg-[#030304] border-2 border-[#F7931A] shadow-[0_0_8px_rgba(247,147,26,0.6)]"></div>

                        <div className="p-3 rounded-xl bg-white/[0.02] border border-[#1E293B] space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {item.oldStatus && (
                                <>
                                  <span className="text-[10px] text-[#94A3B8] uppercase">
                                    {item.oldStatus}
                                  </span>
                                  <ArrowRight size={11} className="text-[#94A3B8]" />
                                </>
                              )}
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(item.newStatus)}`}>
                                {item.newStatus}
                              </span>
                            </div>

                            <span className="text-[10px] text-[#94A3B8]/60">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>

                          <div className="text-[11px] text-white/80">
                            Changed by <span className="font-semibold text-white">{item.changedBy?.name || "System"}</span>
                            {item.changedBy?.designations?.[0] && (
                              <span className="text-[#F7931A] ml-1">({item.changedBy.designations[0]})</span>
                            )}
                          </div>

                          {item.remarks && (
                            <p className="text-xs text-[#94A3B8] italic pt-0.5">
                              "{item.remarks}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#030304] flex items-center justify-between text-xs font-mono text-[#94A3B8] shrink-0">
          <span>Ledger Node: Realtime Synced</span>
          <button
            onClick={onClose}
            className="btn-outline !py-1.5 !px-4 text-xs text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Search, Filter, PhoneCall, Mail, MapPin, MessageSquare, MoreVertical, Shield, Plus, X } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { useCall } from "@/components/CallProvider";

export default function TeamPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { initiateCall } = useCall();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STAFF',
    departmentId: '',
    reportingManagerId: '',
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    loadTeam();
  }, []);

  async function loadTeam() {
    try {
      const data = await fetchAPI('/users/team');
      // Map backend user objects to UI format
      const formatted = data.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        email: u.email,
        phone: u.phone,
        status: u.status?.toLowerCase() || 'offline',
      }));
      setTeamMembers(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetchAPI('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({ name: '', email: '', role: 'STAFF', departmentId: '', reportingManagerId: '' });
      loadTeam(); // Refresh the list
    } catch (err: any) {
      alert("Failed to add user: " + err.message);
    }
  }



  const getStatusColor = (status: string) => {
    switch(status) {
      case 'online': return 'bg-[#FFD600] shadow-[0_0_10px_rgba(255,214,0,0.8)]';
      case 'busy': return 'bg-[#EA580C] shadow-[0_0_10px_rgba(234,88,12,0.8)]';
      case 'task': return 'bg-[#F7931A] shadow-[0_0_10px_rgba(247,147,26,0.8)]';
      default: return 'bg-[#1E293B]';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
            Team <span className="text-gradient">Directory</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-2 tracking-wide uppercase">Manage and communicate with your coordinators</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4 md:mt-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F7931A] group-focus-within:text-[#FFD600] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="crypto-input !pl-12 pr-4 w-full md:w-64"
            />
          </div>
          
          <button className="btn-outline text-[13px]">
            <Filter size={16} className="mr-2" /> Roles
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add Node
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 font-mono text-[#F7931A] animate-pulse uppercase tracking-widest text-sm">Synchronizing network...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teamMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            member.role.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(member => (
          <div key={member.id} className="crypto-card flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#F7931A] cursor-pointer transition-colors">
              <MoreVertical size={18} />
            </div>
            
            <div className="relative mb-5 mt-2">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center shadow-[0_0_20px_rgba(247,147,26,0.4)] group-hover:scale-105 transition-transform">
                <span className="text-3xl font-heading font-bold text-white">{member.name.substring(0,2).toUpperCase()}</span>
              </div>
              <div className={`absolute bottom-0 right-2 w-5 h-5 rounded-full border-4 border-[#0F1115] ${getStatusColor(member.status)}`}></div>
            </div>
            
            <h3 className="text-lg font-heading font-bold text-white mb-1 group-hover:text-[#F7931A] transition-colors">{member.name}</h3>
            
            <span className="text-[10px] font-mono font-bold text-[#F7931A] bg-[#EA580C]/10 border border-[#EA580C]/30 px-3 py-1.5 rounded-full mb-5 flex items-center gap-2 uppercase tracking-widest">
              {member.role === 'ADMIN' && <Shield size={12} />}
              {member.role === 'ADMIN' ? 'Manager' : member.role === 'SUPERVISOR' ? 'Faculty' : member.role === 'STAFF' ? 'Staff' : 'Citizen'}
            </span>
            
            <div className="w-full space-y-3 mb-6 bg-[#030304] p-4 rounded-lg border border-[#1E293B]">
              <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#94A3B8]">
                <Mail size={14} className="text-[#EA580C]" />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#94A3B8]">
                  <PhoneCall size={14} className="text-[#EA580C]" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 w-full mt-auto">
              <button className="flex-1 bg-transparent hover:bg-white/5 border border-[#1E293B] hover:border-[#FFD600]/30 text-[#94A3B8] hover:text-[#FFD600] py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all text-xs font-mono tracking-widest uppercase">
                <MessageSquare size={14} /> Chat
              </button>
              <button 
                onClick={() => initiateCall(member.id, member.name, false)}
                className="flex-1 btn-primary py-2.5 text-xs tracking-widest flex items-center justify-center gap-2"
              >
                <PhoneCall size={14} /> Call
              </button>
            </div>
          </div>
        ))}
        
        {teamMembers.length === 0 && (
          <div className="col-span-full text-center py-12 font-mono text-[11px] text-[#94A3B8] uppercase tracking-widest">
            No active nodes found in your hierarchy.
          </div>
        )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="crypto-card w-full max-w-md relative animate-in zoom-in duration-200 !p-0 overflow-hidden">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#94A3B8] hover:text-[#F7931A] z-10"
            >
              <X size={20} />
            </button>
            
            <div className="p-6 border-b border-[#1E293B] bg-black/40">
              <h2 className="text-xl font-heading font-bold text-white tracking-wide">Register Node</h2>
              <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-widest mt-1">Create a new user under your hierarchy</p>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#F7931A] uppercase tracking-widest mb-2">Full Name</label>
                <input 
                  type="text" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="crypto-input w-full" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#F7931A] uppercase tracking-widest mb-2">Email Address</label>
                <input 
                  type="email" required 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="crypto-input w-full" 
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-mono font-bold text-[#F7931A] uppercase tracking-widest mb-2">Role</label>
                <select 
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                  className="crypto-input w-full"
                >
                  <option value="SUPERVISOR" className="bg-[#030304]">Faculty (Supervisor)</option>
                  <option value="STAFF" className="bg-[#030304]">Staff (Core Member/Coordinator)</option>
                  <option value="CITIZEN" className="bg-[#030304]">Student</option>
                </select>
              </div>

              {/* Hierarchy Assignment */}
              {currentUser?.role === 'ADMIN' && formData.role === 'STAFF' && (
                <div>
                  <label className="block text-[10px] font-mono font-bold text-[#F7931A] uppercase tracking-widest mb-2">Assign To (Reporting Faculty)</label>
                  <select 
                    value={formData.reportingManagerId} onChange={e => setFormData({...formData, reportingManagerId: e.target.value})}
                    className="crypto-input w-full"
                  >
                    <option value="" className="bg-[#030304]">Directly to Me (Manager)</option>
                    <optgroup label="Faculty Members" className="bg-[#030304]">
                      {teamMembers.filter(m => m.role === 'SUPERVISOR').map(faculty => (
                        <option key={faculty.id} value={faculty.id} className="bg-[#030304]">{faculty.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 btn-primary"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

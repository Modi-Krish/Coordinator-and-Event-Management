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
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'task': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Team Directory</h1>
          <p className="text-white/60 mt-1">Manage and communicate with your coordinators</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
          
          <button className="glass-panel px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors">
            <Filter size={16} /> Roles
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
            >
              <Plus size={16} /> Add User
            </button>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="text-center py-20 text-white/50">Loading team...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {teamMembers.filter(member => 
            member.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            member.role.toLowerCase().includes(searchTerm.toLowerCase())
          ).map(member => (
          <div key={member.id} className="glass-panel p-6 flex flex-col items-center text-center group hover:-translate-y-1 transition-transform duration-300">
            <div className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer transition-colors">
              <MoreVertical size={18} />
            </div>
            
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                <span className="text-2xl font-bold text-white">{member.name.substring(0,2).toUpperCase()}</span>
              </div>
              <div className={`absolute bottom-0 right-1 w-5 h-5 rounded-full border-4 border-[#0f1115] ${getStatusColor(member.status)}`}></div>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-1">{member.name}</h3>
            
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full mb-4 flex items-center gap-1">
              {member.role === 'ADMIN' && <Shield size={10} />}
              {member.role === 'ADMIN' ? 'Manager' : member.role === 'SUPERVISOR' ? 'Faculty' : member.role === 'STAFF' ? 'Staff' : 'Citizen'}
            </span>
            
            <div className="w-full space-y-2 mb-6">
              <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                <Mail size={14} />
                <span className="truncate">{member.email}</span>
              </div>
              {member.phone && (
                <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                  <PhoneCall size={14} />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 w-full mt-auto">
              <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm">
                <MessageSquare size={16} /> Chat
              </button>
              <button 
                onClick={() => initiateCall(member.id, member.name, false)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium"
              >
                <PhoneCall size={16} /> Call
              </button>
            </div>
          </div>
        ))}
        
        {teamMembers.length === 0 && (
          <div className="col-span-full text-center py-12 text-white/50">
            No team members found in your hierarchy.
          </div>
        )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Add Team Member</h2>
              <p className="text-sm text-white/60">Create a new user under your hierarchy</p>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Full Name</label>
                <input 
                  type="text" required 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Email Address</label>
                <input 
                  type="email" required 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none" 
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1">Role</label>
                <select 
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="SUPERVISOR" className="bg-[#0f1115]">Faculty (Supervisor)</option>
                  <option value="STAFF" className="bg-[#0f1115]">Staff (Core Member/Intern/Coordinator)</option>
                  <option value="CITIZEN" className="bg-[#0f1115]">Student</option>
                </select>
              </div>

              {/* Hierarchy Assignment */}
              {currentUser?.role === 'ADMIN' && formData.role === 'STAFF' && (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1">Assign To (Reporting Faculty)</label>
                  <select 
                    value={formData.reportingManagerId} onChange={e => setFormData({...formData, reportingManagerId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="" className="bg-[#0f1115]">Directly to Me (Manager)</option>
                    <optgroup label="Faculty Members">
                      {teamMembers.filter(m => m.role === 'SUPERVISOR').map(faculty => (
                        <option key={faculty.id} value={faculty.id} className="bg-[#0f1115]">{faculty.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition-colors shadow-lg shadow-blue-500/20"
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

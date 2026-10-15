"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneCall, PhoneForwarded, PhoneMissed, Video, Search, Mic, MicOff, VideoOff, PhoneOff, User } from "lucide-react";
import { useCall } from "@/components/CallProvider";
import { fetchAPI } from "@/lib/api";

export default function CallsPage() {
  const { initiateCall } = useCall();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadContacts() {
      try {
        const data = await fetchAPI('/users/team');
        setContacts(data);
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    }
    loadContacts();
  }, []);

  const startCall = (id: string, name: string, isVideo: boolean) => {
    initiateCall(id, name, isVideo);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col md:flex-row gap-4 sm:gap-6 min-h-[calc(100dvh-6rem)] md:h-[calc(100dvh-6rem)] min-w-0">
      {/* Left sidebar: Call History & Contacts */}
      <div className="w-full md:w-1/3 flex flex-col gap-4 sm:gap-5 shrink-0 min-w-0">
        <header>
          <h1 className="text-2xl sm:text-4xl font-heading font-bold text-white tracking-tight break-words">
            Node <span className="text-gradient">Comms</span>
          </h1>
          <div className="text-[#94A3B8] font-mono text-[10px] sm:text-[11px] mt-1 sm:mt-2 tracking-widest uppercase">Encrypted peer-to-peer relay</div>
        </header>

        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F7931A] group-focus-within:text-[#FFD600] transition-colors" size={17} />
          <input 
            type="text" 
            placeholder="Search nodes..." 
            className="crypto-input !pl-11 pr-4 w-full text-xs sm:text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="crypto-card !p-0 overflow-y-auto max-h-[340px] md:max-h-none md:flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1E293B] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#334155]">
          <div className="p-3.5 sm:p-4 border-b border-[#1E293B] sticky top-0 bg-[#030304]/90 backdrop-blur z-10">
            <h3 className="text-[10px] font-mono text-[#F7931A] uppercase tracking-widest">Active Contacts</h3>
          </div>
          <div className="divide-y divide-[#1E293B]">
            {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
              <div key={contact.id} className="p-3 sm:p-4 hover:bg-white/5 transition-colors flex items-center gap-3 sm:gap-4 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-heading font-bold text-xs sm:text-sm relative shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.3)] group-hover:scale-105 transition-transform">
                  {contact.name.substring(0,2).toUpperCase()}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-[#0F1115] ${contact.status === 'ONLINE' ? 'bg-[#FFD600]' : 'bg-slate-500'} shadow-[0_0_10px_currentColor]`}></div>
                </div>
                <div className="flex-1 overflow-hidden min-w-0">
                  <h4 className="font-heading font-bold text-white text-xs sm:text-sm truncate group-hover:text-[#F7931A] transition-colors">{contact.name}</h4>
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono text-[#94A3B8] mt-0.5 sm:mt-1 uppercase tracking-widest truncate">
                    <User size={10} className="text-[#EA580C] shrink-0" />
                    <span className="truncate">{contact.designations?.[0] || contact.roles?.[0] || 'NODE'}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 sm:gap-2 shrink-0">
                  <button 
                    aria-label={`Voice call ${contact.name}`}
                    className="p-2 sm:p-2.5 bg-transparent border border-[#1E293B] hover:border-[#FFD600]/30 hover:bg-white/5 rounded-full text-[#94A3B8] hover:text-[#FFD600] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center" 
                    onClick={() => startCall(contact.id, contact.name, false)}
                  >
                    <Phone size={14} />
                  </button>
                  <button 
                    aria-label={`Video call ${contact.name}`}
                    className="p-2 sm:p-2.5 bg-transparent border border-[#1E293B] hover:border-[#FFD600]/30 hover:bg-white/5 rounded-full text-[#94A3B8] hover:text-[#FFD600] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center" 
                    onClick={() => startCall(contact.id, contact.name, true)}
                  >
                    <Video size={14} />
                  </button>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="p-8 text-center text-[#F7931A] font-mono text-[10px] uppercase tracking-widest animate-pulse">
                Synchronizing Ledger...
              </div>
            )}
            {!isLoading && contacts.length === 0 && (
              <div className="p-8 text-center text-[#94A3B8] font-mono text-[10px] uppercase tracking-widest">
                No active nodes found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Active Call Area */}
      <div className="w-full md:w-2/3 crypto-card flex flex-col overflow-hidden bg-grid-pattern min-h-[320px] min-w-0">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-8 relative z-10">
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full border border-[#EA580C]/30 bg-[#EA580C]/10 flex items-center justify-center text-[#F7931A] mb-4 sm:mb-6 relative shadow-[0_0_30px_rgba(234,88,12,0.2)] shrink-0">
            <PhoneCall size={32} className="sm:scale-125" />
            <div className="absolute top-0 right-0 w-3 h-3 sm:w-4 sm:h-4 bg-[#FFD600] rounded-full animate-ping"></div>
          </div>
          <h2 className="text-xl sm:text-3xl font-heading font-bold text-white mb-2 sm:mb-3">Protocol Ready</h2>
          <div className="text-[#94A3B8] font-mono text-[10px] sm:text-[11px] uppercase tracking-widest max-w-sm mb-6 sm:mb-8 leading-relaxed px-2">
            Select a node from your directory to establish a secure, end-to-end encrypted relay.
          </div>
          <div className="bg-[#030304] p-3.5 sm:p-5 rounded-lg border border-[#1E293B] text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-[#94A3B8] max-w-sm w-full text-left space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2.5 sm:gap-3"><span className="w-2 h-2 rounded-full bg-[#EA580C] shadow-[0_0_10px_rgba(234,88,12,0.8)] inline-block shrink-0"></span> Connected to Signal Server</div>
            <div className="flex items-center gap-2.5 sm:gap-3"><span className="w-2 h-2 rounded-full bg-[#FFD600] shadow-[0_0_10px_rgba(255,214,0,0.8)] inline-block shrink-0"></span> ICE Nodes Active</div>
            <div className="flex items-center gap-2.5 sm:gap-3"><span className="w-2 h-2 rounded-full bg-[#F7931A] shadow-[0_0_10px_rgba(247,147,26,0.8)] inline-block shrink-0"></span> Telemetry Permissions Granted</div>
          </div>
        </div>
      </div>
    </div>
  );
}

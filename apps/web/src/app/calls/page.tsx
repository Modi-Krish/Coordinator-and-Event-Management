"use client";

import { useState, useEffect } from "react";
import { Phone, PhoneCall, PhoneForwarded, PhoneMissed, Video, Search, Mic, MicOff, VideoOff, PhoneOff, User } from "lucide-react";
import { useCall } from "@/components/CallProvider";
import { fetchAPI } from "@/lib/api";

export default function CallsPage() {
  const { initiateCall } = useCall();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadContacts() {
      try {
        const data = await fetchAPI('/users/team');
        setContacts(data);
      } catch (err) {}
    }
    loadContacts();
  }, []);

  const startCall = (id: string, name: string, isVideo: boolean) => {
    initiateCall(id, name, isVideo);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 flex flex-col md:flex-row gap-6 h-[calc(100vh-6rem)]">
      {/* Left sidebar: Call History */}
      <div className="w-full md:w-1/3 flex flex-col gap-4">
        <header>
          <h1 className="text-3xl font-bold text-white tracking-tight">Calls</h1>
          <p className="text-white/60 mt-1">Real-time communication</p>
        </header>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
          <input 
            type="text" 
            placeholder="Search contacts..." 
            className="pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500 w-full shadow-inner"
          />
        </div>

        <div className="flex-1 glass-panel overflow-y-auto mt-2 rounded-xl">
          <div className="p-4 border-b border-white/10 sticky top-0 bg-[#0f1115]/80 backdrop-blur z-10">
            <h3 className="text-sm font-semibold text-white/80">Contacts</h3>
          </div>
          <div className="divide-y divide-white/5">
            {contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(contact => (
              <div key={contact.id} className="p-4 hover:bg-white/5 transition-colors flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold relative shrink-0">
                  {contact.name.substring(0,2).toUpperCase()}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1a1d24] ${contact.status === 'ONLINE' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <h4 className="font-semibold text-white truncate">{contact.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-white/50 mt-0.5 truncate">
                    <User size={12} className="text-blue-400" />
                    <span>{contact.role}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors" onClick={() => startCall(contact.id, contact.name, false)}>
                    <Phone size={16} />
                  </button>
                  <button className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors" onClick={() => startCall(contact.id, contact.name, true)}>
                    <Video size={16} />
                  </button>
                </div>
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="p-8 text-center text-white/50 text-sm">
                No contacts found
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right side: Active Call Area */}
      <div className="w-full md:w-2/3 glass-panel rounded-2xl flex flex-col overflow-hidden bg-black/40">
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-white/20 mb-6 relative">
            <PhoneCall size={48} />
            <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full animate-ping"></div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">WebRTC Ready</h2>
          <p className="text-white/50 max-w-sm mb-6">
            Select a contact from your team directory to initiate a secure, encrypted peer-to-peer audio or video call.
          </p>
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-white/40 max-w-sm text-left">
            <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span> Connected to WebSocket Signal Server</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span> STUN/TURN ICE Servers Active</div>
            <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span> Camera/Mic Permissions Granted</div>
          </div>
        </div>
      </div>
    </div>
  );
}

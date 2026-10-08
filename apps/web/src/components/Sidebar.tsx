"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Map, 
  CheckSquare, 
  AlertOctagon, 
  Users, 
  Bell, 
  Settings,
  PhoneCall,
  LogOut,
  X
} from "lucide-react";
import { useSocket } from "./SocketProvider";
import { fetchAPI } from "@/lib/api";

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const { socket, isConnected } = useSocket();

  const loadNotifications = async () => {
    try {
      const data = await fetchAPI('/notifications');
      setNotifications(data);
    } catch(_e) {}
  };

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setTimeout(() => setUser(parsed), 0);
        void loadNotifications();
      } catch(_e) {}
    }
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;
    
    const handleNewNotification = (notif: any) => {
      setNotifications(prev => [notif, ...prev]);
      setToast({ title: notif.title, message: notif.message });
      setTimeout(() => setToast(null), 5000);
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, isConnected]);

  const markAsRead = async (id: string) => {
    try {
      await fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch(_e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <aside className="w-64 border-r border-[#1E293B] bg-[#0F1115]/90 backdrop-blur-xl hidden md:flex flex-col z-20">
        <div className="p-6 flex justify-between items-center border-b border-[#1E293B]">
          <div>
            <h1 className="text-xl font-heading font-bold text-gradient uppercase tracking-wider">
              Coordinator
            </h1>
            <p className="text-[10px] font-mono text-[#94A3B8] mt-1 tracking-widest uppercase">System Core</p>
          </div>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <Bell size={20} className="text-white/70" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0f1115]"></span>
            )}
          </button>
        </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === "/"} />
        <NavItem href="/map" icon={<Map size={20} />} label="Live Map" active={pathname?.startsWith("/map")} />
        <NavItem href="/tasks" icon={<CheckSquare size={20} />} label="Tasks" active={pathname?.startsWith("/tasks")} />
        <NavItem href="/issues" icon={<AlertOctagon size={20} />} label="Issues" active={pathname?.startsWith("/issues")} />
        <NavItem href="/report" icon={<AlertOctagon size={20} />} label="Report Issue" active={pathname?.startsWith("/report")} />
        <NavItem href="/team" icon={<Users size={20} />} label="Team" active={pathname?.startsWith("/team")} />
        <NavItem href="/calls" icon={<PhoneCall size={20} />} label="Calls" active={pathname?.startsWith("/calls")} />
      </nav>

      <div className="p-4 border-t border-[#1E293B] space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-[#F7931A]/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center font-bold text-sm shadow-[0_0_15px_-3px_rgba(234,88,12,0.6)]">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Loading...'}</p>
            <p className="text-[10px] font-mono text-[#F7931A] font-bold truncate tracking-wider">
              {user?.role || ''}
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </aside>

    {/* Notifications Panel */}
    {showNotifications && (
      <div className="fixed inset-y-0 left-64 w-80 bg-[#0F1115] border-r border-[#1E293B] shadow-[20px_0_50px_-10px_rgba(247,147,26,0.1)] z-10 flex flex-col animate-in slide-in-from-left-8 duration-200">
        <div className="p-4 border-b border-[#1E293B] flex justify-between items-center">
          <h2 className="font-heading font-bold text-lg flex items-center gap-2 text-white">
            <Bell size={18} className="text-[#F7931A]" /> Notifications
          </h2>
          <button onClick={() => setShowNotifications(false)} className="text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-10">No notifications yet</p>
          ) : (
            notifications.map(n => (
              <div 
                key={n.id} 
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  n.isRead 
                    ? 'bg-transparent border-[#1E293B] opacity-60' 
                    : 'bg-[#EA580C]/10 border-[#F7931A]/30 shadow-[0_0_15px_-5px_rgba(247,147,26,0.2)]'
                }`}
              >
                <h4 className={`text-sm ${n.isRead ? 'font-medium' : 'font-bold text-[#F7931A]'}`}>{n.title}</h4>
                <p className="text-xs text-[#94A3B8] mt-1">{n.message}</p>
                <p className="text-[10px] font-mono text-[#94A3B8]/60 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* Toast Alert */}
    {toast && (
      <div className="fixed bottom-4 right-4 bg-[#0F1115] border border-[#F7931A]/50 text-white px-5 py-4 rounded-xl shadow-[0_0_30px_-5px_rgba(247,147,26,0.4)] z-50 flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-300">
        <Bell size={20} className="mt-0.5 animate-bounce text-[#F7931A]" />
        <div>
          <h4 className="font-heading font-bold text-sm text-[#FFD600]">{toast.title}</h4>
          <p className="text-xs text-[#94A3B8] mt-1">{toast.message}</p>
        </div>
        <button onClick={() => setToast(null)} className="text-white/50 hover:text-white ml-2">
          <X size={16} />
        </button>
      </div>
    )}
    </>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-mono text-sm tracking-wide ${
        active 
          ? "bg-gradient-to-r from-[#EA580C]/20 to-transparent border-l-2 border-[#F7931A] text-white shadow-[inset_0_0_20px_-10px_rgba(247,147,26,0.3)]" 
          : "text-[#94A3B8] hover:bg-white/5 hover:text-white border-l-2 border-transparent hover:border-white/20"
      }`}
    >
      <div className={active ? "text-[#F7931A]" : ""}>{icon}</div>
      <span>{label}</span>
    </Link>
  );
}

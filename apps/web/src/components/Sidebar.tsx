"use client";

import Link from "next/link";
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
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
        loadNotifications();
      } catch(e) {}
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

  const loadNotifications = async () => {
    try {
      const data = await fetchAPI('/notifications');
      setNotifications(data);
    } catch(e) {}
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchAPI(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch(e) {}
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      <aside className="w-64 border-r border-white/10 bg-[#0f1115]/80 backdrop-blur-xl hidden md:flex flex-col z-20">
        <div className="p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Coordinator
            </h1>
            <p className="text-xs text-white/50 mt-1">Management System</p>
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
        <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active />
        <NavItem href="/map" icon={<Map size={20} />} label="Live Map" />
        <NavItem href="/issues" icon={<AlertOctagon size={20} />} label="Issues" />
        <NavItem href="/report" icon={<AlertOctagon size={20} />} label="Report Issue" />
        <NavItem href="/team" icon={<Users size={20} />} label="Team" />
        <NavItem href="/calls" icon={<PhoneCall size={20} />} label="Calls" />
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-sm">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Loading...'}</p>
            <p className="text-xs text-blue-400 font-bold truncate">
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
      <div className="fixed inset-y-0 left-64 w-80 bg-[#161921] border-r border-white/10 shadow-2xl z-10 flex flex-col animate-in slide-in-from-left-8 duration-200">
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Bell size={18} /> Notifications
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
                className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                  n.isRead 
                    ? 'bg-white/5 border-transparent opacity-60' 
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <h4 className={`text-sm ${n.isRead ? 'font-medium' : 'font-bold'}`}>{n.title}</h4>
                <p className="text-xs text-white/60 mt-1">{n.message}</p>
                <p className="text-[10px] text-white/40 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    )}

    {/* Toast Alert */}
    {toast && (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-5 py-4 rounded-xl shadow-2xl z-50 flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-300">
        <Bell size={20} className="mt-0.5 animate-bounce" />
        <div>
          <h4 className="font-bold text-sm">{toast.title}</h4>
          <p className="text-xs text-white/80 mt-1">{toast.message}</p>
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
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
        active 
          ? "bg-blue-500/20 text-blue-400 font-medium" 
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

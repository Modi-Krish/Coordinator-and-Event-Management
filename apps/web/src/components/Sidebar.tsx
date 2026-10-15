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
  PhoneCall, 
  LogOut, 
  X,
  Menu,
  Radio
} from "lucide-react";
import { useSocket } from "./SocketProvider";
import { fetchAPI } from "@/lib/api";
import { LocationSharingControl } from "./LocationSharingControl";

export function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Close mobile drawer and notifications on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }, [pathname]);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
  const isCoordinatorUser = user?.designations?.map((d: string) => d.toUpperCase()).includes("COORDINATOR");

  return (
    <>
      {/* ─── Mobile Sticky Top Navigation Header (< 768px) ─── */}
      <header className="flex md:hidden items-center justify-between px-3.5 py-2.5 bg-[#0F1115]/95 backdrop-blur-xl border-b border-[#1E293B] sticky top-0 z-30 shrink-0 min-h-[56px] w-full">
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="p-2 -ml-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-transparent hover:border-[#1E293B]"
          >
            {mobileMenuOpen ? <X size={22} className="text-[#F7931A]" /> : <Menu size={22} />}
          </button>
          <Link href="/" className="flex flex-col">
            <span className="text-base font-heading font-bold text-gradient uppercase tracking-wider leading-tight">
              Coordinator
            </span>
            <span className="text-[9px] font-mono text-[#94A3B8] tracking-widest uppercase">
              System Core
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Real-time socket status pill */}
          <div 
            title={isConnected ? "Real-time socket connected" : "Connecting to telemetry..."}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#030304] border border-[#1E293B] text-[10px] font-mono"
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'}`}></span>
            <span className="hidden sm:inline text-white/60">{isConnected ? "ONLINE" : "SYNC"}</span>
          </div>

          {/* Notifications Button */}
          <button 
            type="button"
            onClick={() => setShowNotifications(prev => !prev)}
            aria-label="Toggle notifications"
            className="relative p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F1115]"></span>
            )}
          </button>

          {/* User initials chip */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(234,88,12,0.5)] text-white">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* ─── Mobile Drawer Overlay (< 768px) ─── */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ─── Mobile Drawer Content (< 768px) ─── */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 w-72 max-w-[85vw] bg-[#0F1115] border-r border-[#1E293B] z-50 flex flex-col p-4 shadow-2xl transition-transform duration-300 ease-in-out md:hidden overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-between items-center pb-4 mb-2 border-b border-[#1E293B]">
          <div>
            <h2 className="text-lg font-heading font-bold text-gradient uppercase tracking-wider">
              Coordinator
            </h2>
            <p className="text-[10px] font-mono text-[#94A3B8] tracking-widest uppercase">Mobile Terminal</p>
          </div>
          <button 
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 py-2">
          <NavItem href="/" icon={<LayoutDashboard size={19} />} label="Dashboard" active={pathname === "/"} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/map" icon={<Map size={19} />} label="Live Map" active={pathname?.startsWith("/map")} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/tasks" icon={<CheckSquare size={19} />} label="Tasks" active={pathname?.startsWith("/tasks")} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/issues" icon={<AlertOctagon size={19} />} label="Issues" active={pathname?.startsWith("/issues")} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/report" icon={<AlertOctagon size={19} />} label="Report Issue" active={pathname?.startsWith("/report")} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/team" icon={<Users size={19} />} label="Team" active={pathname?.startsWith("/team")} onClick={() => setMobileMenuOpen(false)} />
          <NavItem href="/calls" icon={<PhoneCall size={19} />} label="Calls" active={pathname?.startsWith("/calls")} onClick={() => setMobileMenuOpen(false)} />
        </nav>

        <div className="pt-3 border-t border-[#1E293B] space-y-3 mt-auto">
          {isCoordinatorUser && (
            <div className="pb-2 border-b border-[#1E293B]">
              <LocationSharingControl />
            </div>
          )}

          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-[#1E293B]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center font-bold text-xs shadow-[0_0_10px_rgba(234,88,12,0.5)] shrink-0">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Active User'}</p>
              <p className="text-[10px] font-mono text-[#F7931A] font-bold truncate tracking-wider uppercase">
                {user?.designations?.[0] || user?.role || user?.roles?.[0] || 'Member'}
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20 font-mono uppercase tracking-wider"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </aside>

      {/* ─── Desktop Sidebar (>= 768px) ─── */}
      <aside className="w-64 border-r border-[#1E293B] bg-[#0F1115]/90 backdrop-blur-xl hidden md:flex flex-col z-20 shrink-0">
        <div className="p-6 flex justify-between items-center border-b border-[#1E293B]">
          <div>
            <h1 className="text-xl font-heading font-bold text-gradient uppercase tracking-wider">
              Coordinator
            </h1>
            <p className="text-[10px] font-mono text-[#94A3B8] mt-1 tracking-widest uppercase">System Core</p>
          </div>
          <button 
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Toggle notifications"
            className="relative p-2 rounded-full hover:bg-white/10 min-h-[40px] min-w-[40px] flex items-center justify-center transition-colors"
          >
            <Bell size={20} className="text-white/70" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0F1115]"></span>
            )}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 mt-4 overflow-y-auto">
          <NavItem href="/" icon={<LayoutDashboard size={20} />} label="Dashboard" active={pathname === "/"} />
          <NavItem href="/map" icon={<Map size={20} />} label="Live Map" active={pathname?.startsWith("/map")} />
          <NavItem href="/tasks" icon={<CheckSquare size={20} />} label="Tasks" active={pathname?.startsWith("/tasks")} />
          <NavItem href="/issues" icon={<AlertOctagon size={20} />} label="Issues" active={pathname?.startsWith("/issues")} />
          <NavItem href="/report" icon={<AlertOctagon size={20} />} label="Report Issue" active={pathname?.startsWith("/report")} />
          <NavItem href="/team" icon={<Users size={20} />} label="Team" active={pathname?.startsWith("/team")} />
          <NavItem href="/calls" icon={<PhoneCall size={20} />} label="Calls" active={pathname?.startsWith("/calls")} />
        </nav>

        <div className="p-4 border-t border-[#1E293B] space-y-3">
          {isCoordinatorUser && (
            <div className="pb-3 border-b border-[#1E293B]">
              <LocationSharingControl />
            </div>
          )}
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-[#F7931A]/30">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center font-bold text-sm shadow-[0_0_15px_-3px_rgba(234,88,12,0.6)] shrink-0">
              {user?.name?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || 'Active User'}</p>
              <p className="text-[10px] font-mono text-[#F7931A] font-bold truncate tracking-wider">
                {user?.designations?.[0] || user?.role || user?.roles?.[0] || ''}
              </p>
            </div>
          </div>
          
          <button 
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ─── Responsive Notifications Overlay (Works on All Viewports) ─── */}
      {showNotifications && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30" 
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed top-14 md:top-0 right-3 left-3 sm:left-auto sm:right-4 md:left-64 w-auto sm:w-80 md:w-84 max-h-[82vh] md:h-full bg-[#0F1115] border border-[#1E293B] md:border-r md:border-y-0 md:border-l-0 rounded-2xl md:rounded-none shadow-[0_15px_50px_rgba(0,0,0,0.8)] z-40 flex flex-col animate-in fade-in slide-in-from-top-4 md:slide-in-from-left-6 duration-200">
            <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-black/40 rounded-t-2xl md:rounded-none">
              <h2 className="font-heading font-bold text-base md:text-lg flex items-center gap-2 text-white">
                <Bell size={18} className="text-[#F7931A]" /> Notifications
              </h2>
              <button 
                type="button"
                onClick={() => setShowNotifications(false)} 
                aria-label="Close notifications"
                className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell size={28} className="mx-auto text-white/20 mb-2" />
                  <p className="text-white/40 text-xs font-mono uppercase tracking-wider">No notifications yet</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => !n.isRead && markAsRead(n.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      n.isRead 
                        ? 'bg-transparent border-[#1E293B] opacity-60' 
                        : 'bg-[#EA580C]/10 border-[#F7931A]/30 shadow-[0_0_15px_-5px_rgba(247,147,26,0.2)]'
                    }`}
                  >
                    <h4 className={`text-xs sm:text-sm ${n.isRead ? 'font-medium text-white/90' : 'font-bold text-[#F7931A]'}`}>{n.title}</h4>
                    <p className="text-xs text-[#94A3B8] mt-1 break-words">{n.message}</p>
                    <p className="text-[10px] font-mono text-[#94A3B8]/60 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── Toast Alert (Mobile-friendly width constraint) ─── */}
      {toast && (
        <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 max-w-sm bg-[#0F1115] border border-[#F7931A]/50 text-white p-4 rounded-xl shadow-[0_0_30px_-5px_rgba(247,147,26,0.4)] z-50 flex gap-3 items-start animate-in slide-in-from-bottom-5 duration-300">
          <Bell size={18} className="mt-0.5 animate-bounce text-[#F7931A] shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-heading font-bold text-xs sm:text-sm text-[#FFD600] truncate">{toast.title}</h4>
            <p className="text-xs text-[#94A3B8] mt-0.5 break-words">{toast.message}</p>
          </div>
          <button 
            type="button"
            onClick={() => setToast(null)} 
            aria-label="Dismiss toast"
            className="text-white/50 hover:text-white p-1 -mr-1"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  active = false, 
  onClick 
}: { 
  href: string; 
  icon: React.ReactNode; 
  label: string; 
  active?: boolean; 
  onClick?: () => void;
}) {
  return (
    <Link 
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-mono text-xs sm:text-sm tracking-wide min-h-[44px] ${
        active 
          ? "bg-gradient-to-r from-[#EA580C]/25 to-transparent border-l-2 border-[#F7931A] text-white shadow-[inset_0_0_20px_-10px_rgba(247,147,26,0.3)] font-semibold" 
          : "text-[#94A3B8] hover:bg-white/5 hover:text-white border-l-2 border-transparent hover:border-white/20"
      }`}
    >
      <div className={active ? "text-[#F7931A] shrink-0" : "shrink-0"}>{icon}</div>
      <span className="truncate">{label}</span>
    </Link>
  );
}

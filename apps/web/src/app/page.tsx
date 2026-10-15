"use client";

import { useEffect, useState } from "react";
import { 
  Users as UsersIcon, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  PhoneCall,
  MapPin
} from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/components/SocketProvider";
import Map, { Marker } from "react-map-gl/maplibre";
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import Link from 'next/link';
import { useCurrentUser, canAssignTasks } from '@/lib/useCurrentUser';
import { IssueDetailModal } from '@/components/IssueDetailModal';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl("/maplibre-worker.mjs");
}

export default function Dashboard() {
  const currentUser = useCurrentUser();
  const userCanAssign = canAssignTasks(currentUser);
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [issuesData, usersData] = await Promise.all([
        fetchAPI('/issues'),
        fetchAPI('/users/team').catch(() => [])
      ]);
      setIssues(issuesData);
      setUsers(usersData);
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const { socket, isConnected } = useSocket();
  
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleIssueNew = (issue: any) => {
      setIssues(prev => [issue, ...prev]);
    };

    const handleIssueUpdated = (issue: any) => {
      setIssues(prev => prev.map(i => i.id === issue.id ? issue : i));
    };

    const handleLocationUpdate = (data: any) => {
      setUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, lat: data.lat, lng: data.lng, status: 'online' } : u
      ));
    };

    socket.on('issue:new', handleIssueNew);
    socket.on('issue:updated', handleIssueUpdated);
    socket.on('location:update', handleLocationUpdate);

    return () => {
      socket.off('issue:new', handleIssueNew);
      socket.off('issue:updated', handleIssueUpdated);
      socket.off('location:update', handleLocationUpdate);
    };
  }, [socket, isConnected]);

  const activeIssues = issues.filter(i => i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const criticalIssues = issues.filter(i => i.priority === 'HIGH' && i.status !== 'RESOLVED' && i.status !== 'CLOSED');
  const inProgressIssues = issues.filter(i => i.status === 'IN_PROGRESS' || i.status === 'ACCEPTED');
  
  // Dashboard map logic
  const activeUserPoints = users.filter(u => u.lat != null && u.lng != null);
  const activeIssuePoints = activeIssues.filter(i => i.locationLat != null && i.locationLng != null);
  const totalLocatedPoints = activeUserPoints.length + activeIssuePoints.length;

  const allLats = [
    ...activeUserPoints.map(u => u.lat as number),
    ...activeIssuePoints.map(i => i.locationLat as number)
  ];
  const allLngs = [
    ...activeUserPoints.map(u => u.lng as number),
    ...activeIssuePoints.map(i => i.locationLng as number)
  ];

  const defaultLat = allLats.length > 0 ? allLats.reduce((a,b)=>a+b)/allLats.length : 37.7749;
  const defaultLng = allLngs.length > 0 ? allLngs.reduce((a,b)=>a+b)/allLngs.length : -122.4194;

  if (isLoading) {
    return <div className="p-8 text-white/50">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 sm:space-y-8 max-w-7xl mx-auto pb-12 min-w-0">
      <header className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-6 sm:mb-10">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-heading font-bold text-white tracking-tight break-words">
            Organization <span className="text-gradient">Overview</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-xs sm:text-sm mt-1 sm:mt-2 tracking-wide uppercase">Real-time operational terminal</p>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:gap-4 w-full sm:w-auto shrink-0">
          <Link href="/report" className="btn-outline flex-1 sm:flex-initial text-xs sm:text-sm">
            Report Issue
          </Link>
          {userCanAssign && (
            <Link href="/tasks" className="btn-primary flex-1 sm:flex-initial text-xs sm:text-sm">
              Assign Task
            </Link>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Active Team" 
          value={users.length.toString()} 
          subtitle="Registered members" 
          icon={<UsersIcon className="text-[#F7931A]" size={22} />} 
          trend="0"
        />
        <StatCard 
          title="In Progress" 
          value={inProgressIssues.length.toString()} 
          subtitle="Issues being handled" 
          icon={<CheckCircle className="text-[#FFD600]" size={22} />} 
          trend="0"
        />
        <StatCard 
          title="Open Issues" 
          value={activeIssues.length.toString()} 
          subtitle="Requires attention" 
          icon={<AlertTriangle className="text-[#EA580C]" size={22} />} 
          trend="0"
          alert={criticalIssues.length > 0}
        />
        <StatCard 
          title="Avg Resolution" 
          value="--" 
          subtitle="Not enough data" 
          icon={<Clock className="text-[#94A3B8]" size={22} />} 
          trend="0"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Main Map Area */}
        <div className="lg:col-span-2 crypto-card !p-1 flex flex-col h-[340px] sm:h-[420px] lg:h-[500px] overflow-hidden min-w-0">
          <div className="p-3 sm:p-4 border-b border-[#1E293B] flex flex-wrap gap-2 justify-between items-center bg-black/40">
            <h2 className="font-heading font-semibold flex items-center gap-2 tracking-wide text-sm sm:text-base md:text-lg">
              <MapPin size={18} className="text-[#F7931A] shrink-0" />
              Live Team Location
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[9px] sm:text-[10px] font-mono bg-[#EA580C]/20 text-[#F7931A] px-2 sm:px-2.5 py-1 rounded-full border border-[#EA580C]/30 uppercase tracking-widest">Coordinators</span>
              <span className="text-[9px] sm:text-[10px] font-mono bg-red-500/20 text-red-300 px-2 sm:px-2.5 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">Issues</span>
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <Map
              initialViewState={{
                longitude: defaultLng,
                latitude: defaultLat,
                zoom: 12
              }}
              mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
              style={{ width: '100%', height: '100%' }}
            >
              {/* Real Issue Markers with captured coordinates */}
              {activeIssuePoints.map((issue) => (
                <Marker key={issue.id} longitude={issue.locationLng} latitude={issue.locationLat} anchor="bottom">
                  <div 
                    onClick={() => setSelectedIssueId(issue.id)}
                    className="flex flex-col items-center animate-pulse cursor-pointer group"
                    title="Click to view issue details & full status"
                  >
                    <span className="text-[10px] font-mono font-bold mb-1 bg-[#030304]/80 group-hover:bg-[#F7931A] text-[#94A3B8] group-hover:text-black px-2 py-0.5 rounded border border-[#1E293B] backdrop-blur-md max-w-[140px] truncate transition-colors">{issue.title}</span>
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-white/20 group-hover:scale-125 transition-transform"></div>
                  </div>
                </Marker>
              ))}
              
              {/* Real User Markers */}
              {activeUserPoints.map((u) => (
                <Marker key={u.id} longitude={u.lng!} latitude={u.lat!} anchor="center">
                  <div className="w-8 h-8 rounded-full border border-[#F7931A] bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.6)] cursor-pointer">
                    <span className="text-[10px] font-bold text-white tracking-widest">{u.name?.substring(0,2).toUpperCase()}</span>
                  </div>
                </Marker>
              ))}
            </Map>

            {totalLocatedPoints === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-white/40">
                <MapPin size={24} className="mb-2 text-white/20" />
                <p className="text-xs font-medium">No live GPS coordinates captured</p>
                <p className="text-[11px] text-white/30 mt-0.5">Active issues with GPS coordinates will appear here.</p>
              </div>
            )}
            
            {/* UI Overlay on map */}
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 glass-card !p-2 sm:!p-3 text-[10px] sm:text-xs">
              <p className="text-[#94A3B8] mb-0.5 font-mono uppercase tracking-widest text-[9px] sm:text-[10px]">Tracking Status</p>
              <div className="flex items-center gap-1.5 sm:gap-2 font-mono text-[#F7931A]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7931A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EA580C]"></span>
                </span>
                LIVE NETWORK ACTIVE
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Escalations & Team */}
        <div className="space-y-4 sm:space-y-6">
          <div className="crypto-card">
            <h2 className="font-heading font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg">
              <AlertTriangle size={18} className="text-[#EA580C] shrink-0" />
              Recent Escalations
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {activeIssues.length === 0 ? (
                <p className="text-xs sm:text-sm text-white/50">No recent escalations.</p>
              ) : (
                activeIssues.slice(0, 3).map(issue => (
                  <EscalationItem 
                    key={issue.id} 
                    title={issue.title} 
                    location={issue.category || "General"} 
                    time={new Date(issue.createdAt).toLocaleDateString()} 
                    onClick={() => setSelectedIssueId(issue.id)}
                  />
                ))
              )}
            </div>
          </div>

          <div className="crypto-card">
            <h2 className="font-heading font-semibold mb-4 sm:mb-6 flex items-center gap-2 text-base sm:text-lg">
              <UsersIcon size={18} className="text-[#F7931A] shrink-0" />
              Priority Node Operators
            </h2>
            <div className="space-y-3 sm:space-y-4">
              {users.length === 0 ? (
                <p className="text-xs sm:text-sm text-white/50">No team members online.</p>
              ) : (
                users.map(user => (
                  <TeamMember 
                    key={user.id} 
                    name={user.name} 
                    role={user.designations?.[0] || user.role || user.roles?.[0] || 'Member'} 
                    status="online" 
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Full Status & Image Evidence Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, trend, alert }: any) {
  return (
    <div className={`crypto-card node-accent-tl group ${alert ? 'border-[#EA580C]/50 shadow-[0_0_20px_rgba(234,88,12,0.15)]' : ''}`}>
      {alert && <div className="absolute top-0 right-0 w-24 h-24 bg-[#EA580C]/10 blur-2xl rounded-full"></div>}
      <div className="flex justify-between items-start relative z-10 gap-2">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-mono text-[#94A3B8] uppercase tracking-widest truncate">{title}</p>
          <h3 className="text-3xl sm:text-4xl font-heading font-bold mt-1.5 sm:mt-2 text-white group-hover:text-[#F7931A] transition-colors truncate">{value}</h3>
        </div>
        <div className="p-2.5 sm:p-3 bg-[#030304] rounded-lg border border-[#1E293B] group-hover:border-[#F7931A]/30 group-hover:shadow-[0_0_15px_rgba(247,147,26,0.3)] transition-all shrink-0">
          {icon}
        </div>
      </div>
      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs gap-2">
        <span className="text-[#94A3B8] font-mono text-[9px] sm:text-[10px] uppercase tracking-wide truncate">{subtitle}</span>
        <span className={`font-mono font-medium shrink-0 ${trend.startsWith('+') ? 'text-[#FFD600]' : 'text-[#F7931A]'}`}>
          {trend}
        </span>
      </div>
    </div>
  );
}

function MapMarker({ top, left, role, name, status }: any) {
  const statusColors: any = {
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    task: 'bg-blue-500',
    offline: 'bg-gray-500'
  };
  
  return (
    <div className="absolute group cursor-pointer" style={{ top, left }}>
      <div className="relative flex flex-col items-center">
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1e293b] text-xs p-2 rounded-lg border border-white/10 shadow-xl whitespace-nowrap z-10">
          <p className="font-bold">{name}</p>
          <p className="text-white/60">{role}</p>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
            <button className="bg-blue-500 hover:bg-blue-400 text-white px-2 py-1 rounded text-[10px] flex items-center gap-1">
              <PhoneCall size={10} /> Call
            </button>
          </div>
        </div>
        
        {/* Marker */}
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg relative z-0">
          <span className="text-xs font-bold text-white">{name.substring(0,2).toUpperCase()}</span>
        </div>
        <div className={`w-3 h-3 rounded-full border-2 border-[#1a1d24] absolute -bottom-1 -right-1 ${statusColors[status]}`}></div>
      </div>
    </div>
  );
}

function EscalationItem({ title, location, time, onClick }: any) {
  return (
    <div 
      onClick={onClick} 
      className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-[#F7931A]/20"
      title="Click to view details & status"
    >
      <div className="mt-1 bg-[#EA580C]/20 p-2.5 rounded-full border border-[#EA580C]/30 shadow-[0_0_10px_rgba(234,88,12,0.3)]">
        <AlertTriangle size={14} className="text-[#EA580C]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{title}</p>
        <p className="text-xs font-mono text-[#94A3B8] mt-1">{location}</p>
      </div>
      <span className="text-[10px] font-mono text-[#94A3B8]/60 ml-auto whitespace-nowrap">{time}</span>
    </div>
  );
}

function TeamMember({ name, role, status }: any) {
  const statusColors: any = {
    online: 'bg-[#FFD600]',
    busy: 'bg-[#EA580C]',
    task: 'bg-[#F7931A]',
    offline: 'bg-[#1E293B]'
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center text-white font-heading font-bold text-sm shadow-[0_0_15px_rgba(247,147,26,0.4)] group-hover:scale-105 transition-transform">
            {name.substring(0,2).toUpperCase()}
          </div>
          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0F1115] ${statusColors[status]} shadow-[0_0_10px_currentColor]`}></div>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-[10px] font-mono text-[#94A3B8] tracking-widest uppercase mt-1">{role}</p>
        </div>
      </div>
      <button className="p-2.5 bg-white/5 border border-[#1E293B] rounded-full hover:bg-white/10 text-[#94A3B8] hover:text-[#F7931A] hover:border-[#F7931A]/30 transition-all">
        <PhoneCall size={14} />
      </button>
    </div>
  );
}

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

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl("/maplibre-worker.mjs");
}

export default function Dashboard() {
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
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
    }
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
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
            Organization <span className="text-gradient">Overview</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-2 tracking-wide uppercase">Real-time operational terminal</p>
        </div>
        <div className="flex gap-4">
          <button className="btn-outline">
            Generate Report
          </button>
          <button className="btn-primary">
            Assign Task
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Team" 
          value={users.length.toString()} 
          subtitle="Registered members" 
          icon={<UsersIcon className="text-[#F7931A]" size={24} />} 
          trend="0"
        />
        <StatCard 
          title="In Progress" 
          value={inProgressIssues.length.toString()} 
          subtitle="Issues being handled" 
          icon={<CheckCircle className="text-[#FFD600]" size={24} />} 
          trend="0"
        />
        <StatCard 
          title="Open Issues" 
          value={activeIssues.length.toString()} 
          subtitle="Requires attention" 
          icon={<AlertTriangle className="text-[#EA580C]" size={24} />} 
          trend="0"
          alert={criticalIssues.length > 0}
        />
        <StatCard 
          title="Avg Resolution" 
          value="--" 
          subtitle="Not enough data" 
          icon={<Clock className="text-[#94A3B8]" size={24} />} 
          trend="0"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Map Area */}
        <div className="lg:col-span-2 crypto-card !p-1 flex flex-col h-[500px] overflow-hidden">
          <div className="p-4 border-b border-[#1E293B] flex justify-between items-center bg-black/40">
            <h2 className="font-heading font-semibold flex items-center gap-2 tracking-wide text-lg">
              <MapPin size={18} className="text-[#F7931A]" />
              Live Team Location
            </h2>
            <div className="flex gap-2">
              <span className="text-[10px] font-mono bg-[#EA580C]/20 text-[#F7931A] px-2.5 py-1 rounded-full border border-[#EA580C]/30 uppercase tracking-widest">Coordinators</span>
              <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2.5 py-1 rounded-full border border-red-500/30 uppercase tracking-widest">Issues</span>
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
                  <div className="flex flex-col items-center animate-pulse cursor-pointer">
                    <span className="text-[10px] font-mono font-bold mb-1 bg-[#030304]/80 text-[#94A3B8] px-2 py-0.5 rounded border border-[#1E293B] backdrop-blur-md">{issue.title}</span>
                    <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-white/20"></div>
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
            <div className="absolute bottom-4 left-4 glass-card !p-3 text-xs">
              <p className="text-[#94A3B8] mb-1 font-mono uppercase tracking-widest text-[10px]">Tracking Status</p>
              <div className="flex items-center gap-2 font-mono text-[#F7931A]">
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
        <div className="space-y-6">
          <div className="crypto-card">
            <h2 className="font-heading font-semibold mb-6 flex items-center gap-2 text-lg">
              <AlertTriangle size={18} className="text-[#EA580C]" />
              Recent Escalations
            </h2>
            <div className="space-y-4">
              {activeIssues.length === 0 ? (
                <p className="text-sm text-white/50">No recent escalations.</p>
              ) : (
                activeIssues.slice(0, 3).map(issue => (
                  <EscalationItem key={issue.id} title={issue.title} location={issue.category || "General"} time={new Date(issue.createdAt).toLocaleDateString()} />
                ))
              )}
            </div>
          </div>

          <div className="crypto-card">
            <h2 className="font-heading font-semibold mb-6 flex items-center gap-2 text-lg">
              <UsersIcon size={18} className="text-[#F7931A]" />
              Priority Node Operators
            </h2>
            <div className="space-y-4">
              {users.length === 0 ? (
                <p className="text-sm text-white/50">No team members online.</p>
              ) : (
                users.map(user => (
                  <TeamMember key={user.id} name={user.name} role={user.role} status="online" />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, trend, alert }: any) {
  return (
    <div className={`crypto-card node-accent-tl group ${alert ? 'border-[#EA580C]/50 shadow-[0_0_20px_rgba(234,88,12,0.15)]' : ''}`}>
      {alert && <div className="absolute top-0 right-0 w-24 h-24 bg-[#EA580C]/10 blur-2xl rounded-full"></div>}
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-widest">{title}</p>
          <h3 className="text-4xl font-heading font-bold mt-2 text-white group-hover:text-[#F7931A] transition-colors">{value}</h3>
        </div>
        <div className="p-3 bg-[#030304] rounded-lg border border-[#1E293B] group-hover:border-[#F7931A]/30 group-hover:shadow-[0_0_15px_rgba(247,147,26,0.3)] transition-all">
          {icon}
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-[#1E293B] flex items-center justify-between text-xs">
        <span className="text-[#94A3B8] font-mono text-[10px] uppercase tracking-wide">{subtitle}</span>
        <span className={`font-mono font-medium ${trend.startsWith('+') ? 'text-[#FFD600]' : 'text-[#F7931A]'}`}>
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

function EscalationItem({ title, location, time }: any) {
  return (
    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-[#F7931A]/20">
      <div className="mt-1 bg-[#EA580C]/20 p-2.5 rounded-full border border-[#EA580C]/30 shadow-[0_0_10px_rgba(234,88,12,0.3)]">
        <AlertTriangle size={14} className="text-[#EA580C]" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
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

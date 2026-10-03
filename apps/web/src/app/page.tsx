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

export default function Dashboard() {
  const [issues, setIssues] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [issuesData, tasksData, usersData] = await Promise.all([
          fetchAPI('/issues'),
          fetchAPI('/tasks').catch(() => []), // Catch if tasks API is not ready
          fetchAPI('/users/team').catch(() => [])
        ]);
        setIssues(issuesData);
        setTasks(tasksData);
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

  const activeIssues = issues.filter(i => i.status !== 'RESOLVED');
  const criticalIssues = issues.filter(i => i.priority === 'HIGH' && i.status !== 'RESOLVED');
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED');
  
  // Dashboard map logic
  const activeUserPoints = users.filter(u => u.lat != null && u.lng != null);
  const activeIssuePoints = activeIssues.filter(i => i.locationLat != null && i.locationLng != null);
  const totalLocatedPoints = activeUserPoints.length + activeIssuePoints.length;

  const getMapCoordinates = (lat: number, lng: number) => {
    const allLats = [
      ...activeUserPoints.map(u => u.lat as number),
      ...activeIssuePoints.map(i => i.locationLat as number)
    ];
    const allLngs = [
      ...activeUserPoints.map(u => u.lng as number),
      ...activeIssuePoints.map(i => i.locationLng as number)
    ];

    if (allLats.length <= 1) {
      return { top: '50%', left: '50%' };
    }

    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs);
    const maxLng = Math.max(...allLngs);

    const latSpan = Math.max(maxLat - minLat, 0.005);
    const lngSpan = Math.max(maxLng - minLng, 0.005);

    const top = 82 - ((lat - minLat) / latSpan) * 64;
    const left = 18 + ((lng - minLng) / lngSpan) * 64;

    return { 
      top: `${Math.max(10, Math.min(90, top))}%`, 
      left: `${Math.max(10, Math.min(90, left))}%` 
    };
  };

  if (isLoading) {
    return <div className="p-8 text-white/50">Loading dashboard data...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Organization Overview</h1>
          <p className="text-white/60 mt-1">Real-time operational dashboard</p>
        </div>
        <div className="flex gap-3">
          <button className="glass-panel px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors">
            Generate Report
          </button>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            Assign Task
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Active Team" 
          value={users.length.toString()} 
          subtitle="Registered members" 
          icon={<UsersIcon className="text-blue-400" size={24} />} 
          trend="0"
        />
        <StatCard 
          title="Tasks in Progress" 
          value={pendingTasks.length.toString()} 
          subtitle={`${tasks.length} total tasks`} 
          icon={<CheckCircle className="text-green-400" size={24} />} 
          trend="0"
        />
        <StatCard 
          title="Open Issues" 
          value={activeIssues.length.toString()} 
          subtitle="Requires attention" 
          icon={<AlertTriangle className="text-red-400" size={24} />} 
          trend="0"
          alert={criticalIssues.length > 0}
        />
        <StatCard 
          title="Avg Resolution" 
          value="--" 
          subtitle="Not enough data" 
          icon={<Clock className="text-purple-400" size={24} />} 
          trend="0"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Map Area */}
        <div className="lg:col-span-2 glass-panel p-1 flex flex-col h-[500px]">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 rounded-t-[15px]">
            <h2 className="font-semibold flex items-center gap-2">
              <MapPin size={18} className="text-blue-400" />
              Live Team Location
            </h2>
            <div className="flex gap-2">
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/30">Coordinators</span>
              <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded-full border border-red-500/30">Issues</span>
            </div>
          </div>
          <div className="flex-1 bg-[#1a1d24] relative overflow-hidden rounded-b-[15px]">
            {/* Mock Map Background */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cartographer.png")',
              backgroundSize: '300px'
            }}></div>
            
            {/* Real Issue Markers with captured coordinates */}
            {activeIssuePoints.map((issue) => {
              const coords = getMapCoordinates(issue.locationLat, issue.locationLng);
              return (
              <div key={issue.id} className="absolute flex flex-col items-center animate-pulse" style={{ top: coords.top, left: coords.left }}>
                <div className="w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)] border-2 border-white"></div>
                <span className="text-[10px] font-bold mt-1 bg-red-500/80 px-1 rounded backdrop-blur-md">{issue.title}</span>
              </div>
            )})}
            
            {/* Real User Markers */}
            {activeUserPoints.map((u) => {
              const coords = getMapCoordinates(u.lat!, u.lng!);
              return (
              <div key={u.id} className="absolute flex flex-col items-center" style={{ top: coords.top, left: coords.left }}>
                <div className="w-6 h-6 rounded-full border-2 border-white bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <span className="text-[8px] font-bold text-white">{u.name?.substring(0,2).toUpperCase()}</span>
                </div>
              </div>
            )})}

            {totalLocatedPoints === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 text-white/40">
                <MapPin size={24} className="mb-2 text-white/20" />
                <p className="text-xs font-medium">No live GPS coordinates captured</p>
                <p className="text-[11px] text-white/30 mt-0.5">Active issues with GPS coordinates will appear here.</p>
              </div>
            )}
            
            {/* UI Overlay on map */}
            <div className="absolute bottom-4 left-4 glass-panel p-3 text-xs">
              <p className="text-white/70 mb-1 font-medium">Tracking Status</p>
              <div className="flex items-center gap-2 text-green-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                Live Sync Active
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel: Escalations & Team */}
        <div className="space-y-6">
          <div className="glass-panel p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
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

          <div className="glass-panel p-5">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <UsersIcon size={18} className="text-blue-400" />
              Priority Team
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
    <div className={`glass-panel p-5 relative overflow-hidden ${alert ? 'ring-1 ring-red-500/50' : ''}`}>
      {alert && <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/20 blur-2xl rounded-full"></div>}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-white/60 font-medium">{title}</p>
          <h3 className="text-3xl font-bold mt-1 text-white">{value}</h3>
        </div>
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          {icon}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <span className="text-white/50">{subtitle}</span>
        <span className={`font-medium ${trend.startsWith('+') ? 'text-green-400' : 'text-blue-400'} ${alert && trend.startsWith('+') ? 'text-red-400' : ''}`}>
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
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
      <div className="mt-1 bg-red-500/20 p-2 rounded-full border border-red-500/30">
        <AlertTriangle size={14} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="text-xs text-white/50">{location}</p>
      </div>
      <span className="text-[10px] text-white/40 ml-auto whitespace-nowrap">{time}</span>
    </div>
  );
}

function TeamMember({ name, role, status }: any) {
  const statusColors: any = {
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    task: 'bg-blue-500',
    offline: 'bg-gray-500'
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {name.substring(0,2).toUpperCase()}
          </div>
          <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f1115] ${statusColors[status]}`}></div>
        </div>
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-white/50">{role}</p>
        </div>
      </div>
      <button className="p-2 bg-white/5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors">
        <PhoneCall size={14} />
      </button>
    </div>
  );
}

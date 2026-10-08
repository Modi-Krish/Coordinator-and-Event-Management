"use client";

import { useEffect, useState, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { MapPin, PhoneCall, AlertTriangle, Filter, Navigation2 } from "lucide-react";
import { useSocket } from "@/components/SocketProvider";
import { useCall } from "@/components/CallProvider";

export default function LiveMapPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { socket, isConnected } = useSocket();
  const { initiateCall } = useCall();
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // This ref keeps track of latest locations
  const locationsRef = useRef<Record<string, {lat: number, lng: number}>>({});

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);

    async function loadData() {
      try {
        const [issuesData, teamData] = await Promise.all([
          fetchAPI('/issues').catch(() => []),
          fetchAPI('/users/team').catch(() => [])
        ]);
        setIssues(issuesData.filter((i: any) => i.status !== 'RESOLVED' && i.status !== 'CLOSED'));
        
        // Map backend users to UI format without fake demo locations
        const formattedUsers = teamData.map((u: any) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          status: u.status?.toLowerCase() || 'offline',
          lat: null,
          lng: null,
        }));
        
        setUsers(formattedUsers);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  // Location Tracking & Emitting
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Start emitting my location if I'm a coordinator/field worker
    let watchId: number;
    if (navigator.geolocation && currentUser?.role !== 'MANAGER') {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          socket.emit('location:update', { lat, lng, accuracy: position.coords.accuracy });
          locationsRef.current[currentUser.id] = { lat, lng };
          setUsers(prev => prev.map(u => 
            u.id === currentUser.id ? { ...u, lat, lng, status: 'online' } : u
          ));
        },
        (err) => console.warn('Location error:', err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    // Listen for team location updates
    const handleLocationUpdate = (data: any) => {
      locationsRef.current[data.userId] = { lat: data.lat, lng: data.lng };
      // Trigger a re-render by updating users array
      setUsers(prev => prev.map(u => 
        u.id === data.userId ? { ...u, lat: data.lat, lng: data.lng, status: 'online' } : u
      ));
    };

    socket.on('location:update', handleLocationUpdate);

    const handleIssueNew = (issue: any) => {
      if (issue.locationLat != null && issue.locationLng != null) {
        setIssues(prev => [issue, ...prev]);
      }
    };
    const handleIssueUpdated = (issue: any) => {
      setIssues(prev => {
        if (issue.status === 'RESOLVED' || issue.status === 'CLOSED') {
          return prev.filter(i => i.id !== issue.id);
        }
        const exists = prev.some(i => i.id === issue.id);
        if (exists) {
          return prev.map(i => i.id === issue.id ? issue : i);
        } else if (issue.locationLat != null && issue.locationLng != null) {
          return [issue, ...prev];
        }
        return prev;
      });
    };

    socket.on('issue:new', handleIssueNew);
    socket.on('issue:updated', handleIssueUpdated);

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      socket.off('location:update', handleLocationUpdate);
      socket.off('issue:new', handleIssueNew);
      socket.off('issue:updated', handleIssueUpdated);
    };
  }, [socket, isConnected, currentUser]);

  const activeUserPoints = users.filter(u => u.lat != null && u.lng != null);
  const activeIssuePoints = issues.filter(i => i.locationLat != null && i.locationLng != null);
  const totalLocatedPoints = activeUserPoints.length + activeIssuePoints.length;

  // Dynamically calculate coordinate projection based on active coordinates
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

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-7xl mx-auto">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
            Live <span className="text-gradient">Map</span>
          </h1>
          <p className="text-[#94A3B8] font-mono text-sm mt-2 tracking-wide uppercase">Real-time geospatial overview</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-[13px]">
            <Filter size={16} className="mr-2" /> Filters
          </button>
        </div>
      </header>

      <div className="flex-1 crypto-card !p-1 flex flex-col overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-[#030304]/80 backdrop-blur-md p-4 rounded-xl border border-[#1E293B] text-[10px] font-mono uppercase tracking-widest space-y-3 shadow-[0_0_20px_rgba(247,147,26,0.1)]">
            <h3 className="font-bold text-[#F7931A] border-b border-[#1E293B] pb-2 mb-2">Legend</h3>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-[#EA580C] to-[#F7931A] shadow-[0_0_10px_rgba(247,147,26,0.5)]"></div> Coordinators ({activeUserPoints.length})
            </div>
            <div className="flex items-center gap-2 text-[#94A3B8]">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div> Open Issues ({activeIssuePoints.length})
            </div>
            <div className="flex items-center gap-2 text-[#FFD600]">
              <div className="w-2 h-2 rounded-full bg-[#FFD600] animate-ping"></div> Live Sync Active
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#0F1115] relative overflow-hidden rounded-lg">
          {/* Mock Map Background */}
          <div className="absolute inset-0 opacity-10 bg-grid-pattern"></div>

          {/* Active Users with Real Location */}
          {activeUserPoints.map(u => {
            const coords = getMapCoordinates(u.lat!, u.lng!);
            return (
              <MapMarker 
                key={u.id} 
                top={coords.top} 
                left={coords.left} 
                role={u.role} 
                name={u.name} 
                status={u.status} 
                onCall={() => initiateCall(u.id, u.name, false)}
              />
            );
          })}

          {/* Active Issues with Real Location */}
          {activeIssuePoints.map((issue) => {
            const coords = getMapCoordinates(issue.locationLat, issue.locationLng);
            return (
            <div key={issue.id} className="absolute flex flex-col items-center animate-pulse" style={{ top: coords.top, left: coords.left }}>
              <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50">
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.8)] border-2 border-[#0F1115]"></div>
              </div>
              <span className="text-[10px] font-mono font-bold mt-2 bg-[#030304]/90 text-[#94A3B8] px-2 py-0.5 rounded border border-[#1E293B] shadow-lg backdrop-blur-md">
                {issue.title}
              </span>
            </div>
            );
          })}

          {/* Empty State when no live GPS coordinates are broadcast yet */}
          {totalLocatedPoints === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-sm z-0">
              <div className="w-16 h-16 rounded-full bg-[#EA580C]/10 border border-[#EA580C]/30 flex items-center justify-center text-[#F7931A] mb-4 shadow-[0_0_20px_rgba(234,88,12,0.2)]">
                <Navigation2 size={28} />
              </div>
              <h3 className="text-lg font-heading font-bold text-white tracking-wide">No Active Signatures</h3>
              <p className="text-xs font-mono text-[#94A3B8] max-w-sm mt-2 uppercase tracking-widest">
                Nodes broadcasting live location telemetry will appear here automatically.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MapMarker({ top, left, role, name, status, onCall }: any) {
  const statusColors: any = {
    online: 'bg-[#FFD600]',
    busy: 'bg-[#EA580C]',
    task: 'bg-[#F7931A]',
    offline: 'bg-[#1E293B]'
  };
  
  return (
    <div className="absolute group cursor-pointer" style={{ top, left }}>
      <div className="relative flex flex-col items-center">
        {/* Tooltip */}
        <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-[#030304]/90 backdrop-blur-md text-sm p-4 rounded-xl border border-[#1E293B] shadow-[0_0_30px_rgba(247,147,26,0.2)] whitespace-nowrap z-10 min-w-[150px]">
          <p className="font-heading font-bold text-white">{name}</p>
          <p className="text-[#F7931A] font-mono text-[10px] uppercase tracking-widest mt-1">{role}</p>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1E293B]">
            <button 
              onClick={onCall}
              className="flex-1 btn-primary py-2 text-[11px] tracking-widest flex items-center justify-center gap-2"
            >
              <PhoneCall size={12} /> INITIATE LINK
            </button>
          </div>
        </div>
        
        {/* Marker */}
        <div className="w-12 h-12 rounded-full border border-[#F7931A] bg-gradient-to-tr from-[#EA580C] to-[#F7931A] flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.6)] relative z-0 hover:scale-110 transition-transform">
          <span className="text-sm font-heading font-bold text-white">{name.substring(0,2).toUpperCase()}</span>
        </div>
        <div className={`w-4 h-4 rounded-full border-2 border-[#0F1115] absolute -bottom-1 -right-1 ${statusColors[status]} shadow-[0_0_10px_currentColor]`}></div>
      </div>
    </div>
  );
}

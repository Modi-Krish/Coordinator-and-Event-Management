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

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      socket.off('location:update', handleLocationUpdate);
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Live Map</h1>
          <p className="text-white/60 mt-1">Real-time geospatial overview</p>
        </div>
        <div className="flex gap-2">
          <button className="glass-panel px-4 py-2 flex items-center gap-2 text-sm font-medium hover:bg-white/10 transition-colors">
            <Filter size={16} /> Filters
          </button>
        </div>
      </header>

      <div className="flex-1 glass-panel p-1 rounded-2xl flex flex-col overflow-hidden relative">
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="glass-panel p-3 bg-black/40 backdrop-blur-md text-xs space-y-2">
            <h3 className="font-bold text-white/80 border-b border-white/10 pb-1 mb-2">Legend</h3>
            <div className="flex items-center gap-2 text-blue-300">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div> Coordinators ({activeUserPoints.length})
            </div>
            <div className="flex items-center gap-2 text-red-300">
              <div className="w-3 h-3 rounded-full bg-red-500"></div> Open Issues ({activeIssuePoints.length})
            </div>
            <div className="flex items-center gap-2 text-green-300">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Live Sync Active
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#1a1d24] relative overflow-hidden rounded-[15px]">
          {/* Mock Map Background */}
          <div className="absolute inset-0 opacity-30 mix-blend-screen" style={{
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/cartographer.png")',
            backgroundSize: '400px'
          }}></div>

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
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,1)] border-2 border-white"></div>
              </div>
              <span className="text-xs font-bold mt-1 bg-red-500/90 px-2 py-0.5 rounded shadow-lg backdrop-blur-md border border-red-400/50">
                {issue.title}
              </span>
            </div>
            );
          })}

          {/* Empty State when no live GPS coordinates are broadcast yet */}
          {totalLocatedPoints === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/20 backdrop-blur-sm z-0">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-3">
                <Navigation2 size={28} />
              </div>
              <h3 className="text-base font-semibold text-white/90">No Live Coordinates Broadcast</h3>
              <p className="text-xs text-white/50 max-w-sm mt-1">
                Active coordinators emitting live GPS and reported issues with geolocation will appear here automatically.
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
    online: 'bg-green-500',
    busy: 'bg-yellow-500',
    task: 'bg-blue-500',
    offline: 'bg-gray-500'
  };
  
  return (
    <div className="absolute group cursor-pointer" style={{ top, left }}>
      <div className="relative flex flex-col items-center">
        {/* Tooltip */}
        <div className="absolute bottom-full mb-3 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 bg-[#1e293b] text-sm p-3 rounded-xl border border-white/10 shadow-2xl whitespace-nowrap z-10 min-w-[150px]">
          <p className="font-bold text-white">{name}</p>
          <p className="text-white/60 text-xs">{role}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <button 
              onClick={onCall}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <PhoneCall size={12} /> Call
            </button>
          </div>
        </div>
        
        {/* Marker */}
        <div className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] relative z-0 hover:scale-110 transition-transform">
          <span className="text-sm font-bold text-white">{name.substring(0,2).toUpperCase()}</span>
        </div>
        <div className={`w-3.5 h-3.5 rounded-full border-2 border-[#1a1d24] absolute -bottom-1 -right-1 ${statusColors[status]}`}></div>
      </div>
    </div>
  );
}

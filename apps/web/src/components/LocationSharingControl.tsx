"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, WifiOff, Navigation, AlertTriangle, X } from "lucide-react";
import { fetchAPI } from "@/lib/api";
import { useSocket } from "@/components/SocketProvider";

type LocationStatus = "IDLE" | "REQUESTING" | "LIVE" | "PERMISSION_DENIED" | "ERROR";

interface LocationSharingControlProps {
  className?: string;
}

export function LocationSharingControl({ className = "" }: LocationSharingControlProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("IDLE");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { socket } = useSocket();

  // Load initial state from server
  useEffect(() => {
    fetchAPI("/users/me/location-sharing")
      .then(() => {}) // state loaded via user object
      .catch(() => {});
    
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setIsSharing(user.locationSharingEnabled ?? false);
        if (user.locationSharingEnabled) {
          setLocationStatus("LIVE");
        }
      } catch {}
    }
  }, []);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setLocationStatus("IDLE");
  }, []);

  const startSharing = useCallback(async () => {
    setLocationStatus("REQUESTING");
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLocationStatus("ERROR");
      return;
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    };

    const success = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      if (socket) {
        socket.emit("location:update", { lat: latitude, lng: longitude, accuracy });
        socket.emit("location:sharing_changed", { enabled: true });
      }

      setLastUpdate(new Date());
      setLocationStatus("LIVE");
      setIsSharing(true);
    };

    const fail = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setLocationStatus("PERMISSION_DENIED");
        setError("Location permission denied. Please allow location access in your browser settings.");
      } else {
        setLocationStatus("ERROR");
        setError("Unable to retrieve your location. Please try again.");
      }
      setIsSharing(false);
      // Update server state
      fetchAPI("/users/me/location-sharing", {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
      }).catch(() => {});
    };

    // Enable server-side sharing flag
    await fetchAPI("/users/me/location-sharing", {
      method: "PATCH",
      body: JSON.stringify({ enabled: true }),
    }).catch(() => {});

    watchIdRef.current = navigator.geolocation.watchPosition(success, fail, options);
  }, [socket]);

  const stopSharing = useCallback(async () => {
    stopWatching();
    setIsSharing(false);

    // Disable server-side sharing flag
    await fetchAPI("/users/me/location-sharing", {
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    }).catch(() => {});

    if (socket) {
      socket.emit("location:sharing_changed", { enabled: false });
    }

    setLastUpdate(null);
    setError(null);
  }, [stopWatching, socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  const statusConfig: Record<LocationStatus, { label: string; color: string; icon: React.ReactNode }> = {
    IDLE: {
      label: "Not sharing",
      color: "text-[#94A3B8]",
      icon: <MapPin size={14} />,
    },
    REQUESTING: {
      label: "Requesting permission...",
      color: "text-[#F7931A]",
      icon: <Navigation size={14} className="animate-pulse" />,
    },
    LIVE: {
      label: "Sharing live",
      color: "text-emerald-400",
      icon: <Navigation size={14} className="animate-bounce" />,
    },
    PERMISSION_DENIED: {
      label: "Permission denied",
      color: "text-red-400",
      icon: <AlertTriangle size={14} />,
    },
    ERROR: {
      label: "Location error",
      color: "text-red-400",
      icon: <AlertTriangle size={14} />,
    },
  };

  const config = statusConfig[locationStatus];

  return (
    <div className={`rounded-xl border border-[#1E293B] bg-[#030304]/60 p-3 sm:p-4 backdrop-blur-sm ${className}`}>
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-lg border border-[#1E293B] shrink-0 ${isSharing ? "bg-emerald-500/10 border-emerald-500/30" : "bg-[#030304]"}`}>
            <MapPin size={16} className={isSharing ? "text-emerald-400" : "text-[#94A3B8]"} />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white truncate">Location Sharing</p>
            <p className={`text-[10px] font-mono uppercase tracking-widest flex items-center gap-1.5 truncate ${config.color}`}>
              {config.icon}
              <span className="truncate">{config.label}</span>
            </p>
          </div>
        </div>

        {/* Toggle Button */}
        {!isSharing ? (
          <button
            id="start-location-sharing"
            onClick={startSharing}
            disabled={locationStatus === "REQUESTING"}
            className="btn-primary text-xs py-2 px-3 sm:px-4 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-[38px]"
          >
            {locationStatus === "REQUESTING" ? "Requesting..." : "Start Sharing"}
          </button>
        ) : (
          <button
            id="stop-location-sharing"
            onClick={stopSharing}
            className="flex items-center gap-1.5 text-xs py-2 px-3 sm:px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 hover:border-red-500/50 transition-all font-mono uppercase tracking-wider shrink-0 min-h-[38px]"
          >
            <WifiOff size={12} /> Stop Sharing
          </button>
        )}
      </div>

      {/* Live Indicator */}
      {locationStatus === "LIVE" && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <p className="text-xs text-emerald-300 font-medium">Live GPS active</p>
            {lastUpdate && (
              <p className="text-[10px] font-mono text-emerald-400/60 mt-0.5">
                Last update: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20 mt-3">
          <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Permission Denied Help */}
      {locationStatus === "PERMISSION_DENIED" && (
        <p className="text-[10px] text-[#94A3B8] mt-2">
          Enable location in browser: Settings → Privacy → Location → Allow for this site.
        </p>
      )}
    </div>
  );
}

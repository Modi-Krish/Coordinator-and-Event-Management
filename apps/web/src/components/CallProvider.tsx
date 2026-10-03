"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from './SocketProvider';
import { Phone, PhoneOff, Video, Mic, MicOff } from 'lucide-react';
import { fetchAPI } from '@/lib/api';

interface CallContextType {
  initiateCall: (targetUserId: string, targetName: string, isVideo?: boolean) => void;
  endCall: () => void;
  acceptCall: () => void;
  rejectCall: () => void;
  callState: 'IDLE' | 'RINGING' | 'IN_CALL' | 'OUTGOING';
  remoteStream: MediaStream | null;
  localStream: MediaStream | null;
  isMuted: boolean;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within a CallProvider");
  return ctx;
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected } = useSocket();
  const [callState, setCallState] = useState<'IDLE' | 'RINGING' | 'IN_CALL' | 'OUTGOING'>('IDLE');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [callerName, setCallerName] = useState('Unknown');
  const [isVideo, setIsVideo] = useState(false);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize WebRTC PeerConnection
  const initPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && targetId) {
        socket?.emit('call:signal', { targetUserId: targetId, signal: { type: 'candidate', candidate: event.candidate } });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    peerConnection.current = pc;
    return pc;
  };

  const getMedia = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get media:', err);
      return null;
    }
  };

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleSignal = async (data: any) => {
      const { fromUserId, signal, callerName: incomingName, isVideo: incomingVideo } = data;
      setTargetId(fromUserId);
      setCallerName(incomingName || 'Caller');
      
      if (signal.type === 'offer') {
        setIsVideo(incomingVideo);
        setCallState('RINGING');
        
        const pc = initPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
      } else if (signal.type === 'answer') {
        if (peerConnection.current) {
          await peerConnection.current.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } else if (signal.type === 'candidate') {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      }
    };

    const handleAccepted = async (data: any) => {
      setCallState('IN_CALL');
    };

    const handleRejected = () => {
      cleanup();
    };

    socket.on('call:signal', handleSignal);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:rejected', handleRejected);

    return () => {
      socket.off('call:signal', handleSignal);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:rejected', handleRejected);
    };
  }, [socket, isConnected, targetId]);

  const initiateCall = async (id: string, name: string, video = false) => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setTargetId(id);
    setCallerName(name);
    setIsVideo(video);
    setCallState('OUTGOING');

    const stream = await getMedia(video);
    const pc = initPeerConnection();
    
    stream?.getTracks().forEach(track => pc.addTrack(track, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket?.emit('call:signal', { 
      targetUserId: id, 
      callerName: user.name,
      isVideo: video,
      signal: offer 
    });
  };

  const acceptCall = async () => {
    const stream = await getMedia(isVideo);
    const pc = peerConnection.current;
    
    if (pc && stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket?.emit('call:signal', { targetUserId: targetId, signal: answer });
      socket?.emit('call:accept', { callerId: targetId });
      setCallState('IN_CALL');
    }
  };

  const rejectCall = () => {
    socket?.emit('call:reject', { callerId: targetId });
    cleanup();
  };

  const endCall = () => {
    // Notify peer to end call (could add a custom socket event for hangup)
    socket?.emit('call:reject', { callerId: targetId }); 
    cleanup();
  };

  const cleanup = () => {
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(t => t.stop());
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCallState('IDLE');
    setTargetId(null);
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!localStream.getAudioTracks()[0].enabled);
    }
  };

  return (
    <CallContext.Provider value={{ initiateCall, endCall, acceptCall, rejectCall, callState, remoteStream, localStream, isMuted, toggleMute }}>
      {children}
      
      {/* Global Call UI Overlay */}
      {callState !== 'IDLE' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl p-6 shadow-2xl w-full max-w-md flex flex-col items-center">
            
            {/* Visualizer / Video */}
            <div className="relative w-32 h-32 mb-6">
              <div className={`absolute inset-0 rounded-full border-4 border-blue-500/30 flex items-center justify-center overflow-hidden ${callState === 'RINGING' || callState === 'OUTGOING' ? 'animate-ping' : ''}`}>
                 <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-3xl font-bold">
                    {callerName.substring(0,2).toUpperCase()}
                 </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-1">{callerName}</h2>
            <p className="text-white/50 mb-8">
              {callState === 'RINGING' ? 'Incoming Call...' : 
               callState === 'OUTGOING' ? 'Ringing...' : 'In Call'}
            </p>

            {/* Hidden video elements for WebRTC */}
            <video ref={localVideoRef} autoPlay muted playsInline className="hidden" />
            <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />

            {/* Controls */}
            <div className="flex items-center gap-6">
              {callState === 'RINGING' && (
                <button onClick={acceptCall} className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                  <Phone size={24} className="text-white" />
                </button>
              )}
              
              {callState === 'IN_CALL' && (
                <button onClick={toggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/10 hover:bg-white/20'}`}>
                  {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              )}

              <button onClick={callState === 'RINGING' ? rejectCall : endCall} className="w-14 h-14 bg-red-500 hover:bg-red-400 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110">
                <PhoneOff size={24} className="text-white" />
              </button>
            </div>

          </div>
        </div>
      )}
    </CallContext.Provider>
  );
}

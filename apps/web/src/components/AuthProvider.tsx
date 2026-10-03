"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { UserCircle, Shield, Briefcase } from "lucide-react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const handleDemoLogin = async (role: string) => {
    setIsLoading(true);
    try {
      const email = role === 'MANAGER' ? 'manager@example.com' : 'coordinator@example.com';
      
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: "password123" })
      });
      
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
      } else {
        alert("Demo login failed. Did you run the seed script?");
      }
    } catch (e) {
      console.error("Login failed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const email = (document.getElementById('email') as HTMLInputElement).value;
      const password = (document.getElementById('password') as HTMLInputElement).value;
      
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setIsAuthenticated(true);
      } else {
        alert("Invalid credentials");
      }
    } catch (e) {
      console.error("Login failed:", e);
      alert("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center text-white/50">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
        <div className="glass-panel p-10 max-w-md w-full mx-4 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
            <UserCircle size={40} className="text-blue-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-white/60 mb-8 text-center">Log in to your account.</p>
          
          <form onSubmit={handleRealLogin} className="space-y-4 w-full mb-6">
            <div>
              <input id="email" type="email" required placeholder="Email Address" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <input id="password" type="password" required placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-bold transition-colors">
              Sign In
            </button>
          </form>

          <div className="w-full flex items-center gap-4 mb-6">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-xs text-white/40 uppercase">Or Demo Login</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>
          
          <div className="space-y-4 w-full">
            <button 
              onClick={() => handleDemoLogin('MANAGER')}
              className="w-full bg-gradient-to-r from-purple-600/20 to-purple-900/20 hover:from-purple-600/40 hover:to-purple-900/40 border border-purple-500/30 text-purple-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 group"
            >
              <Briefcase size={18} className="group-hover:scale-110 transition-transform" />
              Demo Manager (Seed)
            </button>
            
            <button 
              onClick={() => handleDemoLogin('COORDINATOR')}
              className="w-full bg-gradient-to-r from-blue-600/20 to-blue-900/20 hover:from-blue-600/40 hover:to-blue-900/40 border border-blue-500/30 text-blue-300 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-3 group"
            >
              <Shield size={18} className="group-hover:scale-110 transition-transform" />
              Demo Coordinator (Seed)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

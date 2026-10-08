"use client";

import { useState, useRef } from "react";
import { Camera, MapPin, AlertCircle, Upload, CheckCircle2 } from "lucide-react";
import { fetchAPI } from "@/lib/api";

export default function ReportIssue() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLocationCapture = () => {
    setIsLocating(true);
    setErrorMsg("");
    
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      },
      (error) => {
        setErrorMsg("Unable to retrieve your location: " + error.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");
    
    if (!location) {
      setErrorMsg("Please capture your location before submitting.");
      setIsSubmitting(false);
      return;
    }
    
    // Get the selected radio category
    const categoryInput = document.querySelector('input[name="category"]:checked') as HTMLInputElement;
    const category = categoryInput?.value || "Infrastructure";

    try {
      const issueRes = await fetchAPI('/issues', {
        method: 'POST',
        body: JSON.stringify({
          title: titleRef.current?.value,
          description: descRef.current?.value,
          category,
          priority: 'MEDIUM',
          locationLat: location.lat,
          locationLng: location.lng
        })
      });

      // Upload file if selected
      if (file && issueRes.id) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Cannot use JSON fetchAPI for FormData, doing raw fetch
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/issues/${issueRes.id}/attachments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
      }

      setIsSuccess(true);
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto mt-20 crypto-card text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-[#FFD600]/20 text-[#FFD600] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#FFD600]/30 shadow-[0_0_20px_rgba(255,214,0,0.4)]">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-heading font-bold mb-2 text-white">Issue Reported!</h2>
        <p className="text-[#94A3B8] font-mono text-[11px] mb-8 uppercase tracking-wide">
          Your issue has been successfully added to the ledger and assigned to a coordinator. You will be notified once it is verified.
        </p>
        <button 
          onClick={() => setIsSuccess(false)}
          className="btn-outline w-full"
        >
          Report Another Issue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-heading font-bold text-white tracking-tight">
          Report an <span className="text-gradient">Issue</span>
        </h1>
        <p className="text-[#94A3B8] mt-2 font-mono text-sm tracking-wide uppercase">Found a problem on campus? Let us know.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="crypto-card space-y-6">
          {/* Issue Category */}
          <div>
            <label className="block text-[11px] font-mono text-[#F7931A] uppercase tracking-widest mb-3">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Infrastructure', 'IT / Network', 'Cleanliness', 'Electrical'].map((cat) => (
                <label key={cat} className="cursor-pointer">
                  <input type="radio" name="category" value={cat} className="peer sr-only" defaultChecked={cat === 'Infrastructure'} />
                  <div className="text-center text-xs font-mono uppercase tracking-wide py-3 px-3 rounded-lg border border-[#1E293B] bg-[#030304] peer-checked:bg-[#EA580C]/20 peer-checked:border-[#EA580C]/50 peer-checked:text-[#F7931A] peer-checked:shadow-[inset_0_0_15px_rgba(234,88,12,0.3)] transition-all">
                    {cat}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Issue Title & Description */}
          <div>
            <label className="block text-[11px] font-mono text-[#F7931A] uppercase tracking-widest mb-3">Issue Title</label>
            <input 
              ref={titleRef}
              required
              type="text" 
              placeholder="E.g., Water leakage in Block A"
              className="w-full crypto-input"
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-mono text-[#F7931A] uppercase tracking-widest mb-3">Description</label>
            <textarea 
              ref={descRef}
              required
              rows={4}
              placeholder="Provide more details about the issue..."
              className="w-full crypto-input resize-none"
            ></textarea>
          </div>
        </div>

        {/* Evidence & Location */}
        <div className="crypto-card space-y-6">
          <h2 className="text-lg font-heading font-semibold flex items-center gap-2 mb-2 text-[#FFD600]">
            <AlertCircle size={18} className="text-[#FFD600]" />
            Evidence & Location
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Photo Upload */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[#1E293B] bg-[#030304] rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#F7931A]/50 transition-colors relative overflow-hidden"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,video/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                  }
                }}
              />
              {file ? (
                <>
                  <CheckCircle2 className="text-[#FFD600] mb-2 shadow-[0_0_15px_rgba(255,214,0,0.5)] rounded-full" size={32} />
                  <p className="text-xs font-mono font-medium text-[#FFD600] truncate w-full px-4">{file.name}</p>
                  <p className="text-[10px] font-mono text-[#94A3B8] mt-1 uppercase">Tap to change</p>
                </>
              ) : (
                <>
                  <Camera className="text-[#94A3B8] mb-2" size={32} />
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">Upload Photo</p>
                  <p className="text-[10px] font-mono text-[#94A3B8]/60 mt-1 uppercase">Tap to select a file</p>
                </>
              )}
            </div>

            {/* Location Capture */}
            <div 
              onClick={handleLocationCapture}
              className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                location 
                  ? 'border-[#FFD600]/50 bg-[#FFD600]/10 hover:bg-[#FFD600]/20' 
                  : 'border-[#1E293B] bg-[#030304] hover:border-[#EA580C]/50'
              }`}
            >
              {isLocating ? (
                <div className="w-8 h-8 border-4 border-[#EA580C] border-t-transparent rounded-full animate-spin mb-2 shadow-[0_0_15px_rgba(234,88,12,0.5)]"></div>
              ) : location ? (
                <CheckCircle2 className="text-[#FFD600] mb-2 shadow-[0_0_15px_rgba(255,214,0,0.5)] rounded-full" size={32} />
              ) : (
                <MapPin className="text-[#EA580C] mb-2" size={32} />
              )}
              
              <p className={`text-[11px] font-mono uppercase tracking-wider ${location ? 'text-[#FFD600]' : 'text-[#94A3B8]'}`}>
                {isLocating ? 'Locating...' : location ? 'Location Captured' : 'Capture Location'}
              </p>
              
              {!isLocating && (
                <p className={`text-[10px] font-mono uppercase mt-1 ${location ? 'text-[#FFD600]/60' : 'text-[#94A3B8]/60'}`}>
                  {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'GPS is highly recommended'}
                </p>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-[#EA580C]/10 border border-[#EA580C]/20 text-[#EA580C] p-4 rounded-lg flex items-center gap-3 shadow-[0_0_20px_rgba(234,88,12,0.2)] animate-in fade-in zoom-in">
            <AlertCircle size={20} />
            <p className="text-xs font-mono font-bold uppercase tracking-wider">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn-primary w-full py-4 text-base tracking-widest flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <span className="animate-pulse">Validating Proof of Work...</span>
          ) : (
            <>
              <Upload size={20} />
              SUBMIT TO LEDGER
            </>
          )}
        </button>
      </form>
    </div>
  );
}

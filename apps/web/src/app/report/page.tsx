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
      <div className="max-w-md mx-auto mt-20 glass-panel p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-white">Issue Reported!</h2>
        <p className="text-white/60 mb-6">
          Your issue has been successfully reported and assigned to a coordinator. You will be notified once it is resolved.
        </p>
        <button 
          onClick={() => setIsSuccess(false)}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-medium transition-colors"
        >
          Report Another Issue
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Report an Issue</h1>
        <p className="text-white/60 mt-1">Found a problem on campus? Let us know.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass-panel p-6 space-y-5">
          {/* Issue Category */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Infrastructure', 'IT / Network', 'Cleanliness', 'Electrical'].map((cat) => (
                <label key={cat} className="cursor-pointer">
                  <input type="radio" name="category" value={cat} className="peer sr-only" defaultChecked={cat === 'Infrastructure'} />
                  <div className="text-center text-sm py-2 px-3 rounded-lg border border-white/10 bg-white/5 peer-checked:bg-blue-500/20 peer-checked:border-blue-500/50 peer-checked:text-blue-400 transition-all">
                    {cat}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Issue Title & Description */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Issue Title</label>
            <input 
              ref={titleRef}
              required
              type="text" 
              placeholder="E.g., Water leakage in Block A"
              className="w-full glass-input px-4 py-3 text-white placeholder-white/30"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Description</label>
            <textarea 
              ref={descRef}
              required
              rows={4}
              placeholder="Provide more details about the issue..."
              className="w-full glass-input px-4 py-3 text-white placeholder-white/30 resize-none"
            ></textarea>
          </div>
        </div>

        {/* Evidence & Location */}
        <div className="glass-panel p-6 space-y-5">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <AlertCircle size={18} className="text-purple-400" />
            Evidence & Location
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Photo Upload */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-white/5 transition-colors bg-black/10 relative overflow-hidden"
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
                  <CheckCircle2 className="text-green-400 mb-2" size={32} />
                  <p className="text-sm font-medium text-green-400 truncate w-full px-4">{file.name}</p>
                  <p className="text-xs text-white/40 mt-1">Tap to change</p>
                </>
              ) : (
                <>
                  <Camera className="text-white/40 mb-2" size={32} />
                  <p className="text-sm font-medium text-white/80">Upload Photo</p>
                  <p className="text-xs text-white/40 mt-1">Tap to select a file</p>
                </>
              )}
            </div>

            {/* Location Capture */}
            <div 
              onClick={handleLocationCapture}
              className={`border-2 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                location 
                  ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20' 
                  : 'border-dashed border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
              }`}
            >
              {isLocating ? (
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              ) : location ? (
                <CheckCircle2 className="text-green-400 mb-2" size={32} />
              ) : (
                <MapPin className="text-blue-400 mb-2" size={32} />
              )}
              
              <p className={`text-sm font-medium ${location ? 'text-green-400' : 'text-blue-400'}`}>
                {isLocating ? 'Locating...' : location ? 'Location Captured' : 'Capture Location'}
              </p>
              
              {!isLocating && (
                <p className={`text-xs mt-1 ${location ? 'text-green-400/60' : 'text-blue-400/60'}`}>
                  {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'GPS is highly recommended'}
                </p>
              )}
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Submit */}
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span className="animate-pulse">Submitting...</span>
          ) : (
            <>
              <Upload size={20} />
              Submit Issue
            </>
          )}
        </button>
      </form>
    </div>
  );
}

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-6rem)] w-full flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="relative">
        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
        <Loader2 size={48} className="text-blue-500 animate-spin relative z-10" />
      </div>
      <h3 className="mt-6 text-xl font-medium text-white/80">Loading...</h3>
      <p className="mt-2 text-sm text-white/40">Fetching latest data from coordinator</p>
    </div>
  );
}

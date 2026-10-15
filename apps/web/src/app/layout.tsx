import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/components/AuthProvider";
import { SocketProvider } from "@/components/SocketProvider";
import { CallProvider } from "@/components/CallProvider";

export const metadata: Metadata = {
  title: "Real-Time Coordinator",
  description: "Organizational field issue and task management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="relative bg-[#030304] text-white">
        {/* Background Layers */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-grid-pattern opacity-40"></div>
          <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#F7931A] opacity-10 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-[#EA580C] opacity-10 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row h-screen h-[100dvh] w-full overflow-hidden">
        <AuthProvider>
          <SocketProvider>
            <CallProvider>
              <div className="flex flex-col md:flex-row h-full w-full overflow-hidden min-w-0">
                <Sidebar />
                <main className="flex-1 min-w-0 overflow-y-auto p-3.5 sm:p-5 md:p-8">
                  {children}
                </main>
              </div>
            </CallProvider>
          </SocketProvider>
        </AuthProvider>
        </div>
      </body>
    </html>
  );
}

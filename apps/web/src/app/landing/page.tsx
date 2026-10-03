"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart2, Bell, CheckCircle2, Navigation, Shield, Zap, PhoneCall, AlertTriangle } from "lucide-react";

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="landing-body min-h-screen text-[#1A2E1F] selection:bg-[#6B4EFF] selection:text-white font-sans overflow-x-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=DM+Serif+Display:ital@0;1&display=swap');
        
        .landing-body {
          font-family: 'DM Sans', sans-serif;
          background:
            radial-gradient(ellipse 70% 60% at 80% 10%, rgba(180,210,185,0.55) 0%, transparent 60%),
            radial-gradient(ellipse 50% 70% at 15% 85%, rgba(210,195,170,0.4) 0%, transparent 55%),
            linear-gradient(160deg, #F5F0E8 0%, #E8EDE3 45%, #DCE8DC 100%);
          color: #1A2E1F;
        }

        h1, h2, h3, .font-serif {
          font-family: 'DM Serif Display', serif;
        }

        /* Glass Formula */
        .glass-strong {
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.68);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.9),
            inset 0 -1px 0 rgba(255,255,255,0.15),
            0 8px 32px rgba(0,0,0,0.06),
            0 2px 8px rgba(0,0,0,0.04);
        }

        .glass-mid {
          background: rgba(255,255,255,0.38);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.55);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.8),
            0 8px 24px rgba(0,0,0,0.05);
        }

        .glass-light {
          background: rgba(255,255,255,0.26);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.42);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            0 4px 12px rgba(0,0,0,0.04);
        }

        /* Nav */
        .nav-wrap { position: sticky; top: 18px; z-index: 100; display: flex; justify-content: center; padding: 0 16px; }
        .pill-nav {
          width: 100%; max-width: 860px;
          padding: 11px 16px; border-radius: 999px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 24px rgba(26,46,31,0.06);
        }
        .nav-logo { font-family: 'DM Serif Display', serif; font-size: 19px; color: #1A2E1F; }
        .nav-logo em { font-style: italic; color: #6B4EFF; }
        .nav-links { display: flex; gap: 4px; }
        @media (max-width: 640px) { .nav-links { display: none; } }
        .nav-links a {
          font-size: 13.5px; font-weight: 500; color: #7A8C7C;
          text-decoration: none; padding: 6px 13px; border-radius: 999px;
          transition: color 150ms, background 150ms;
        }
        .nav-links a:hover { color: #1A2E1F; background: rgba(255,255,255,0.5); }

        /* Buttons */
        .btn-primary {
          background: #6B4EFF; color: #fff;
          padding: 12px 22px; border-radius: 12px; font-size: 14px; font-weight: 500;
          box-shadow: 0 6px 20px rgba(107,78,255,0.32), inset 0 1px 0 rgba(255,255,255,0.2);
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-primary:hover { transform: translateY(-2px); background: #5038E0; box-shadow: 0 12px 32px rgba(107,78,255,0.38); }

        .btn-ghost {
          background: rgba(255,255,255,0.42); color: #1A2E1F;
          padding: 11px 20px; border-radius: 12px; font-size: 14px; font-weight: 500;
          border: 1px solid rgba(255,255,255,0.65);
          backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          transition: transform 180ms ease, background 180ms ease;
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        }
        .btn-ghost:hover { transform: translateY(-2px); background: rgba(255,255,255,0.58); }
        
        .btn-accent-ghost {
          background: rgba(107,78,255,0.10); color: #6B4EFF;
          padding: 11px 20px; border-radius: 12px; font-size: 14px; font-weight: 500;
          border: 1px solid rgba(107,78,255,0.25);
          transition: transform 180ms ease, background 180ms ease;
        }
        .btn-accent-ghost:hover { transform: translateY(-2px); background: rgba(107,78,255,0.16); }

        /* Typography */
        .text-body { color: #7A8C7C; line-height: 1.72; }
        .text-eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #6B4EFF; }

        /* Animated Ring */
        .ring-svg { transform: rotate(-90deg); }
        .ring-fill {
          animation: drawRing 1.4s cubic-bezier(0.4, 0, 0.2, 1) 0.4s forwards;
        }
        @keyframes drawRing {
          to { stroke-dashoffset: 32.64; } /* 408 * (1 - 0.92) for 92% */
        }

        /* Bento Grid */
        .bento {
          display: grid;
          grid-template-columns: 1.4fr 1fr 1fr;
          grid-template-rows: auto auto;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .bento { grid-template-columns: 1fr; }
          .bento-card.tall { grid-row: auto; }
          .bento-card.wide { grid-column: auto; }
        }
        .bento-card {
          border-radius: 20px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }
        .bento-card:hover { transform: translateY(-2px); }
        .bento-card.tall { grid-row: span 2; }
        .bento-card.wide { grid-column: span 2; flex-direction: row; align-items: center; justify-content: space-between; }

        /* Pricing */
        .toggle { width: 48px; height: 26px; background: rgba(26,46,31,0.1); border-radius: 999px; cursor: pointer; position: relative; transition: background 200ms; }
        .toggle.on { background: #6B4EFF; }
        .toggle-thumb { width: 20px; height: 20px; background: #fff; border-radius: 50%; position: absolute; top: 3px; left: 3px; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: transform 200ms ease; }
        .toggle.on .toggle-thumb { transform: translateX(22px); }

        .plan { border-radius: 24px; padding: 32px; flex: 1; transition: transform 180ms; }
        .plan:hover { transform: translateY(-4px); }
        .plan-featured { background: #1A2E1F; border: none; color: #fff; box-shadow: 0 20px 40px rgba(0,0,0,0.15); }
        .plan-featured .text-body { color: rgba(255,255,255,0.7); }
        .plan-featured .text-eyebrow { color: #A78BFA; }

        /* Animations */
        .fade-in-up { opacity: 0; animation: fadeInUp 0.8s ease forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        /* Bar Chart */
        .bar-animate { transform: scaleY(0); transform-origin: bottom; animation: scaleY 1s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards; }
        @keyframes scaleY { to { transform: scaleY(1); } }
        .progress-animate { transform: scaleX(0); transform-origin: left; animation: scaleX 1s cubic-bezier(0.4, 0, 0.2, 1) 0.5s forwards; }
        @keyframes scaleX { to { transform: scaleX(1); } }
      `}} />

      {/* Navigation */}
      <div className="nav-wrap">
        <nav className="pill-nav">
          <div className="nav-logo">Civic<em>Track</em></div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#dashboard">Dashboard</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="flex gap-2">
            <Link href="/" className="btn-ghost" style={{ padding: '8px 16px', fontSize: '13px' }}>Sign in</Link>
            <Link href="/" className="btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>Launch App</Link>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="max-w-[1000px] mx-auto px-6 pt-24 pb-20 text-center">
        <div className="fade-in-up" style={{ animationDelay: '0.1s' }}>
          <span className="text-eyebrow mb-4 block">The modern command center</span>
          <h1 className="text-[clamp(38px,5.5vw,64px)] leading-[1.05] tracking-[-0.02em] mb-6">
            Your operations,<br/><em>in full view.</em>
          </h1>
          <p className="text-body text-[16px] max-w-[500px] mx-auto mb-10">
            Real-time issue tracking, live field coordinator GPS monitoring, and automated hierarchical escalations in one beautiful interface.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/" className="btn-primary w-full sm:w-auto">Start Operations <ArrowRight size={16}/></Link>
            <Link href="#demo" className="btn-ghost w-full sm:w-auto">Watch demo</Link>
          </div>
          <p className="text-[12px] text-[#7A8C7C] mt-4 font-medium">No credit card required · Instant setup</p>
        </div>
      </section>

      {/* Hero Dashboard Preview */}
      <section className="max-w-[1100px] mx-auto px-6 mb-32">
        <div className="glass-strong rounded-[28px] p-2 fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="glass-light rounded-[24px] p-8 md:p-12 flex flex-col md:flex-row gap-12 items-center">
            
            {/* Left: Animated Data Ring */}
            <div className="relative flex flex-col items-center">
              <div className="relative w-[160px] h-[160px] flex items-center justify-center">
                <svg className="ring-svg absolute inset-0" width="160" height="160" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="65" fill="none" stroke="rgba(26,46,31,0.08)" strokeWidth="8"/>
                  <circle cx="80" cy="80" r="65" fill="none" stroke="#6B4EFF" strokeWidth="8" strokeLinecap="round" strokeDasharray="408" strokeDashoffset="408" className="ring-fill"/>
                </svg>
                <div className="text-center">
                  <div className="font-serif text-[34px] tracking-[-0.02em] leading-none text-[#1A2E1F]">92%</div>
                  <div className="text-[11px] text-[#7A8C7C] font-medium mt-1">RESOLUTION</div>
                </div>
              </div>
              <div className="mt-8 w-full max-w-[200px] space-y-4">
                <div className="flex justify-between items-center text-[13px] border-b border-[#1A2E1F]/10 pb-2">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span><span className="text-[#3D4F3F]">Critical</span></div>
                  <span className="font-medium">12 active</span>
                </div>
                <div className="flex justify-between items-center text-[13px] border-b border-[#1A2E1F]/10 pb-2">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span><span className="text-[#3D4F3F]">High</span></div>
                  <span className="font-medium">45 active</span>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3AB07A]"></span><span className="text-[#3D4F3F]">Resolved</span></div>
                  <span className="font-medium">1,204 total</span>
                </div>
              </div>
            </div>

            {/* Right: Live Data Feed */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-mid p-5 rounded-[16px]">
                <p className="text-eyebrow mb-1">Avg Response</p>
                <h3 className="font-serif text-[28px] leading-tight">14<span className="text-[18px] text-[#7A8C7C]">min</span></h3>
                <p className="text-[12px] text-[#3AB07A] font-medium mt-1">↓ 12% from last week</p>
              </div>
              <div className="glass-mid p-5 rounded-[16px]">
                <p className="text-eyebrow mb-1">Active Field Staff</p>
                <h3 className="font-serif text-[28px] leading-tight">124</h3>
                <div className="flex items-center gap-1 text-[12px] text-[#6B4EFF] font-medium mt-1">
                  <span className="relative flex h-2 w-2 mr-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6B4EFF] opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-[#6B4EFF]"></span></span>
                  Live GPS Tracking
                </div>
              </div>
              <div className="glass-light p-4 rounded-[16px] sm:col-span-2 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#6B4EFF]/10 flex items-center justify-center text-[#6B4EFF]"><Bell size={18}/></div>
                <div>
                  <p className="text-[13px] font-medium text-[#1A2E1F]">Automatic Escalation Triggered</p>
                  <p className="text-[12px] text-[#7A8C7C]">Issue #4092 routed to Regional Supervisor</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-[#1A2E1F]/5 py-12 mb-32">
        <div className="max-w-[1000px] mx-auto px-6 flex flex-wrap justify-between gap-8 text-center md:text-left">
          <div><h4 className="font-serif text-[24px]">1M+</h4><p className="text-body text-[13px]">Issues Tracked</p></div>
          <div><h4 className="font-serif text-[24px]">2.5h</h4><p className="text-body text-[13px]">Faster Resolution</p></div>
          <div><h4 className="font-serif text-[24px]">100%</h4><p className="text-body text-[13px]">Accountability</p></div>
          <div><h4 className="font-serif text-[24px]">500+</h4><p className="text-body text-[13px]">Wards Covered</p></div>
        </div>
      </section>

      {/* Bento Grid */}
      <section className="max-w-[1000px] mx-auto px-6 mb-32" id="features">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,4vw,44px)] leading-[1.15] tracking-[-0.02em]">Everything you need, <em>clarified.</em></h2>
        </div>

        <div className="bento">
          {/* Card 1: Map / Activity (Tall) */}
          <div className="glass-strong bento-card tall">
            <span className="text-eyebrow">Live Map</span>
            <h3 className="font-serif text-[22px] mt-2 mb-2">Real-time coordinates</h3>
            <p className="text-body text-[13px] mb-8">Track your field coordinators instantly. Issues are plotted dynamically on an interactive canvas.</p>
            
            <div className="mt-auto h-[140px] flex items-end gap-2 justify-center">
              {/* Mini bar chart */}
              <div className="w-8 bg-[#6B4EFF] rounded-t-sm h-[40%] bar-animate" style={{animationDelay: '0.1s'}}></div>
              <div className="w-8 bg-[#6B4EFF] rounded-t-sm h-[60%] bar-animate" style={{animationDelay: '0.2s'}}></div>
              <div className="w-8 bg-[#6B4EFF] rounded-t-sm h-[30%] bar-animate" style={{animationDelay: '0.3s'}}></div>
              <div className="w-8 bg-[#6B4EFF] rounded-t-sm h-[80%] bar-animate" style={{animationDelay: '0.4s'}}></div>
              <div className="w-8 bg-[#6B4EFF] rounded-t-sm h-[100%] bar-animate" style={{animationDelay: '0.5s'}}></div>
            </div>
          </div>

          {/* Card 2: Hierarchy */}
          <div className="glass-mid bento-card">
            <span className="text-eyebrow">Hierarchy</span>
            <h3 className="font-serif text-[20px] mt-2 mb-2">Deep Organization</h3>
            <p className="text-body text-[13px] mb-6">Assign staff to supervisors. Permissions flow automatically downwards.</p>
            <div className="space-y-3 mt-auto">
              <div>
                <div className="flex justify-between text-[11px] font-medium mb-1"><span>Manager Setup</span><span>100%</span></div>
                <div className="h-1.5 w-full bg-[#1A2E1F]/10 rounded-full overflow-hidden"><div className="h-full bg-[#3AB07A] progress-animate" style={{animationDelay: '0.2s', width: '100%'}}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-[11px] font-medium mb-1"><span>Staff Allocation</span><span>75%</span></div>
                <div className="h-1.5 w-full bg-[#1A2E1F]/10 rounded-full overflow-hidden"><div className="h-full bg-[#6B4EFF] progress-animate" style={{animationDelay: '0.4s', width: '75%'}}></div></div>
              </div>
            </div>
          </div>

          {/* Card 3: Escalations */}
          <div className="glass-mid bento-card">
            <span className="text-eyebrow">Automation</span>
            <h3 className="font-serif text-[20px] mt-2 mb-2">Cron Escalations</h3>
            <p className="text-body text-[13px] mb-4">Issues unresolved after 2 hours are pushed up the chain.</p>
            <div className="mt-auto space-y-2">
              <div className="flex items-center gap-3 bg-[#fff]/30 p-2 rounded-lg text-[12px] border border-[#fff]/40">
                <AlertTriangle size={14} className="text-[#F59E0B]"/>
                <span className="font-medium">Escalated to Faculty</span>
              </div>
              <div className="flex items-center gap-3 bg-[#fff]/30 p-2 rounded-lg text-[12px] border border-[#fff]/40">
                <CheckCircle2 size={14} className="text-[#3AB07A]"/>
                <span className="font-medium">Verified by Manager</span>
              </div>
            </div>
          </div>

          {/* Card 4: Communication (Wide) */}
          <div className="glass-mid bento-card wide">
            <div className="max-w-[280px]">
              <span className="text-eyebrow">WebRTC</span>
              <h3 className="font-serif text-[22px] mt-2 mb-2">Instant Team Calling</h3>
              <p className="text-body text-[13px]">Integrated video and voice calls directly from the dashboard. No external links required.</p>
            </div>
            <div className="hidden sm:flex items-center justify-center w-[120px] h-[120px] rounded-full bg-[#6B4EFF]/10 border border-[#6B4EFF]/20 relative">
              <div className="absolute inset-0 rounded-full border-2 border-[#6B4EFF] border-dashed animate-[spin_10s_linear_infinite] opacity-30"></div>
              <PhoneCall size={32} className="text-[#6B4EFF]"/>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-[1000px] mx-auto px-6 mb-32">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,4vw,44px)] leading-[1.15] tracking-[-0.02em] mb-4">Simple, transparent <em>pricing.</em></h2>
          <div className="flex items-center justify-center gap-3 text-[14px] font-medium">
            <span className={!isAnnual ? "text-[#1A2E1F]" : "text-[#7A8C7C]"}>Monthly</span>
            <div className={`toggle ${isAnnual ? 'on' : ''}`} onClick={() => setIsAnnual(!isAnnual)}>
              <div className="toggle-thumb"></div>
            </div>
            <span className={isAnnual ? "text-[#1A2E1F]" : "text-[#7A8C7C]"}>Annually <span className="text-[#3AB07A] text-[11px] px-2 py-0.5 bg-[#3AB07A]/10 rounded-full ml-1">Save 20%</span></span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-stretch">
          {/* Basic */}
          <div className="plan glass-mid flex flex-col">
            <span className="text-eyebrow">Starter</span>
            <div className="font-serif text-[44px] tracking-[-0.04em] mt-4 mb-2">${isAnnual ? '0' : '0'}<span className="text-[16px] text-body font-sans">/mo</span></div>
            <p className="text-body text-[13px] mb-8">Perfect for small civic teams just getting started.</p>
            <ul className="space-y-3 mb-8 text-[14px] font-medium flex-1">
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> 10 Team Members</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> Basic Issue Tracking</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> 24hr Support SLA</li>
            </ul>
            <button className="btn-ghost w-full">Get Started</button>
          </div>

          {/* Pro (Featured) */}
          <div className="plan plan-featured flex flex-col relative md:scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#6B4EFF] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">Most Popular</div>
            <span className="text-eyebrow text-[#A78BFA]">Professional</span>
            <div className="font-serif text-[52px] tracking-[-0.04em] mt-4 mb-2 text-white">${isAnnual ? '49' : '59'}<span className="text-[16px] text-[#A78BFA] font-sans">/mo</span></div>
            <p className="text-[13px] text-white/70 mb-8">Advanced operations for active municipalities.</p>
            <ul className="space-y-3 mb-8 text-[14px] font-medium flex-1 text-white/90">
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#A78BFA] mt-0.5"/> Unlimited Team Members</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#A78BFA] mt-0.5"/> Live GPS Map Tracking</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#A78BFA] mt-0.5"/> Automated Escalations</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#A78BFA] mt-0.5"/> WebRTC Voice/Video Calling</li>
            </ul>
            <button className="btn-primary w-full bg-white text-[#1A2E1F] hover:bg-[#F5F0E8] hover:shadow-xl shadow-[inset_0_1px_0_rgba(255,255,255,1)]">Start 14-day free trial</button>
          </div>

          {/* Enterprise */}
          <div className="plan glass-mid flex flex-col">
            <span className="text-eyebrow">Enterprise</span>
            <div className="font-serif text-[44px] tracking-[-0.04em] mt-4 mb-2">Custom</div>
            <p className="text-body text-[13px] mb-8">Dedicated infrastructure for state-level deployments.</p>
            <ul className="space-y-3 mb-8 text-[14px] font-medium flex-1">
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> Custom S3 Storage</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> Advanced Audit Logging</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-[#6B4EFF] mt-0.5"/> Dedicated Success Manager</li>
            </ul>
            <button className="btn-ghost w-full">Contact Sales</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1A2E1F]/10 py-12 text-center text-[13px] text-body">
        <div className="nav-logo mb-4">Civic<em>Track</em></div>
        <p>© 2026 CivicTrack. All rights reserved.</p>
      </footer>
    </div>
  );
}

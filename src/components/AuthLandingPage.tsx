import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Hls from 'hls.js';
import { ArrowRight, X, User, Mail, Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SchoolLogo } from './SchoolLogo';

interface AuthLandingPageProps {
  onViewProjects?: () => void;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({ onViewProjects }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoSrc = 'https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8';

  const { loginWithSchoolEmail, loginAdmin } = useAuth();

  // Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<'user' | 'admin'>('user');

  // Staff login fields
  const [fullName, setFullName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [isUserSubmitting, setIsUserSubmitting] = useState(false);

  // Admin login fields
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminErrorMsg, setAdminErrorMsg] = useState<string | null>(null);
  const [isAdminSubmitting, setIsAdminSubmitting] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      });
      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      });
    }
  }, []);

  // Submit staff login
  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg(null);

    const cleanName = fullName.trim();
    let cleanPrefix = emailPrefix.trim().toLowerCase();

    if (!cleanName) {
      setUserErrorMsg('กรุณากรอกชื่อ-นามสกุล');
      return;
    }

    if (!cleanPrefix) {
      setUserErrorMsg('กรุณากรอกอีเมลโรงเรียน');
      return;
    }

    if (cleanPrefix.includes('@')) {
      cleanPrefix = cleanPrefix.split('@')[0];
    }

    const fullEmail = `${cleanPrefix}@cmc.ac.th`;

    setIsUserSubmitting(true);
    const res = loginWithSchoolEmail(fullEmail, cleanName);

    if (res.success) {
      setIsLoginModalOpen(false);
    } else {
      setUserErrorMsg(res.message || 'เข้าสู่ระบบไม่สำเร็จ');
      setIsUserSubmitting(false);
    }
  };

  // Submit admin login
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErrorMsg(null);

    const cleanUser = adminUsername.trim();
    const cleanPass = adminPassword.trim();

    if (!cleanUser) {
      setAdminErrorMsg('กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    if (!cleanPass) {
      setAdminErrorMsg('กรุณากรอกรหัสผ่าน');
      return;
    }

    setIsAdminSubmitting(true);
    const res = loginAdmin(cleanUser, cleanPass);

    if (res.success) {
      setIsLoginModalOpen(false);
    } else {
      setAdminErrorMsg(res.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      setIsAdminSubmitting(false);
    }
  };

  const openLogin = (tab: 'user' | 'admin' = 'user') => {
    setLoginTab(tab);
    setUserErrorMsg(null);
    setAdminErrorMsg(null);
    setIsLoginModalOpen(true);
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&display=swap');
          @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600&display=swap');
        `}
      </style>

      <div className="relative min-h-screen w-full bg-black text-white overflow-hidden flex flex-col justify-between selection:bg-[#3054ff] selection:text-white">
        
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0">
          <video
            ref={videoRef}
            className="object-cover w-full h-full opacity-60"
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080"
          />
        </div>

        {/* Video Overlay */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-0"></div>

        {/* Decorative Gradients */}
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/20 blur-[120px] mix-blend-screen z-0 rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] mix-blend-screen z-0 rounded-full pointer-events-none"></div>

        {/* Navbar */}
        <nav className="fixed top-0 w-full z-50 bg-transparent px-6 py-4 flex items-center justify-between pointer-events-none">
          <div className="flex-1"></div>
        </nav>

        {/* Hero Section Container */}
        <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center mt-20 pt-24 px-4 space-y-12 my-auto">
          
          {/* Main Headline */}
          <motion.h1
            className="text-6xl sm:text-8xl lg:text-[136px] font-semibold leading-[0.9] tracking-tighter bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent select-none"
            style={{ fontFamily: "'Instrument Sans', sans-serif" }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            PRO Tracking CMC
          </motion.h1>

          {/* Subheadline (จัดโรงเรียนเชียงใหม่คริสเตียน ให้อยู่ด้านใต้) */}
          <motion.div
            className="max-w-xl flex flex-col space-y-2 text-lg sm:text-[20px] leading-[1.65] text-white opacity-70"
            style={{ fontFamily: "'Sarabun', 'Instrument Sans', sans-serif" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <p>ระบบจัดการและติดตามผลการดำเนินโครงการ</p>
            <p className="font-medium">โรงเรียนเชียงใหม่คริสเตียน (Chiang Mai Christian School)</p>
          </motion.div>

          {/* CTA Buttons (มีเพียงปุ่ม เข้าสู่ระบบ กับดูรายละเอียดโครงการ) */}
          <motion.div
            className="flex flex-col items-center gap-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {/* Primary Button: เข้าสู่ระบบ */}
            <button
              onClick={() => openLogin('user')}
              className="group flex items-center pl-6 pr-2 py-2 rounded-full bg-white transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] cursor-pointer"
            >
              <span
                className="font-medium text-lg text-[#0a0400] mr-4"
                style={{ fontFamily: "'Sarabun', sans-serif" }}
              >
                เข้าสู่ระบบ
              </span>
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#3054ff] group-hover:bg-[#2040e0] transition-colors">
                <ArrowRight className="text-white w-5 h-5" />
              </div>
            </button>

            {/* Secondary Button: ดูรายละเอียดโครงการ */}
            <button
              onClick={() => {
                if (onViewProjects) {
                  onViewProjects();
                }
              }}
              className="group text-white/70 hover:text-white backdrop-blur-sm hover:bg-white/5 px-4 py-2 rounded-lg flex items-center transition-all mt-2 cursor-pointer"
              style={{ fontFamily: "'Sarabun', sans-serif" }}
            >
              ดูรายละเอียดโครงการ
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>

        </div>

        {/* Unified Sleek Login Modal (Supporting both Staff & Admin) */}
        <AnimatePresence>
          {isLoginModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLoginModalOpen(false)}
                className="fixed inset-0 bg-black/75 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                className="relative w-full max-w-md bg-slate-900/95 text-white backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setIsLoginModalOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Modal Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto mb-3 flex items-center justify-center border border-white/10">
                    <SchoolLogo size="sm" showBorder={false} />
                  </div>
                  <h3
                    className="text-2xl font-bold tracking-tight text-white"
                    style={{ fontFamily: "'Instrument Sans', 'Sarabun', sans-serif" }}
                  >
                    PRO Tracking CMC
                  </h3>
                  <p className="text-xs text-white/60 mt-1">
                    เข้าสู่ระบบเพื่อจัดการและติดตามโครงการ
                  </p>
                </div>

                {/* Role Switcher Tabs */}
                <div className="flex rounded-xl bg-black/40 p-1 mb-6 border border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab('user');
                      setUserErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      loginTab === 'user'
                        ? 'bg-[#3054ff] text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>ผู้รับผิดชอบโครงการ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginTab('admin');
                      setAdminErrorMsg(null);
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      loginTab === 'admin'
                        ? 'bg-[#3054ff] text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>ผู้ดูแลระบบ (Admin)</span>
                  </button>
                </div>

                {/* Staff Login Form */}
                {loginTab === 'user' && (
                  <form onSubmit={handleUserSubmit} className="space-y-4">
                    {userErrorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 font-medium"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{userErrorMsg}</span>
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5 pl-1">
                        ชื่อ-นามสกุล
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="กรอกชื่อ-นามสกุล"
                          className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-white/15 text-white text-sm placeholder-white/40 border border-white/10 focus:border-[#3054ff] focus:outline-hidden transition"
                          autoFocus
                          required
                        />
                        <User className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5 pl-1">
                        อีเมลโรงเรียน
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          value={emailPrefix}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (val.includes('@')) {
                              val = val.split('@')[0];
                            }
                            setEmailPrefix(val);
                          }}
                          placeholder="ชื่อผู้ใช้อีเมล"
                          className="w-full px-4 py-3 pl-11 pr-28 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-white/15 text-white text-sm placeholder-white/40 border border-white/10 focus:border-[#3054ff] focus:outline-hidden transition"
                          required
                        />
                        <Mail className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <span className="absolute right-4 text-xs font-semibold text-white/40 pointer-events-none select-none">
                          @cmc.ac.th
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isUserSubmitting}
                      className="w-full py-3.5 rounded-xl bg-[#3054ff] hover:bg-[#2040e0] text-white font-semibold text-sm tracking-tight shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mt-4"
                    >
                      {isUserSubmitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>เข้าสู่ระบบ</span>
                      )}
                    </button>
                  </form>
                )}

                {/* Admin Login Form */}
                {loginTab === 'admin' && (
                  <form onSubmit={handleAdminSubmit} className="space-y-4">
                    {adminErrorMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 font-medium"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{adminErrorMsg}</span>
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5 pl-1">
                        ชื่อผู้ใช้งาน
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value)}
                          placeholder="ชื่อผู้ใช้งานแอดมิน"
                          className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-white/15 text-white text-sm placeholder-white/40 border border-white/10 focus:border-[#3054ff] focus:outline-hidden transition"
                          autoFocus
                          required
                        />
                        <User className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-white/80 uppercase tracking-wider mb-1.5 pl-1">
                        รหัสผ่าน
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          placeholder="รหัสผ่าน"
                          className="w-full px-4 py-3 pl-11 rounded-xl bg-white/5 hover:bg-white/10 focus:bg-white/15 text-white text-sm placeholder-white/40 border border-white/10 focus:border-[#3054ff] focus:outline-hidden transition"
                          required
                        />
                        <Lock className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAdminSubmitting}
                      className="w-full py-3.5 rounded-xl bg-[#3054ff] hover:bg-[#2040e0] text-white font-semibold text-sm tracking-tight shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mt-4"
                    >
                      {isAdminSubmitting ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span>เข้าสู่ระบบแอดมิน</span>
                      )}
                    </button>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

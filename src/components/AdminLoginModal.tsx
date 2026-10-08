import React, { useState } from 'react';
import { useProjectStore } from '../context/ProjectContext';
import { X, Lock, Key, AlertCircle, ShieldCheck } from 'lucide-react';

interface AdminLoginModalProps {
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ onClose }) => {
  const { loginAdmin } = useProjectStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const success = loginAdmin(username, password);
    if (success) {
      onClose();
    } else {
      setErrorMsg('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-md flex flex-col shadow-2xl border border-[#F9DFDF] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-[#FBEFEF] via-white to-[#FBEFEF] border-b border-[#F9DFDF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5AFAF]/40 text-[#573D3D] flex items-center justify-center shadow-2xs border border-[#F9DFDF]">
              <ShieldCheck className="w-5 h-5 text-[#b84a62]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#2D2424]">
                เข้าสู่ระบบแอดมิน
              </h2>
              <p className="text-sm text-[#573D3D]">
                สำหรับจัดการ เพิ่ม และลบโครงการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#FBEFEF] text-[#573D3D] hover:text-[#2D2424] flex items-center justify-center border border-[#F9DFDF] transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-base">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-[#2D2424] uppercase tracking-wide mb-1.5">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#573D3D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้ เช่น cmc"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] focus:ring-2 focus:ring-[#F5AFAF]/30 text-base bg-[#FCF8F8] text-[#2D2424]"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[#2D2424] uppercase tracking-wide mb-1.5">
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-[#573D3D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] focus:ring-2 focus:ring-[#F5AFAF]/30 text-base bg-[#FCF8F8] text-[#2D2424]"
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#F5AFAF] hover:bg-[#e89d9d] text-[#2D2424] font-bold text-base transition shadow-sm border border-[#F9DFDF] active:scale-[0.98]"
              id="btn-submit-admin-login"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

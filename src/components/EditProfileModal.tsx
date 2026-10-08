import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { currentUser, updateProfile, isAdmin } = useAuth();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');

  // Password change fields
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = updateProfile({
        name,
        email,
        currentPassword: isChangingPassword ? currentPassword : undefined,
        newPassword: isChangingPassword ? newPassword : undefined,
        confirmPassword: isChangingPassword ? confirmPassword : undefined,
      });

      if (res.success) {
        setSuccessMsg(res.message || 'บันทึกข้อมูลส่วนตัวสำเร็จเรียบร้อย');
        // Reset password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setIsChangingPassword(false);

        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'ไม่สามารถบันทึกข้อมูลส่วนตัวได้');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      id="modal-edit-profile"
    >
      <div className="bg-[#FCF8F8] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#F9DFDF] space-y-5 relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-[#573D3D] hover:text-[#2D2424] hover:bg-[#FBEFEF] transition cursor-pointer"
          id="btn-close-edit-profile-modal"
          title="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#F5AFAF] to-[#b84a62] text-white flex items-center justify-center font-bold text-lg shadow-md shadow-[#F5AFAF]/25 shrink-0">
            {isAdmin ? <ShieldCheck className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FBEFEF] text-[#573D3D] text-xs font-bold border border-[#F9DFDF]">
              <Sparkles className="w-3.5 h-3.5 text-[#b84a62]" />
              <span>{isAdmin ? 'บัญชีผู้ดูแลระบบ (Admin Profile)' : 'บัญชีบุคลากร (Staff Profile)'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#2D2424] leading-tight">
              แก้ไขข้อมูลส่วนตัว
            </h3>
            <p className="text-xs sm:text-sm text-[#573D3D]">
              จัดการชื่อ-นามสกุล อีเมลที่ใช้สมัคร และเปลี่ยนรหัสผ่านเข้าใช้งานระบบ
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{successMsg}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          {/* Field 1: Name */}
          <div>
            <label className="block font-bold text-[#2D2424] mb-1.5" htmlFor="input-profile-name">
              ชื่อ-นามสกุล <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#573D3D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                id="input-profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น อาจารย์สมชาย ใจดี"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] focus:ring-2 focus:ring-[#F5AFAF]/30 bg-white text-[#2D2424] text-sm font-medium"
              />
            </div>
          </div>

          {/* Field 2: Email with @cmc.ac.th auto-completion */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block font-bold text-[#2D2424]" htmlFor="input-profile-email">
                อีเมลที่ใช้สมัคร / เข้าใช้งาน <span className="text-rose-500">*</span>
              </label>
              {!isAdmin && (
                <span className="text-[11px] font-bold text-[#573D3D] bg-[#FBEFEF] px-2 py-0.5 rounded-full border border-[#F9DFDF]">
                  ลงท้ายด้วย @cmc.ac.th
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#573D3D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                id="input-profile-email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                }}
                onBlur={() => {
                  // Auto-append @cmc.ac.th if user didn't enter domain
                  if (email && !email.includes('@')) {
                    setEmail(`${email.trim()}@cmc.ac.th`);
                  }
                }}
                placeholder="เช่น 67004@cmc.ac.th"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] focus:ring-2 focus:ring-[#F5AFAF]/30 bg-white text-[#2D2424] text-sm font-medium"
              />
            </div>
            {!isAdmin && (
              <p className="text-xs text-[#573D3D] mt-1 font-medium">
                * สำหรับบุคลากรโรงเรียน เติม @cmc.ac.th อัตโนมัติเมื่อพิมพ์เสร็จ
              </p>
            )}
          </div>

          {/* Field 3: Password Change Toggle Section */}
          <div className="pt-2">
            <div className="p-4 rounded-2xl bg-[#FBEFEF] border border-[#F9DFDF] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#573D3D]" />
                  <span className="font-bold text-[#2D2424] text-xs sm:text-sm">
                    ต้องการเปลี่ยนรหัสผ่านเข้าสู่ระบบ?
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(!isChangingPassword);
                    setErrorMsg(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                    isChangingPassword
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      : 'bg-[#F5AFAF] text-[#2D2424] hover:bg-[#e89a9a]'
                  }`}
                  id="btn-toggle-change-password"
                >
                  {isChangingPassword ? 'ยกเลิกการเปลี่ยนรหัสผ่าน' : '+ เปลี่ยนรหัสผ่าน'}
                </button>
              </div>

              {/* Password inputs if toggled */}
              {isChangingPassword && (
                <div className="space-y-3 pt-2 border-t border-[#F9DFDF] animate-in fade-in slide-in-from-top-1 duration-150">
                  <div>
                    <label className="block font-semibold text-[#2D2424] mb-1" htmlFor="input-profile-current-pass">
                      รหัสผ่านปัจจุบัน
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 text-[#573D3D] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        id="input-profile-current-pass"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="รหัสผ่านเดิมที่ใช้อยู่"
                        className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] bg-white text-xs text-[#2D2424]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#573D3D] hover:text-[#2D2424] cursor-pointer"
                        title={showCurrentPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block font-semibold text-[#2D2424] mb-1" htmlFor="input-profile-new-pass">
                        รหัสผ่านใหม่ (อย่างน้อย 4 ตัว)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#573D3D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          id="input-profile-new-pass"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="รหัสผ่านใหม่"
                          className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] bg-white text-xs text-[#2D2424]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#573D3D] hover:text-[#2D2424] cursor-pointer"
                          title={showNewPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#2D2424] mb-1" htmlFor="input-profile-confirm-pass">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#573D3D] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          id="input-profile-confirm-pass"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                          className="w-full pl-9 pr-9 py-2 rounded-xl border border-[#F9DFDF] focus:outline-hidden focus:border-[#F5AFAF] bg-white text-xs text-[#2D2424]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#573D3D] hover:text-[#2D2424] cursor-pointer"
                          title={showConfirmPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F9DFDF]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#FBEFEF] hover:bg-[#F9DFDF] text-[#573D3D] font-bold text-xs sm:text-sm transition cursor-pointer"
              id="btn-cancel-edit-profile"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F5AFAF] via-[#e89a9a] to-[#b84a62] hover:opacity-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-[#F5AFAF]/25 transition flex items-center gap-2 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              id="btn-save-edit-profile"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขข้อมูล'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

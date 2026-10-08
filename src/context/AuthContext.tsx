import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserAccount, UserSession } from '../types';

interface AuthContextType {
  currentUser: UserSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => { success: boolean; message?: string };
  loginWithSchoolEmail: (email: string, name?: string) => { success: boolean; message?: string };
  loginAdmin: (identifier: string, password: string) => { success: boolean; message?: string };
  register: (name: string, email: string, password: string, confirmPassword: string) => { success: boolean; message?: string };
  updateProfile: (data: {
    name: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) => { success: boolean; message?: string };
  logout: () => void;
  registeredUsers: UserAccount[];
  needsPostLoginSync: boolean;
  completePostLoginSync: () => void;
  triggerPostLoginSyncModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_STORAGE_KEY = 'cmc_registered_users_v1';
const SESSION_STORAGE_KEY = 'cmc_user_session_v1';
const SYNC_PROMPT_STORAGE_KEY = 'cmc_needs_sheet_sync_v1';
const ALLOWED_SCHOOL_DOMAIN = '@cmc.ac.th';

// Initial pre-registered users (including cmc admin and sample teacher)
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-admin-cmc',
    name: 'ผู้ดูแลระบบ CMC (Admin)',
    email: 'admin@cmc.ac.th',
    passwordHash: '12345',
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-teacher-67004',
    name: 'อาจารย์ผู้รับผิดชอบโครงการ',
    email: '67004@cmc.ac.th',
    passwordHash: '12345',
    role: 'staff',
    createdAt: new Date().toISOString(),
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [registeredUsers, setRegisteredUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load registered users', e);
    }
    return INITIAL_USERS;
  });

  // Session is stored in sessionStorage so leaving the website/closing tab requires re-login
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      // Clear any legacy persistent login in localStorage so users must re-authenticate
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('cmc_project_is_admin');

      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load user session', e);
    }
    return null;
  });

  // Flag to indicate whether the post-login Google Sheets sync popup should be shown
  const [needsPostLoginSync, setNeedsPostLoginSync] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(SYNC_PROMPT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const completePostLoginSync = () => {
    setNeedsPostLoginSync(false);
    try {
      sessionStorage.removeItem(SYNC_PROMPT_STORAGE_KEY);
    } catch {}
  };

  const triggerPostLoginSyncModal = () => {
    setNeedsPostLoginSync(true);
    try {
      sessionStorage.setItem(SYNC_PROMPT_STORAGE_KEY, 'true');
    } catch {}
  };

  // Save registered users when changed
  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Save session to sessionStorage (cleared automatically on tab/window close)
  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(currentUser));
      if (currentUser.role === 'admin') {
        sessionStorage.setItem('cmc_project_is_admin', 'true');
      } else {
        sessionStorage.removeItem('cmc_project_is_admin');
      }
    } else {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem('cmc_project_is_admin');
    }
  }, [currentUser]);

  // 1. General User Login: Requires school email ending with @cmc.ac.th and user's full name
  const loginWithSchoolEmail = (inputEmail: string, inputName?: string): { success: boolean; message?: string } => {
    let cleanEmail = inputEmail.trim().toLowerCase();
    const cleanName = inputName?.trim() || '';

    if (!cleanEmail) {
      return {
        success: false,
        message: 'กรุณาระบุอีเมลโรงเรียนเชียงใหม่คริสเตียน (@cmc.ac.th)',
      };
    }

    // Auto-append domain if user typed only the prefix without '@'
    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}${ALLOWED_SCHOOL_DOMAIN}`;
    }

    // Must end with @cmc.ac.th
    if (!cleanEmail.endsWith(ALLOWED_SCHOOL_DOMAIN)) {
      return {
        success: false,
        message: `ต้องใช้อีเมลของโรงเรียนที่ลงท้ายด้วย ${ALLOWED_SCHOOL_DOMAIN} เท่านั้น`,
      };
    }

    // Special guard: If user enters admin account in email-only mode, prompt them to use admin login
    if (cleanEmail === 'admin@cmc.ac.th' || cleanEmail.startsWith('admin_') || cleanEmail.startsWith('cmc_admin')) {
      return {
        success: false,
        message: 'บัญชีผู้ดูแลระบบ (Admin) ต้องเข้าสู่ระบบผ่านแท็บ "เข้าสู่ระบบแอดมิน" โดยใช้รหัสผ่าน',
      };
    }

    // Find existing account or auto-create one
    const existing = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    let userName = '';
    let userId = '';

    if (existing) {
      userName = cleanName || existing.name;
      userId = existing.id;
      if (cleanName && cleanName !== existing.name) {
        setRegisteredUsers((prev) =>
          prev.map((u) => (u.id === existing.id ? { ...u, name: cleanName } : u))
        );
      }
    } else {
      // Auto-create user account without requiring prior registration
      userId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const prefix = cleanEmail.split('@')[0];
      userName = cleanName || `ครู/บุคลากร (${prefix})`;

      const newUser: UserAccount = {
        id: userId,
        name: userName,
        email: cleanEmail,
        passwordHash: '',
        role: 'staff',
        createdAt: new Date().toISOString(),
      };

      setRegisteredUsers((prev) => [...prev, newUser]);
    }

    const newSession: UserSession = {
      id: userId,
      name: userName,
      email: cleanEmail,
      role: 'staff',
      loginAt: new Date().toISOString(),
    };

    try {
      localStorage.removeItem('cmc_project_current_level');
    } catch {}

    setCurrentUser(newSession);
    triggerPostLoginSyncModal();
    return { success: true };
  };

  // 2. Admin Login: Requires username / admin email AND password
  const loginAdmin = (identifier: string, password: string): { success: boolean; message?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, message: 'กรุณากรอกชื่อผู้ใช้งานหรืออีเมลแอดมิน' };
    }
    if (!cleanPass) {
      return { success: false, message: 'กรุณากรอกรหัสผ่านแอดมิน' };
    }

    // Check special admin credentials: username 'cmc' or 'admin' or 'admin@cmc.ac.th' with password '12345'
    if (
      (cleanId === 'cmc' || cleanId === 'admin' || cleanId === 'admin@cmc.ac.th') &&
      cleanPass === '12345'
    ) {
      const adminSession: UserSession = {
        id: 'admin-session',
        name: 'ผู้ดูแลระบบ CMC',
        email: 'admin@cmc.ac.th',
        role: 'admin',
        loginAt: new Date().toISOString(),
      };
      try {
        localStorage.removeItem('cmc_project_current_level');
      } catch {}
      setCurrentUser(adminSession);
      triggerPostLoginSyncModal();
      return { success: true };
    }

    // Check in registeredUsers for any admin role with matching password
    const foundAdmin = registeredUsers.find(
      (u) =>
        u.role === 'admin' &&
        (u.email.toLowerCase() === cleanId ||
          u.email.split('@')[0].toLowerCase() === cleanId ||
          (cleanId === 'cmc' && u.email === 'admin@cmc.ac.th'))
    );

    if (foundAdmin && foundAdmin.passwordHash === cleanPass) {
      const adminSession: UserSession = {
        id: foundAdmin.id,
        name: foundAdmin.name,
        email: foundAdmin.email,
        role: 'admin',
        loginAt: new Date().toISOString(),
      };
      try {
        localStorage.removeItem('cmc_project_current_level');
      } catch {}
      setCurrentUser(adminSession);
      triggerPostLoginSyncModal();
      return { success: true };
    }

    return {
      success: false,
      message: 'ชื่อผู้ใช้งานหรือรหัสผ่านแอดมินไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
    };
  };

  const login = (identifier: string, password: string): { success: boolean; message?: string } => {
    // If admin attempt, use loginAdmin
    const cleanId = identifier.trim().toLowerCase();
    if (cleanId === 'cmc' || cleanId === 'admin' || cleanId === 'admin@cmc.ac.th') {
      return loginAdmin(cleanId, password);
    }
    const cleanPass = password.trim();

    // Check registered accounts by email or username
    const found = registeredUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        (cleanId.includes('@') && u.email.toLowerCase() === cleanId) ||
        u.email.split('@')[0].toLowerCase() === cleanId
    );

    if (!found) {
      // If it ends with @cmc.ac.th, allow login via email
      if (cleanId.endsWith(ALLOWED_SCHOOL_DOMAIN) || !cleanId.includes('@')) {
        return loginWithSchoolEmail(cleanId);
      }
      return {
        success: false,
        message: 'ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาตรวจสอบอีเมลโรงเรียน',
      };
    }

    // If password provided and account has password
    if (found.passwordHash && found.passwordHash !== cleanPass) {
      return {
        success: false,
        message: 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
      };
    }

    const newSession: UserSession = {
      id: found.id,
      name: found.name,
      email: found.email,
      role: found.role,
      loginAt: new Date().toISOString(),
    };

    try {
      localStorage.removeItem('cmc_project_current_level');
    } catch {}

    setCurrentUser(newSession);
    triggerPostLoginSyncModal();
    return { success: true };
  };

  const register = (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ): { success: boolean; message?: string } => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanConfirm = confirmPassword.trim();

    if (!cleanName) {
      return { success: false, message: 'กรุณากรอกชื่อ-นามสกุล' };
    }

    if (!cleanEmail) {
      return { success: false, message: 'กรุณากรอกอีเมลของโรงเรียน' };
    }

    // Requirement: ต้องใช้อีเมลของโรงเรียนเท่านั้นในการสมัคร (ลงท้ายด้วย @cmc.ac.th)
    if (!cleanEmail.endsWith(ALLOWED_SCHOOL_DOMAIN)) {
      return {
        success: false,
        message: `ต้องใช้อีเมลของโรงเรียนที่ลงท้ายด้วย ${ALLOWED_SCHOOL_DOMAIN} เท่านั้นในการสมัครสมาชิก`,
      };
    }

    if (!cleanPass) {
      return { success: false, message: 'กรุณากำหนดรหัสผ่าน' };
    }

    if (cleanPass.length < 4) {
      return { success: false, message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร' };
    }

    if (cleanPass !== cleanConfirm) {
      return { success: false, message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' };
    }

    // Check duplicate email
    const exists = registeredUsers.some((u) => u.email.toLowerCase() === cleanEmail);
    if (exists) {
      return {
        success: false,
        message: 'อีเมลนี้ถูกลงทะเบียนใช้งานแล้ว กรุณาเข้าสู่ระบบ',
      };
    }

    // Create new account
    const isNewAdmin = cleanEmail.startsWith('admin') || cleanEmail.startsWith('cmc_admin');
    const newUser: UserAccount = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash: cleanPass,
      role: isNewAdmin ? 'admin' : 'staff',
      createdAt: new Date().toISOString(),
    };

    setRegisteredUsers((prev) => [...prev, newUser]);

    // Auto log in after registration
    const session: UserSession = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      loginAt: new Date().toISOString(),
    };
    setCurrentUser(session);
    triggerPostLoginSyncModal();

    return { success: true };
  };

  const updateProfile = ({
    name,
    email,
    currentPassword,
    newPassword,
    confirmPassword,
  }: {
    name: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูล' };
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCurrentPass = currentPassword?.trim() || '';
    const cleanNewPass = newPassword?.trim() || '';
    const cleanConfirmPass = confirmPassword?.trim() || '';

    if (!cleanName) {
      return { success: false, message: 'กรุณากรอกชื่อ-นามสกุล' };
    }

    if (!cleanEmail) {
      return { success: false, message: 'กรุณากรอกอีเมล' };
    }

    // School domain requirement for staff
    if (currentUser.role !== 'admin' && !cleanEmail.endsWith(ALLOWED_SCHOOL_DOMAIN)) {
      return {
        success: false,
        message: `อีเมลต้องลงท้ายด้วย ${ALLOWED_SCHOOL_DOMAIN} สำหรับบุคลากรโรงเรียน`,
      };
    }

    // Check duplicate email (if email is modified)
    const duplicate = registeredUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail &&
        u.id !== currentUser.id &&
        u.email.toLowerCase() !== currentUser.email.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        message: 'อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว กรุณาใช้อีเมลอื่น',
      };
    }

    // Find current user in registered list
    const existingIndex = registeredUsers.findIndex(
      (u) =>
        u.id === currentUser.id ||
        u.email.toLowerCase() === currentUser.email.toLowerCase()
    );

    let updatedPasswordHash = '';

    // If changing password
    if (cleanNewPass) {
      if (existingIndex >= 0) {
        const existingAcc = registeredUsers[existingIndex];
        if (cleanCurrentPass && existingAcc.passwordHash !== cleanCurrentPass) {
          return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
        }
      } else if (currentUser.id === 'admin-session' && cleanCurrentPass && cleanCurrentPass !== '12345') {
        return { success: false, message: 'รหัสผ่านเดิมไม่ถูกต้อง' };
      }

      if (cleanNewPass.length < 4) {
        return { success: false, message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' };
      }

      if (cleanNewPass !== cleanConfirmPass) {
        return { success: false, message: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' };
      }

      updatedPasswordHash = cleanNewPass;
    }

    // Update registeredUsers array
    if (existingIndex >= 0) {
      const updatedList = [...registeredUsers];
      const targetUser = updatedList[existingIndex];
      updatedList[existingIndex] = {
        ...targetUser,
        name: cleanName,
        email: cleanEmail,
        passwordHash: updatedPasswordHash || targetUser.passwordHash,
      };
      setRegisteredUsers(updatedList);
    } else {
      // Create new registered entry if logged in through shorthand
      const newEntry: UserAccount = {
        id: currentUser.id,
        name: cleanName,
        email: cleanEmail,
        passwordHash: updatedPasswordHash || '12345',
        role: currentUser.role,
        createdAt: new Date().toISOString(),
      };
      setRegisteredUsers((prev) => [...prev, newEntry]);
    }

    // Update currentUser session
    const updatedSession: UserSession = {
      ...currentUser,
      name: cleanName,
      email: cleanEmail,
    };
    setCurrentUser(updatedSession);

    return {
      success: true,
      message: 'บันทึกการแก้ไขข้อมูลส่วนตัวเรียบร้อยแล้ว',
    };
  };

  const logout = () => {
    try {
      localStorage.removeItem('cmc_project_current_level');
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem('cmc_project_is_admin');
    } catch {}
    completePostLoginSync();
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin',
        login,
        loginWithSchoolEmail,
        loginAdmin,
        register,
        updateProfile,
        logout,
        registeredUsers,
        needsPostLoginSync,
        completePostLoginSync,
        triggerPostLoginSyncModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Authentication Context & State Management
 * Connects Frontend to Flask REST API backed by SQLite.
 */
import { api } from '../services/api.js';

const DEMO_FALLBACK_USERS = {
  admin: {
    uid: "demo_admin_uid",
    email: "admin@myalumni.edu",
    displayName: "Dr. Sarah Admin",
    role: "admin",
    accountStatus: "active",
    bio: "Chief Portal Administrator & Systems Overseer at MyAlumni.",
    profile: {}
  },
  faculty: {
    uid: "demo_faculty_uid",
    email: "faculty@myalumni.edu",
    displayName: "Prof. Marcus Vance",
    role: "faculty",
    accountStatus: "active",
    bio: "Professor of Computer Science & Academic Department Chair.",
    profile: {
      department: "Computer Science & Engineering",
      designation: "Associate Professor & Student Advisor"
    }
  },
  student: {
    uid: "demo_student_uid",
    email: "student@myalumni.edu",
    displayName: "Alex Chen",
    role: "student",
    accountStatus: "active",
    bio: "Final year CS student passionate about full-stack web architectures and cloud engineering.",
    profile: {
      courseName: "B.S. in Computer Science",
      academicYearName: "2025-2026",
      skills: ["JavaScript", "Python", "Flask", "Docker", "Git"]
    }
  },
  alumni: {
    uid: "demo_alumni_uid",
    email: "alumni@myalumni.edu",
    displayName: "Elena Rostova",
    role: "alumni",
    accountStatus: "active",
    bio: "Senior Cloud Software Engineer at Apex Technologies. Alumna of Batch 2021.",
    profile: {
      graduationYear: "2021",
      company: "Apex Technologies",
      jobTitle: "Senior Cloud Software Engineer",
      skills: ["Python", "Go", "Kubernetes", "GCP"]
    }
  }
};

class AuthState {
  constructor() {
    this.user = null;
    this.token = localStorage.getItem('myalumni_token') || null;
    this.role = localStorage.getItem('myalumni_role') || null;
    this.subscribers = [];
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify() {
    for (const cb of this.subscribers) {
      cb({
        user: this.user,
        role: this.role,
        isAuthenticated: !!this.user,
        token: this.token
      });
    }
  }

  async demoLogin(roleOrEmail) {
    const rawKey = (roleOrEmail || 'student').toLowerCase();
    let normalizedRole = 'student';
    if (rawKey.includes('admin')) normalizedRole = 'admin';
    else if (rawKey.includes('faculty')) normalizedRole = 'faculty';
    else if (rawKey.includes('alumni')) normalizedRole = 'alumni';

    try {
      const res = await api.demoLogin(roleOrEmail);
      if (res && res.data) {
        const { user, token, role } = res.data;
        this.token = token;
        this.user = user;
        this.role = role || user.role;
        localStorage.setItem('myalumni_token', token);
        localStorage.setItem('myalumni_role', this.role);
        api.setToken(token);
        this.notify();
        return this.user;
      }
    } catch (err) {
      console.warn("Backend demo API not responding, using direct demo profile:", err.message);
    }

    // Direct client fallback ensures instant login even if backend is offline/starting
    const fallbackUser = DEMO_FALLBACK_USERS[normalizedRole] || DEMO_FALLBACK_USERS.student;
    const token = `demo-token-${normalizedRole}`;
    this.token = token;
    this.user = fallbackUser;
    this.role = normalizedRole;
    localStorage.setItem('myalumni_token', token);
    localStorage.setItem('myalumni_role', this.role);
    api.setToken(token);
    this.notify();
    return this.user;
  }

  setSession(user, token, role) {
    this.token = token;
    this.user = user;
    this.role = role || user.role;
    localStorage.setItem('myalumni_token', token);
    localStorage.setItem('myalumni_role', this.role);
    api.setToken(token);
    this.notify();
    return this.user;
  }

  async login(email, password) {
    const res = await api.login({ email, password });
    if (!res || !res.data) {
      throw new Error("Login failed. No response received from server.");
    }
    const { user, token, role } = res.data;
    return this.setSession(user, token, role);
  }

  async testUserOtpLogin(email, otp) {
    const res = await api.testUserOtpLogin({ email, otp });
    if (!res || !res.data) {
      throw new Error("OTP Login failed. Invalid response from server.");
    }
    const { user, token, role } = res.data;
    return this.setSession(user, token, role);
  }

  async register(email, password, displayName, role, extraProfile = {}) {
    const res = await api.register({
      email,
      password,
      displayName,
      role,
      profile: extraProfile
    });
    if (!res) {
      throw new Error("Registration failed. No response received from server.");
    }
    return {
      ...(res.data || {}),
      message: res.message,
      data: res.data
    };
  }

  async verifyRegistration(email, otp) {
    const res = await api.verifyRegistration({ email, otp });
    if (!res || !res.data) {
      throw new Error("Verification failed. No response received from server.");
    }
    const { user, token, role: userRole } = res.data;
    return this.setSession(user, token, userRole);
  }

  async logout() {
    try {
      await api.logout().catch(() => null);
    } finally {
      this.user = null;
      this.role = null;
      this.token = null;
      localStorage.removeItem('myalumni_token');
      localStorage.removeItem('myalumni_role');
      api.setToken(null);
      this.notify();
    }
  }

  async restoreSession() {
    if (!this.token) {
      return null;
    }
    api.setToken(this.token);
    try {
      const res = await api.getCurrentUser();
      this.user = res.data;
      this.role = this.user.role;
      localStorage.setItem('myalumni_role', this.role);
      this.notify();
      return this.user;
    } catch (err) {
      if (this.token.startsWith('demo-token-')) {
        const role = this.token.replace('demo-token-', '');
        this.user = DEMO_FALLBACK_USERS[role] || DEMO_FALLBACK_USERS.student;
        this.role = role;
        this.notify();
        return this.user;
      }
      console.warn("Session expired or token invalid. Clearing credentials.");
      this.logout();
      return null;
    }
  }

  setUser(updatedUser) {
    this.user = updatedUser;
    if (updatedUser?.role) {
      this.role = updatedUser.role;
      localStorage.setItem('myalumni_role', this.role);
    }
    this.notify();
  }

  isAuthenticated() {
    return !!this.user;
  }

  hasRole(allowedRoles) {
    if (!this.user || !this.role) return false;
    if (typeof allowedRoles === 'string') return this.role === allowedRoles;
    return allowedRoles.includes(this.role);
  }
}

export const authState = new AuthState();

/**
 * Authentication Service
 * Handles user authentication with mock data for demo
 */

import { MOCK_USERS } from '../data/mockData.js';

const AUTH_STORAGE_KEY = 'star_sea_auth';
const USER_STORAGE_KEY = 'star_sea_user';

// Simulated login delay
const LOGIN_DELAY = 800;

class AuthService {
  constructor() {
    this.currentUser = null;
    this.token = null;
    this.listeners = [];
    this._loadFromStorage();
  }

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const userStored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored && userStored) {
        this.token = stored;
        this.currentUser = JSON.parse(userStored);
      }
    } catch (e) {
      console.warn('Failed to load auth from storage:', e);
    }
  }

  _saveToStorage() {
    try {
      if (this.token && this.currentUser) {
        localStorage.setItem(AUTH_STORAGE_KEY, this.token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to save auth to storage:', e);
    }
  }

  _notifyListeners() {
    this.listeners.forEach(fn => fn(this.currentUser));
  }

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  isAuthenticated() {
    return !!this.currentUser;
  }

  getUser() {
    return this.currentUser;
  }

  getToken() {
    return this.token;
  }

  async login(email, password, remember = false) {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY));

    // Find user by email (mock authentication)
    const user = MOCK_USERS.find(u => u.email === email);

    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', '邮箱或密码错误');
    }

    // In a real app, we'd verify the password hash
    // For demo, any password works
    if (password.length < 6) {
      throw new AuthError('INVALID_CREDENTIALS', '密码长度至少为6位');
    }

    // Generate mock token
    const token = this._generateToken(user);

    this.currentUser = user;
    this.token = token;
    this._saveToStorage();
    this._notifyListeners();

    return { user, token };
  }

  async register(data) {
    await new Promise(resolve => setTimeout(resolve, LOGIN_DELAY));

    // Check for existing email
    const existing = MOCK_USERS.find(u => u.email === data.email);
    if (existing) {
      throw new AuthError('EMAIL_EXISTS', '该邮箱已被注册');
    }

    // Check for existing username
    const existingUsername = MOCK_USERS.find(u => u.username === data.username);
    if (existingUsername) {
      throw new AuthError('USERNAME_EXISTS', '该用户名已被使用');
    }

    // Validate password match
    if (data.password !== data.confirmPassword) {
      throw new AuthError('PASSWORD_MISMATCH', '两次输入的密码不一致');
    }

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      username: data.username,
      displayName: data.nickname,
      email: data.email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}&backgroundColor=c0aede`,
      coverImage: 'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1200&h=400&fit=crop',
      bio: '',
      tags: ['新手'],
      location: '',
      website: '',
      socialLinks: { twitter: '', weibo: '' },
      stats: {
        works: 0,
        collections: 0,
        following: 0,
        followers: 0,
        totalReads: 0
      },
      joinedAt: new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0]
    };

    // Add to mock data (in memory only for demo)
    MOCK_USERS.push(newUser);

    // Generate token and login
    const token = this._generateToken(newUser);
    this.currentUser = newUser;
    this.token = token;
    this._saveToStorage();
    this._notifyListeners();

    return { user: newUser, token };
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    this._saveToStorage();
    this._notifyListeners();
  }

  updateProfile(updates) {
    if (!this.currentUser) return;

    this.currentUser = { ...this.currentUser, ...updates };
    this._saveToStorage();
    this._notifyListeners();
    return this.currentUser;
  }

  _generateToken(user) {
    // Mock JWT-like token
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: user.id,
      username: user.username,
      email: user.email,
      iat: Date.now(),
      exp: Date.now() + 24 * 60 * 60 * 1000
    }));
    const signature = btoa('mock_signature');
    return `${header}.${payload}.${signature}`;
  }
}

class AuthError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// Singleton instance
export const authService = new AuthService();

// Export class for testing
export { AuthService, AuthError };

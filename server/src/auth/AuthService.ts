/**
 * PHASE 2: MILITARY GRADE SECURITY (Argon2id)
 * Replaces weak SHA-256 with memory-hard hashing to prevent GPU cracking.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as argon2 from 'argon2';
import { Request } from 'express';

// Extend Express Request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

// Simple in-memory user store (upgrade to DB in later phases)
const users = new Map<string, {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
  lastLogin?: number;
}>();

// Session store
const sessions = new Map<string, {
  userId: string;
  username: string;
  createdAt: number;
  lastActivity: number;
}>();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '24h';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

export interface User {
  id: string;
  username: string;
}

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: number;
}

export class AuthService {
  // Create default admin user
  static async createDefaultAdmin() {
    const adminId = 'admin-001';
    const adminUsername = 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'; // Change in production!

    if (!users.has(adminId)) {
      const passwordHash = await this.hashPassword(adminPassword);
      users.set(adminId, {
        id: adminId,
        username: adminUsername,
        passwordHash,
        createdAt: Date.now()
      });
      console.log('🔐 PHASE2: Default admin user created (Argon2id Secured)');
    }
  }

  // EIDOLON-V FIX: Argon2id Hashing
  static async hashPassword(password: string): Promise<string> {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,         // 3 Iterations
      parallelism: 1,      // 1 Thread
    });
  }

  // EIDOLON-V FIX: Argon2id Verification
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (err) {
      console.error('Password verification error:', err);
      return false; // Fail secure
    }
  }

  // Authenticate user
  static async authenticate(username: string, password: string): Promise<AuthToken | null> {
    const user = Array.from(users.values()).find(u => u.username === username);
    if (!user) return null;

    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) return null;

    // Update last login
    user.lastLogin = Date.now();

    // Create JWT token
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      iat: Math.floor(Date.now() / 1000)
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

    // Store session
    sessions.set(token, {
      userId: user.id,
      username: user.username,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });

    return {
      token,
      user: { id: user.id, username: user.username },
      expiresAt
    };
  }

  // Verify token (Sync - JWT verification is fast enough)
  static verifyToken(token: string): User | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;

      // Check session exists and is not expired
      const session = sessions.get(token);
      if (!session) return null;

      // Check session timeout
      if (Date.now() - session.lastActivity > SESSION_TIMEOUT) {
        sessions.delete(token);
        return null;
      }

      // Update last activity
      session.lastActivity = Date.now();

      return {
        id: decoded.userId,
        username: decoded.username
      };
    } catch (error) {
      // console.warn('🔐 Invalid token');
      return null;
    }
  }

  // Logout
  static logout(token: string): boolean {
    return sessions.delete(token);
  }

  // Cleanup expired sessions
  static cleanupSessions() {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
      if (now - session.lastActivity > SESSION_TIMEOUT) {
        sessions.delete(token);
      }
    }
  }

  // Get session stats
  static getSessionStats() {
    return {
      activeUsers: sessions.size,
      totalUsers: users.size,
      oldestSession: Math.min(...Array.from(sessions.values()).map(s => s.createdAt)),
      newestSession: Math.max(...Array.from(sessions.values()).map(s => s.createdAt))
    };
  }

  // Create guest user (for quick testing)
  static createGuestUser(): AuthToken {
    const guestId = `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const guestUsername = `Guest${Math.floor(Math.random() * 10000)}`;

    const tokenPayload = {
      userId: guestId,
      username: guestUsername,
      iat: Math.floor(Date.now() / 1000),
      isGuest: true
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); // Guests get 1 hour
    const expiresAt = Date.now() + (60 * 60 * 1000);

    sessions.set(token, {
      userId: guestId,
      username: guestUsername,
      createdAt: Date.now(),
      lastActivity: Date.now()
    });

    return {
      token,
      user: { id: guestId, username: guestUsername },
      expiresAt
    };
  }
}

// Authentication middleware
export const authMiddleware = (req: AuthenticatedRequest, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const user = AuthService.verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
};

// Optional auth middleware (allows guests)
export const optionalAuthMiddleware = (req: AuthenticatedRequest, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (token) {
    const user = AuthService.verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
};

// Initialize default admin (fire and forget)
AuthService.createDefaultAdmin().catch(console.error);

// Cleanup sessions every 5 minutes
setInterval(() => {
  AuthService.cleanupSessions();
}, 5 * 60 * 1000);

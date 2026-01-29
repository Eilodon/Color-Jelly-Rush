/**
 * PHASE 2: MILITARY GRADE SECURITY (Argon2id)
 * Replaces weak SHA-256 with memory-hard hashing to prevent GPU cracking.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as argon2 from 'argon2';
import { Request } from 'express';

import { logger } from '../logging/Logger';

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

// ... (users map)

// ... (sessions map)

type JwtAlg = 'HS256' | 'HS384' | 'HS512';

const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const JWT_ALG: JwtAlg = (process.env.JWT_ALG as JwtAlg) || 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'cjr-server';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'cjr-client';

// Production invariant: secret must be stable across restarts/instances.
// Random per-boot secret makes all issued tokens invalid after restart and prevents horizontal scaling.
const JWT_SECRET = (() => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) return envSecret;

  if (!isDev) {
    // Fail-fast in non-development environments (Production, Staging, QA)
    throw new Error(`JWT_SECRET must be set (>= 32 chars) in ${process.env.NODE_ENV} environment`);
  }

  // Dev fallback: stable-ish secret derived from machine/user context to avoid constant logouts.
  // Still not secure; intended for local dev only.
  logger.warn('⚠️ SECURITY: Using insecure fallback JWT_SECRET for development');
  const seed = `${process.env.USER || 'dev'}:${process.env.HOSTNAME || 'localhost'}:${process.cwd()}`;
  return crypto.createHash('sha256').update(seed).digest('hex');
})();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
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

    // EIDOLON-V SECURITY: Fail fast if no ADMIN_PASSWORD in production
    const adminPassword = process.env.ADMIN_PASSWORD;
    const isDev = process.env.NODE_ENV !== 'production';

    if (!adminPassword) {
      if (isDev) {
        logger.warn('⚠️ SECURITY: Using default admin password in development. Set ADMIN_PASSWORD env var for production!', {});
        // Only allow weak default in development
      } else {
        logger.error('🚨 FATAL: ADMIN_PASSWORD environment variable is required in production!', {});
        process.exit(1); // Fail fast - don't start with insecure config
      }
    }

    const password = adminPassword || 'dev-admin-123'; // Only used in dev

    if (!users.has(adminId)) {
      const passwordHash = await this.hashPassword(password);
      users.set(adminId, {
        id: adminId,
        username: adminUsername,
        passwordHash,
        createdAt: Date.now()
      });
      logger.security('Default admin user created (Argon2id Secured)');
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
      logger.error('Password verification error', { error: err });
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

    const signOptions: jwt.SignOptions = {
      algorithm: JWT_ALG as jwt.Algorithm,
      expiresIn: JWT_EXPIRES_IN as any, // Cast to any to satisfy specific string literal types if needed
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, signOptions);
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
      const decoded = jwt.verify(token, JWT_SECRET, {
        algorithms: [JWT_ALG],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      }) as any;

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
    const createdAts = Array.from(sessions.values()).map(s => s.createdAt);
    return {
      activeUsers: sessions.size,
      totalUsers: users.size,
      oldestSession: createdAts.length ? Math.min(...createdAts) : null,
      newestSession: createdAts.length ? Math.max(...createdAts) : null
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

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      algorithm: JWT_ALG,
      expiresIn: '1h', // Guests get 1 hour
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });
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

/**
 * Initialize authentication subsystem.
 * IMPORTANT: Call this from the server entrypoint (not as a module side-effect),
 * so boot ordering is deterministic and test environments can control behavior.
 */
export async function initAuthService(): Promise<void> {
  await AuthService.createDefaultAdmin();
}

export function startAuthMaintenance(): NodeJS.Timeout {
  // Cleanup sessions every 5 minutes
  return setInterval(() => {
    AuthService.cleanupSessions();
  }, 5 * 60 * 1000);
}

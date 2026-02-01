/**
 * Client-Side Structured Logger
 * Safe for use in browser environment (no Node.js dependencies)
 * Strips debug/info logs in production builds
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export class ClientLogger {
  private static instance: ClientLogger;
  // Use loose check for environment to support both Vite and generic environments
  private isDev = (import.meta as any).env?.DEV || false;

  static getInstance(): ClientLogger {
    if (!ClientLogger.instance) {
      ClientLogger.instance = new ClientLogger();
    }
    return ClientLogger.instance;
  }

  error(message: string, context?: unknown, error?: Error): void {
    console.error(`[ERROR] ${message}`, context, error);
  }

  warn(message: string, context?: unknown): void {
    console.warn(`[WARN] ${message}`, context);
  }

  info(message: string, context?: unknown): void {
    if (this.isDev) {
      console.info(`[INFO] ${message}`, context);
    }
  }

  debug(message: string, context?: unknown): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }
}

export const clientLogger = ClientLogger.getInstance();

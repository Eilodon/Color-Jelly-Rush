/**
 * IMPERATOR PLAN Phase 3: Standalone Database Migration Script
 * 
 * This script runs database migrations as an isolated K8s Job.
 * It exits after completion - does not start the game server.
 * 
 * Usage:
 *   npm run db:migrate          # Run migrations
 *   npm run db:migrate --reset  # Reset database (dev only)
 */

import { MigrationManager } from '../database/MigrationManager';
import { logger } from '../logging/Logger';

const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');

async function main(): Promise<void> {
  logger.info('🔧 IMPERATOR Phase 3: Starting database migration...');

  const manager = MigrationManager.getInstance();

  if (shouldReset) {
    logger.warn('⚠️ Database reset requested - ALL DATA WILL BE LOST');
    await manager.reset();
    logger.info('✅ Database reset complete');
  } else {
    await manager.migrate();
    logger.info('✅ Database migration complete');
  }

  // IMPERATOR: Exit immediately - no server startup
  process.exit(0);
}

main().catch((error: Error) => {
  logger.error('❌ Migration failed', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

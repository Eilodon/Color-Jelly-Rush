
import { apiGateway } from './APIGateway';
import { authService } from './AuthService';
import { serviceRegistry } from './ServiceRegistry';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const BOOT_DELAY = 1000;

async function bootstrap() {
    console.log('🚀 Starting Color Jelly Rush Microservices...');

    try {
        // 1. Validate System Configuration
        console.log('📦 Validating Service Registry...');
        const dependencyCheck = serviceRegistry.validateDependencies();
        if (!dependencyCheck.valid) {
            console.error('❌ Dependency check failed:', dependencyCheck.errors);
            process.exit(1);
        }

        // 2. Start Auth Service (Core Dependency)
        console.log('🔐 Starting Auth Service...');
        await authService.start(3001);

        // Update registry health
        serviceRegistry.updateHealthStatus('auth-service', {
            status: 'healthy',
            responseTime: 0
        });

        // 3. Start API Gateway (Entry Point)
        console.log('🌐 Starting API Gateway...');
        await apiGateway.start(8080);

        serviceRegistry.updateHealthStatus('api-gateway', {
            status: 'healthy',
            responseTime: 0
        });

        console.log('✅ BACKEND ONLINE');
        console.log(`   - Gateway: http://localhost:8080`);
        console.log(`   - Auth:    http://localhost:3001`);

    } catch (error) {
        console.error('🔥 CRITICAL BOOT FAILURE:', error);
        process.exit(1);
    }
}

bootstrap();

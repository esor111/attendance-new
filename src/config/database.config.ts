import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

/**
 * Database configuration for PostgreSQL with PostGIS extension
 * Uses synchronize: true as per project requirements (no migrations)
 */
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'password'),
  database: configService.get('DB_NAME', 'attendance_db'),
  synchronize: true, // Auto-sync schema - no migration files
  autoLoadEntities: true, // Automatically load entities
  logging: configService.get('NODE_ENV') === 'development',
  // PostGIS support will be enabled through SQL extension
  extra: {
    // Ensure PostGIS extension is available
    charset: 'utf8mb4_unicode_ci',
  },
});
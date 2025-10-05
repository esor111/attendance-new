"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDatabaseConfig = void 0;
const getDatabaseConfig = (configService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'password'),
    database: configService.get('DB_NAME', 'attendance_db'),
    synchronize: true,
    autoLoadEntities: true,
    logging: configService.get('NODE_ENV') === 'development',
    extra: {
        charset: 'utf8mb4_unicode_ci',
    },
});
exports.getDatabaseConfig = getDatabaseConfig;
//# sourceMappingURL=database.config.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
            const formattedErrors = errors.map(error => {
                const constraints = error.constraints || {};
                return {
                    field: error.property,
                    message: Object.values(constraints)[0] || 'Validation failed',
                    value: error.value,
                };
            });
            return {
                message: 'Validation failed',
                errors: formattedErrors,
                statusCode: 400,
            };
        },
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.enableCors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Attendance Microservice API')
        .setDescription(`
      The Attendance Microservice provides comprehensive user, department, and entity management
      with geospatial functionality for location-based attendance tracking.
      
      ## Key Features
      - **Handshake Process**: Automatic data population from external microservices
      - **Geospatial Operations**: PostGIS-powered location validation and proximity search
      - **Department Management**: Organizational structure with entity assignments
      - **Access Control**: Department-based entity access validation
      
      ## Authentication
      JWT authentication is required for protected endpoints (implementation in progress).
      
      ## Error Handling
      All endpoints return consistent error responses with detailed validation messages.
    `)
        .setVersion('1.0')
        .addTag('users', 'User management and profile operations')
        .addTag('departments', 'Department CRUD and entity assignments')
        .addTag('entities', 'Business location management with geospatial features')
        .addTag('handshake', 'External service integration endpoints')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            tagsSorter: 'alpha',
            operationsSorter: 'alpha',
        },
        customSiteTitle: 'Attendance Microservice API Documentation',
    });
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 Application is running on: http://localhost:${port}`);
    logger.log(`📚 API Documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap().catch((error) => {
    console.error('Failed to start application:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map
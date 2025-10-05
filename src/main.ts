import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Bootstrap the Attendance Microservice application
 * Configures global validation, error handling, and API documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Global validation pipe with enhanced error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Transform the object to the target type
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion
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
    }),
  );

  // Global exception filter for consistent error responses
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS configuration for development
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger/OpenAPI documentation configuration
  const config = new DocumentBuilder()
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
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
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

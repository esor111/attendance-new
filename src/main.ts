import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

/**
 * Bootstrap the Attendance Microservice application
 * Configures global validation, error handling, and API documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // Enhanced CORS configuration for all origins
  app.enableCors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false,
  });

  // Additional middleware to handle CORS manually (fallback)
  app.use((req: any, res: any, next: any) => {
    // Set CORS headers manually as a fallback
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    next();
  });

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

  // Set global prefix and versioning
  app.setGlobalPrefix("kattendance");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Swagger/OpenAPI documentation configuration
  const config = new DocumentBuilder()
    .setTitle("KAHA-ATTENDANCE")
    .setDescription("KAHA Attendance Management API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("kattendance/v1/docs", app, document);

  const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3001;

  await app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Attendance Server running on: http://localhost:${port}`);
    console.log(`📚 API Docs available at: http://localhost:${port}/kattendance/v1/docs`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔓 CORS: All origins allowed`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

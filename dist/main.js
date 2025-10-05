"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose']
    });
    app.enableCors({
        origin: true,
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
        optionsSuccessStatus: 200,
        preflightContinue: false,
    });
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        next();
    });
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
    app.setGlobalPrefix("kattendance");
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    const config = new swagger_1.DocumentBuilder()
        .setTitle("KAHA-ATTENDANCE")
        .setDescription("KAHA Attendance Management API")
        .setVersion("1.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup("kattendance/v1/docs", app, document);
    const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3001;
    await app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Attendance Server running on: http://localhost:${port}`);
        console.log(`📚 API Docs available at: http://localhost:${port}/kattendance/v1/docs`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔓 CORS: All origins allowed`);
    });
}
bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
//# sourceMappingURL=main.js.map
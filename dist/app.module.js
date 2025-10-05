"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const core_1 = require("@nestjs/core");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const service_communication_module_1 = require("./service-communication/service-communication.module");
const user_module_1 = require("./modules/user/user.module");
const department_module_1 = require("./modules/department/department.module");
const entity_module_1 = require("./modules/entity/entity.module");
const attendance_module_1 = require("./modules/attendance/attendance.module");
const database_config_1 = require("./config/database.config");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const validation_pipe_1 = require("./common/pipes/validation.pipe");
const validation_service_1 = require("./common/services/validation.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: database_config_1.getDatabaseConfig,
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            service_communication_module_1.ServiceCommunicationModule,
            user_module_1.UserModule,
            department_module_1.DepartmentModule,
            entity_module_1.EntityModule,
            attendance_module_1.AttendanceModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            validation_service_1.ValidationService,
            {
                provide: core_1.APP_FILTER,
                useClass: global_exception_filter_1.GlobalExceptionFilter,
            },
            {
                provide: core_1.APP_PIPE,
                useClass: validation_pipe_1.EnhancedValidationPipe,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
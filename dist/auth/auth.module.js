"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const jwt_token_module_1 = require("./jwt-token.module");
const service_communication_module_1 = require("../service-communication/service-communication.module");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const business_auth_guard_1 = require("./guards/business-auth.guard");
const optional_jwt_auth_guard_1 = require("./guards/optional-jwt-auth.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_token_module_1.JwtTokenModule,
            service_communication_module_1.ServiceCommunicationModule,
        ],
        providers: [
            jwt_strategy_1.JwtStrategy,
            jwt_auth_guard_1.JwtAuthGuard,
            business_auth_guard_1.BusinessAuthGuard,
            optional_jwt_auth_guard_1.OptionalJwtAuthGuard,
        ],
        exports: [
            jwt_token_module_1.JwtTokenModule,
            jwt_auth_guard_1.JwtAuthGuard,
            business_auth_guard_1.BusinessAuthGuard,
            optional_jwt_auth_guard_1.OptionalJwtAuthGuard,
            passport_1.PassportModule,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServiceCommunicationModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const business_service_1 = require("./services/business.service");
const user_service_1 = require("./services/user.service");
const handshake_service_1 = require("./services/handshake.service");
const user_entity_1 = require("../modules/user/entities/user.entity");
const department_entity_1 = require("../modules/department/entities/department.entity");
let ServiceCommunicationModule = class ServiceCommunicationModule {
};
exports.ServiceCommunicationModule = ServiceCommunicationModule;
exports.ServiceCommunicationModule = ServiceCommunicationModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.User, department_entity_1.Department]),
        ],
        providers: [
            business_service_1.BusinessService,
            user_service_1.UserService,
            handshake_service_1.HandshakeService,
        ],
        exports: [
            business_service_1.BusinessService,
            user_service_1.UserService,
            handshake_service_1.HandshakeService,
        ],
    })
], ServiceCommunicationModule);
//# sourceMappingURL=service-communication.module.js.map
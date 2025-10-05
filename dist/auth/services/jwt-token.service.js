"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtTokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let JwtTokenService = class JwtTokenService {
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.configService = configService;
    }
    verifyToken(token) {
        try {
            const secret = this.configService.get('JWT_SECRET_TOKEN');
            if (!secret) {
                throw new common_1.UnauthorizedException('JWT secret not configured');
            }
            const payload = this.jwtService.verify(token, { secret });
            if (!payload.id || !payload.kahaId) {
                throw new common_1.UnauthorizedException('Invalid token payload structure');
            }
            return payload;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            if (error.name === 'TokenExpiredError') {
                throw new common_1.UnauthorizedException('Token has expired');
            }
            if (error.name === 'JsonWebTokenError') {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            if (error.name === 'NotBeforeError') {
                throw new common_1.UnauthorizedException('Token not active yet');
            }
            throw new common_1.UnauthorizedException('Token verification failed');
        }
    }
    hasBusinessContext(payload) {
        return !!payload.businessId;
    }
};
exports.JwtTokenService = JwtTokenService;
exports.JwtTokenService = JwtTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], JwtTokenService);
//# sourceMappingURL=jwt-token.service.js.map
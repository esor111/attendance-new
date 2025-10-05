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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const user_service_1 = require("./user.service");
const dto_1 = require("./dto");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    async getUserByExternalId(userId) {
        return this.userService.getUserByExternalId(userId);
    }
    async checkUserExists(userId) {
        const user = await this.userService.findByExternalUserId(userId);
        return {
            exists: !!user,
            userId: user?.userId,
            lastSyncedAt: user?.lastSyncedAt,
        };
    }
    async getUserProfile(id) {
        const user = await this.userService.findByIdWithDepartment(id);
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            address: user.address,
            userId: user.userId,
            isFieldWorker: user.isFieldWorker,
            departmentId: user.departmentId,
            lastSyncedAt: user.lastSyncedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            department: user.department ? {
                id: user.department.id,
                name: user.department.name,
                businessId: user.department.businessId,
            } : undefined,
        };
    }
    async updateUserProfile(id, updateDto) {
        const user = await this.userService.updateProfile(id, updateDto);
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            address: user.address,
            userId: user.userId,
            isFieldWorker: user.isFieldWorker,
            departmentId: user.departmentId,
            lastSyncedAt: user.lastSyncedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            department: user.department ? {
                id: user.department.id,
                name: user.department.name,
                businessId: user.department.businessId,
            } : undefined,
        };
    }
    async getUserAccessibleEntities(id) {
        return this.userService.getUserAccessibleEntities(id);
    }
    async checkEntityAccess(id, entityId) {
        return this.userService.checkEntityAccess(id, entityId);
    }
    async getUserAccessStatus(id) {
        return this.userService.getUserAccessStatus(id);
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)('external/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserByExternalId", null);
__decorate([
    (0, common_1.Get)('external/:userId/exists'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkUserExists", null);
__decorate([
    (0, common_1.Get)(':id/profile'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserProfile", null);
__decorate([
    (0, common_1.Put)(':id/profile'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateUserProfileDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "updateUserProfile", null);
__decorate([
    (0, common_1.Get)(':id/accessible-entities'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserAccessibleEntities", null);
__decorate([
    (0, common_1.Get)(':id/entities/:entityId/access'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('entityId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "checkEntityAccess", null);
__decorate([
    (0, common_1.Get)(':id/access-status'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getUserAccessStatus", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map
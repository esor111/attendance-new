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
var HandshakeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HandshakeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../../modules/user/entities/user.entity");
const department_entity_1 = require("../../modules/department/entities/department.entity");
const user_service_1 = require("./user.service");
const business_service_1 = require("./business.service");
let HandshakeService = HandshakeService_1 = class HandshakeService {
    constructor(userRepository, departmentRepository, externalUserService, externalBusinessService) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
        this.externalUserService = externalUserService;
        this.externalBusinessService = externalBusinessService;
        this.logger = new common_1.Logger(HandshakeService_1.name);
    }
    async ensureUserExists(userId) {
        this.logger.debug(`Ensuring user exists for userId: ${userId}`);
        let user = await this.userRepository.findOne({
            where: { userId },
            relations: ['department']
        });
        if (user) {
            this.logger.debug(`User found locally for userId: ${userId}`);
            return user;
        }
        this.logger.debug(`User not found locally, fetching from external service for userId: ${userId}`);
        const externalUserData = await this.fetchUserFromExternal(userId);
        if (!externalUserData) {
            throw new common_1.NotFoundException(`User with userId ${userId} not found in external service`);
        }
        const newUser = new user_entity_1.User();
        newUser.userId = externalUserData.id;
        newUser.name = externalUserData.name;
        newUser.email = externalUserData.email || `${externalUserData.id}@placeholder.com`;
        newUser.phone = `+977-${Date.now().toString().slice(-8)}`;
        newUser.isFieldWorker = false;
        newUser.lastSyncedAt = new Date();
        user = newUser;
        const savedUser = await this.userRepository.save(user);
        this.logger.log(`Successfully created local user for userId: ${userId}, internal ID: ${savedUser.id}`);
        return savedUser;
    }
    async ensureBusinessExists(businessId) {
        this.logger.debug(`Ensuring business exists for businessId: ${businessId}`);
        const businessData = await this.externalBusinessService.getBusinessData(businessId);
        if (!businessData) {
            throw new common_1.NotFoundException(`Business with businessId ${businessId} not found in external service`);
        }
        this.logger.log(`Successfully ensured business exists for businessId: ${businessId}`);
        return businessData;
    }
    async performLoginHandshake(userId, businessId) {
        this.logger.debug(`Performing login handshake for userId: ${userId}, businessId: ${businessId}`);
        try {
            const [user, business] = await Promise.all([
                this.ensureUserExists(userId),
                this.ensureBusinessExists(businessId),
            ]);
            this.logger.log(`Login handshake completed successfully for userId: ${userId}, businessId: ${businessId}`);
            return { user, business };
        }
        catch (error) {
            this.logger.error(`Login handshake failed for userId: ${userId}, businessId: ${businessId}`, error.stack);
            throw error;
        }
    }
    async fetchUserFromExternal(userId) {
        try {
            this.logger.debug(`Fetching user data from external service for userId: ${userId}`);
            const userData = await this.externalUserService.getUserData(userId);
            if (userData) {
                this.logger.debug(`Successfully fetched user data from external service for userId: ${userId}`);
            }
            else {
                this.logger.warn(`No user data found in external service for userId: ${userId}`);
            }
            return userData;
        }
        catch (error) {
            this.logger.error(`Error fetching user data from external service for userId: ${userId}`, error.stack);
            throw error;
        }
    }
    async checkUserExistsLocally(userId) {
        const user = await this.userRepository.findOne({ where: { userId } });
        return !!user;
    }
    async getUserByExternalId(userId) {
        return this.userRepository.findOne({
            where: { userId },
            relations: ['department']
        });
    }
    async updateUserSyncTimestamp(userId) {
        await this.userRepository.update({ userId }, { lastSyncedAt: new Date() });
        this.logger.debug(`Updated sync timestamp for userId: ${userId}`);
    }
    async getStaleUsers(hoursOld = 24) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
        return this.userRepository
            .createQueryBuilder('user')
            .where('user.lastSyncedAt < :cutoffDate OR user.lastSyncedAt IS NULL', { cutoffDate })
            .getMany();
    }
};
exports.HandshakeService = HandshakeService;
exports.HandshakeService = HandshakeService = HandshakeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(department_entity_1.Department)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        user_service_1.UserService,
        business_service_1.BusinessService])
], HandshakeService);
//# sourceMappingURL=handshake.service.js.map
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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let UserService = UserService_1 = class UserService {
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.logger = new common_1.Logger(UserService_1.name);
        this.userCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000;
        this.kahaMainUrl = this.configService.get('KAHA_MAIN_URL', 'https://dev.kaha.com.np');
    }
    async getBulkUserData(userIds) {
        if (!userIds || userIds.length === 0) {
            return new Map();
        }
        const cachedResults = new Map();
        const uncachedIds = [];
        for (const userId of userIds) {
            const cached = this.userCache.get(userId);
            if (cached && this.isCacheValid(cached)) {
                cachedResults.set(userId, cached);
            }
            else {
                uncachedIds.push(userId);
            }
        }
        if (uncachedIds.length === 0) {
            this.logger.debug(`All user data found in cache for ${userIds.length} users`);
            return cachedResults;
        }
        try {
            this.logger.debug(`Fetching user data for ${uncachedIds.length} users from kaha-main-v3`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.kahaMainUrl}/main/api/v3/users/bulk`, { userIds: uncachedIds }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 5000
            }));
            if (response.data && response.data.users) {
                for (const user of response.data.users) {
                    const userData = {
                        ...user,
                        _cacheTime: Date.now()
                    };
                    this.userCache.set(user.id, userData);
                    cachedResults.set(user.id, userData);
                }
                this.logger.log(`Successfully fetched and cached ${response.data.users.length} users`);
            }
            return cachedResults;
        }
        catch (error) {
            this.logger.error('Error fetching user data from kaha-main-v3:', error.message);
            return cachedResults;
        }
    }
    async getUserData(userId) {
        const results = await this.getBulkUserData([userId]);
        return results.get(userId) || null;
    }
    isCacheValid(cachedData) {
        return cachedData._cacheTime && (Date.now() - cachedData._cacheTime) < this.CACHE_TTL;
    }
    clearUserCache(userId) {
        this.userCache.delete(userId);
        this.logger.debug(`Cleared cache for userId: ${userId}`);
    }
    clearAllCache() {
        this.userCache.clear();
        this.logger.log('Cleared all user cache');
    }
    getCacheStats() {
        return {
            size: this.userCache.size,
            keys: Array.from(this.userCache.keys())
        };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], UserService);
//# sourceMappingURL=user.service.js.map
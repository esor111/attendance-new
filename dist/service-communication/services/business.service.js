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
var BusinessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
let BusinessService = BusinessService_1 = class BusinessService {
    constructor(configService, httpService) {
        this.configService = configService;
        this.httpService = httpService;
        this.logger = new common_1.Logger(BusinessService_1.name);
        this.businessCache = new Map();
        this.CACHE_TTL = 10 * 60 * 1000;
        this.kahaMainUrl = this.configService.get('KAHA_MAIN_URL', 'https://dev.kaha.com.np');
    }
    async getBulkBusinessData(businessIds) {
        if (!businessIds || businessIds.length === 0) {
            return new Map();
        }
        const cachedResults = new Map();
        const uncachedIds = [];
        for (const businessId of businessIds) {
            const cached = this.businessCache.get(businessId);
            if (cached && this.isCacheValid(cached)) {
                cachedResults.set(businessId, cached);
            }
            else {
                uncachedIds.push(businessId);
            }
        }
        if (uncachedIds.length === 0) {
            this.logger.debug(`All business data found in cache for ${businessIds.length} businesses`);
            return cachedResults;
        }
        try {
            this.logger.debug(`Fetching business data for ${uncachedIds.length} businesses from kaha-main-v3`);
            const response = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${this.kahaMainUrl}/main/api/v3/businesses/bulk`, { businessIds: uncachedIds }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 5000
            }));
            if (response.data && response.data.businesses) {
                for (const business of response.data.businesses) {
                    const businessData = {
                        ...business,
                        _cacheTime: Date.now()
                    };
                    this.businessCache.set(business.id, businessData);
                    cachedResults.set(business.id, businessData);
                }
                this.logger.log(`Successfully fetched and cached ${response.data.businesses.length} businesses`);
            }
            return cachedResults;
        }
        catch (error) {
            this.logger.error('Error fetching business data from kaha-main-v3:', error.message);
            return cachedResults;
        }
    }
    async getBusinessData(businessId) {
        const results = await this.getBulkBusinessData([businessId]);
        return results.get(businessId) || null;
    }
    isCacheValid(cachedData) {
        return cachedData._cacheTime && (Date.now() - cachedData._cacheTime) < this.CACHE_TTL;
    }
    clearBusinessCache(businessId) {
        this.businessCache.delete(businessId);
        this.logger.debug(`Cleared cache for businessId: ${businessId}`);
    }
    clearAllCache() {
        this.businessCache.clear();
        this.logger.log('Cleared all business cache');
    }
    getCacheStats() {
        return {
            size: this.businessCache.size,
            keys: Array.from(this.businessCache.keys())
        };
    }
};
exports.BusinessService = BusinessService;
exports.BusinessService = BusinessService = BusinessService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        axios_1.HttpService])
], BusinessService);
//# sourceMappingURL=business.service.js.map
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BusinessData } from '../interfaces/business-data.interface';
export declare class BusinessService {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly businessCache;
    private readonly CACHE_TTL;
    private readonly kahaMainUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    getBulkBusinessData(businessIds: string[]): Promise<Map<string, BusinessData>>;
    getBusinessData(businessId: string): Promise<BusinessData | null>;
    private isCacheValid;
    clearBusinessCache(businessId: string): void;
    clearAllCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}

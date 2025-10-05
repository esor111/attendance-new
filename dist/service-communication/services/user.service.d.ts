import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { UserData } from '../interfaces/user-data.interface';
export declare class UserService {
    private readonly configService;
    private readonly httpService;
    private readonly logger;
    private readonly userCache;
    private readonly CACHE_TTL;
    private readonly kahaMainUrl;
    constructor(configService: ConfigService, httpService: HttpService);
    getBulkUserData(userIds: string[]): Promise<Map<string, UserData>>;
    getUserData(userId: string): Promise<UserData | null>;
    private isCacheValid;
    clearUserCache(userId: string): void;
    clearAllCache(): void;
    getCacheStats(): {
        size: number;
        keys: string[];
    };
}

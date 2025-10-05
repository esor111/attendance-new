import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UserData, BulkUserResponse } from '../interfaces/user-data.interface';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly userCache = new Map<string, UserData>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly kahaMainUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.kahaMainUrl = this.configService.get('KAHA_MAIN_URL', 'https://dev.kaha.com.np');
  }

  /**
   * Get user data for multiple userIds from kaha-main-v3
   */
  async getBulkUserData(userIds: string[]): Promise<Map<string, UserData>> {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }

    // Check cache first
    const cachedResults = new Map<string, UserData>();
    const uncachedIds: string[] = [];

    for (const userId of userIds) {
      const cached = this.userCache.get(userId);
      if (cached && this.isCacheValid(cached)) {
        cachedResults.set(userId, cached);
      } else {
        uncachedIds.push(userId);
      }
    }

    // If all data is cached, return it
    if (uncachedIds.length === 0) {
      this.logger.debug(`All user data found in cache for ${userIds.length} users`);
      return cachedResults;
    }

    try {
      this.logger.debug(`Fetching user data for ${uncachedIds.length} users from kaha-main-v3`);
      
      const response = await firstValueFrom(
        this.httpService.post<BulkUserResponse>(
          `${this.kahaMainUrl}/main/api/v3/users/bulk`,
          { userIds: uncachedIds },
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 5000 // 5 second timeout
          }
        )
      );

      if (response.data && response.data.users) {
        // Cache the results
        for (const user of response.data.users) {
          const userData: UserData = {
            ...user,
            _cacheTime: Date.now() // Add cache timestamp
          } as UserData & { _cacheTime: number };
          
          this.userCache.set(user.id, userData);
          cachedResults.set(user.id, userData);
        }

        this.logger.log(`Successfully fetched and cached ${response.data.users.length} users`);
      }

      return cachedResults;
    } catch (error) {
      this.logger.error('Error fetching user data from kaha-main-v3:', error.message);
      
      // Return cached data even if API call fails
      return cachedResults;
    }
  }

  /**
   * Get single user data
   */
  async getUserData(userId: string): Promise<UserData | null> {
    const results = await this.getBulkUserData([userId]);
    return results.get(userId) || null;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cachedData: any): boolean {
    return cachedData._cacheTime && (Date.now() - cachedData._cacheTime) < this.CACHE_TTL;
  }

  /**
   * Clear cache for specific user
   */
  clearUserCache(userId: string): void {
    this.userCache.delete(userId);
    this.logger.debug(`Cleared cache for userId: ${userId}`);
  }

  /**
   * Clear all user cache
   */
  clearAllCache(): void {
    this.userCache.clear();
    this.logger.log('Cleared all user cache');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.userCache.size,
      keys: Array.from(this.userCache.keys())
    };
  }
}
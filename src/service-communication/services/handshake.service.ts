import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { Department } from '../../modules/department/entities/department.entity';
import { UserService as ExternalUserService } from './user.service';
import { BusinessService as ExternalBusinessService } from './business.service';
import { UserData } from '../interfaces/user-data.interface';
import { BusinessData } from '../interfaces/business-data.interface';

/**
 * HandshakeService - Manages automatic data population from external microservices
 * 
 * Core responsibility: Ensure local copies of user and business data exist
 * by fetching from external services when needed during login/business switch operations.
 * 
 * Key Features:
 * - User existence check and external fetch logic
 * - Business existence check and external fetch logic  
 * - lastSyncedAt timestamp handling for data freshness
 * - Preserves external IDs while generating internal UUIDs
 */
@Injectable()
export class HandshakeService {
  private readonly logger = new Logger(HandshakeService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly externalUserService: ExternalUserService,
    private readonly externalBusinessService: ExternalBusinessService,
  ) {}

  /**
   * Ensures user exists locally, fetching from external service if needed
   * Requirement 1.1: Check if user exists locally
   * Requirement 1.2: Fetch user data from User Microservice if not exists
   * Requirement 1.3: Save user data locally with lastSyncedAt timestamp
   * Requirement 1.4: Use existing local data without external API call if exists
   * Requirement 1.5: Generate internal UUID while preserving external userId
   */
  async ensureUserExists(userId: string): Promise<User> {
    this.logger.debug(`Ensuring user exists for userId: ${userId}`);

    // Requirement 1.1 & 1.4: Check if user exists locally
    let user = await this.userRepository.findOne({ 
      where: { userId },
      relations: ['department']
    });

    if (user) {
      this.logger.debug(`User found locally for userId: ${userId}`);
      return user;
    }

    // Requirement 1.2: Fetch user data from external User Microservice
    this.logger.debug(`User not found locally, fetching from external service for userId: ${userId}`);
    const externalUserData = await this.fetchUserFromExternal(userId);

    if (!externalUserData) {
      throw new NotFoundException(`User with userId ${userId} not found in external service`);
    }

    // Requirement 1.3 & 1.5: Save user data locally with lastSyncedAt and generate internal UUID
    const newUser = new User();
    newUser.userId = externalUserData.id; // Preserve external userId
    newUser.name = externalUserData.name;
    newUser.email = externalUserData.email || `${externalUserData.id}@placeholder.com`;
    newUser.phone = `+977-${Date.now().toString().slice(-8)}`; // Generate placeholder phone
    newUser.isFieldWorker = false;
    newUser.lastSyncedAt = new Date(); // Track sync timestamp
    
    user = newUser;

    const savedUser = await this.userRepository.save(user);
    this.logger.log(`Successfully created local user for userId: ${userId}, internal ID: ${savedUser.id}`);

    return savedUser;
  }

  /**
   * Ensures business exists locally, fetching from external service if needed
   * Requirement 2.1: Check if business exists locally
   * Requirement 2.2: Fetch business data from Business Microservice if not exists
   * Requirement 2.3: Save business data locally with lastSyncedAt timestamp
   * Requirement 2.4: Use existing local data without external API call if exists
   * Requirement 2.5: Generate internal UUID while preserving external businessId
   */
  async ensureBusinessExists(businessId: string): Promise<BusinessData> {
    this.logger.debug(`Ensuring business exists for businessId: ${businessId}`);

    // For now, we'll use the external business service directly since we don't have
    // a local Business entity yet. This method returns the business data and ensures
    // it's cached locally in the external service.
    
    // Requirement 2.1 & 2.4: Check if business exists (in cache or external)
    const businessData = await this.externalBusinessService.getBusinessData(businessId);

    if (!businessData) {
      throw new NotFoundException(`Business with businessId ${businessId} not found in external service`);
    }

    this.logger.log(`Successfully ensured business exists for businessId: ${businessId}`);
    return businessData;
  }

  /**
   * Complete handshake process for user login
   * Handles both user and business data population in a single operation
   */
  async performLoginHandshake(userId: string, businessId: string): Promise<{
    user: User;
    business: BusinessData;
  }> {
    this.logger.debug(`Performing login handshake for userId: ${userId}, businessId: ${businessId}`);

    try {
      // Ensure both user and business exist locally
      const [user, business] = await Promise.all([
        this.ensureUserExists(userId),
        this.ensureBusinessExists(businessId),
      ]);

      this.logger.log(`Login handshake completed successfully for userId: ${userId}, businessId: ${businessId}`);

      return { user, business };
    } catch (error) {
      this.logger.error(`Login handshake failed for userId: ${userId}, businessId: ${businessId}`, error.stack);
      throw error;
    }
  }

  /**
   * Fetches user data from external User Microservice
   * Private method to handle external API communication
   */
  private async fetchUserFromExternal(userId: string): Promise<UserData | null> {
    try {
      this.logger.debug(`Fetching user data from external service for userId: ${userId}`);
      const userData = await this.externalUserService.getUserData(userId);
      
      if (userData) {
        this.logger.debug(`Successfully fetched user data from external service for userId: ${userId}`);
      } else {
        this.logger.warn(`No user data found in external service for userId: ${userId}`);
      }

      return userData;
    } catch (error) {
      this.logger.error(`Error fetching user data from external service for userId: ${userId}`, error.stack);
      throw error;
    }
  }

  /**
   * Checks if user exists locally without external API call
   * Useful for quick existence checks
   */
  async checkUserExistsLocally(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { userId } });
    return !!user;
  }

  /**
   * Gets user by external userId (not internal UUID)
   * Returns null if user doesn't exist locally
   */
  async getUserByExternalId(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { userId },
      relations: ['department']
    });
  }

  /**
   * Updates lastSyncedAt timestamp for a user
   * Useful when user data is refreshed from external service
   */
  async updateUserSyncTimestamp(userId: string): Promise<void> {
    await this.userRepository.update(
      { userId },
      { lastSyncedAt: new Date() }
    );
    this.logger.debug(`Updated sync timestamp for userId: ${userId}`);
  }

  /**
   * Gets users that haven't been synced recently (older than specified hours)
   * Useful for identifying stale user data
   */
  async getStaleUsers(hoursOld: number = 24): Promise<User[]> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

    return this.userRepository
      .createQueryBuilder('user')
      .where('user.lastSyncedAt < :cutoffDate OR user.lastSyncedAt IS NULL', { cutoffDate })
      .getMany();
  }
}
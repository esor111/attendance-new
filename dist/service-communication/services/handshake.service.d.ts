import { Repository } from 'typeorm';
import { User } from '../../modules/user/entities/user.entity';
import { Department } from '../../modules/department/entities/department.entity';
import { UserService as ExternalUserService } from './user.service';
import { BusinessService as ExternalBusinessService } from './business.service';
import { BusinessData } from '../interfaces/business-data.interface';
export declare class HandshakeService {
    private readonly userRepository;
    private readonly departmentRepository;
    private readonly externalUserService;
    private readonly externalBusinessService;
    private readonly logger;
    constructor(userRepository: Repository<User>, departmentRepository: Repository<Department>, externalUserService: ExternalUserService, externalBusinessService: ExternalBusinessService);
    ensureUserExists(userId: string): Promise<User>;
    ensureBusinessExists(businessId: string): Promise<BusinessData>;
    performLoginHandshake(userId: string, businessId: string): Promise<{
        user: User;
        business: BusinessData;
    }>;
    private fetchUserFromExternal;
    checkUserExistsLocally(userId: string): Promise<boolean>;
    getUserByExternalId(userId: string): Promise<User | null>;
    updateUserSyncTimestamp(userId: string): Promise<void>;
    getStaleUsers(hoursOld?: number): Promise<User[]>;
}

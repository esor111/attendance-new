import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { HandshakeService } from '../../service-communication/services/handshake.service';
import { DepartmentService } from '../department/department.service';
import { UpdateUserProfileDto, UserAccessStatusDto, EntityAccessResponseDto, UserAccessibleEntitiesResponseDto } from './dto';
export declare class UserService {
    private readonly userRepository;
    private readonly handshakeService;
    private readonly departmentService;
    constructor(userRepository: Repository<User>, handshakeService: HandshakeService, departmentService: DepartmentService);
    getUserByExternalId(userId: string): Promise<User>;
    checkUserExistsLocally(userId: string): Promise<boolean>;
    getUserById(id: string): Promise<User | null>;
    hasUserAccessToEntity(userId: string, entityId: string): Promise<boolean>;
    findByExternalUserId(userId: string): Promise<User | null>;
    findByIdWithDepartment(id: string): Promise<User>;
    updateProfile(id: string, updateDto: UpdateUserProfileDto): Promise<User>;
    getUserAccessibleEntities(id: string): Promise<UserAccessibleEntitiesResponseDto>;
    checkEntityAccess(id: string, entityId: string): Promise<EntityAccessResponseDto>;
    getUserAccessStatus(id: string): Promise<UserAccessStatusDto>;
    private generateAccessStatusMessage;
}

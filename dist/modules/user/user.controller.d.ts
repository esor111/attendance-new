import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UpdateUserProfileDto, UserProfileResponseDto, UserExistsResponseDto, UserAccessStatusDto, EntityAccessResponseDto, UserAccessibleEntitiesResponseDto } from './dto';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getUserByExternalId(userId: string): Promise<User>;
    checkUserExists(userId: string): Promise<UserExistsResponseDto>;
    getUserProfile(id: string): Promise<UserProfileResponseDto>;
    updateUserProfile(id: string, updateDto: UpdateUserProfileDto): Promise<UserProfileResponseDto>;
    getUserAccessibleEntities(id: string): Promise<UserAccessibleEntitiesResponseDto>;
    checkEntityAccess(id: string, entityId: string): Promise<EntityAccessResponseDto>;
    getUserAccessStatus(id: string): Promise<UserAccessStatusDto>;
}

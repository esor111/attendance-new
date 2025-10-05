import { EntityService } from './entity.service';
import { CreateEntityDto, UpdateEntityDto, ProximitySearchDto, NearbyEntityDto, LocationValidationDto, LocationValidationResponseDto, EntityResponseDto, EntityListResponseDto } from './dto';
export declare class EntityController {
    private readonly entityService;
    constructor(entityService: EntityService);
    create(createEntityDto: CreateEntityDto): Promise<EntityResponseDto>;
    findNearby(proximitySearchDto: ProximitySearchDto): Promise<NearbyEntityDto[]>;
    validateLocation(entityId: string, locationDto: Omit<LocationValidationDto, 'entityId'>): Promise<LocationValidationResponseDto>;
    findAll(page?: string, limit?: string): Promise<EntityListResponseDto>;
    findById(id: string): Promise<EntityResponseDto>;
    update(id: string, updateEntityDto: UpdateEntityDto): Promise<EntityResponseDto>;
    delete(id: string): Promise<void>;
    findByKahaId(kahaId: string): Promise<EntityResponseDto>;
    private mapToEntityResponse;
}

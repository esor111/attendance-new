import { Repository } from 'typeorm';
import { Entity } from './entities/entity.entity';
import { CreateEntityDto, UpdateEntityDto, ProximitySearchDto, NearbyEntityDto, LocationValidationDto, LocationValidationResponseDto, EntityListResponseDto } from './dto';
export declare class EntityService {
    private readonly entityRepository;
    constructor(entityRepository: Repository<Entity>);
    create(dto: CreateEntityDto): Promise<Entity>;
    findNearby(dto: ProximitySearchDto): Promise<NearbyEntityDto[]>;
    validateLocationWithinRadius(dto: LocationValidationDto): Promise<LocationValidationResponseDto>;
    findById(id: string): Promise<Entity>;
    findByKahaId(kahaId: string): Promise<Entity>;
    findAll(page?: number, limit?: number): Promise<{
        entities: Entity[];
        total: number;
    }>;
    update(id: string, dto: UpdateEntityDto): Promise<Entity>;
    delete(id: string): Promise<void>;
    findAllWithSummary(page: number, limit: number): Promise<EntityListResponseDto>;
    private calculateGeohash;
}

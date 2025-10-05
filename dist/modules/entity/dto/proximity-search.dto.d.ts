export declare class ProximitySearchDto {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
}
export declare class NearbyEntityDto {
    id: string;
    name: string;
    kahaId: string;
    address?: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    distanceMeters: number;
    avatarUrl?: string;
    coverImageUrl?: string;
    description?: string;
}

export declare class LocationValidationDto {
    entityId: string;
    latitude: number;
    longitude: number;
}
export declare class LocationValidationResponseDto {
    isValid: boolean;
    distanceMeters: number;
    allowedRadiusMeters: number;
    entityName: string;
    message: string;
}

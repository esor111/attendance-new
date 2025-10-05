export declare class ValidationService {
    validateCoordinates(latitude: number, longitude: number): void;
    validateRadius(radiusMeters: number): void;
    validateLocationWithinRadius(actualDistance: number, requiredRadius: number, entityName: string): void;
    validateEmail(email: string): void;
    validatePhoneNumber(phone: string): void;
    validateDepartmentName(name: string, businessId: string): void;
    validateKahaId(kahaId: string): void;
    validateUUID(uuid: string, fieldName?: string): void;
    validatePrimaryEntityAssignment(departmentId: string, entityId: string, isPrimary: boolean): void;
}

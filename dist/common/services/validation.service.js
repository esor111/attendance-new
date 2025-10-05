"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationService = void 0;
const common_1 = require("@nestjs/common");
const business_logic_exceptions_1 = require("../exceptions/business-logic.exceptions");
let ValidationService = class ValidationService {
    validateCoordinates(latitude, longitude) {
        if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
            throw new business_logic_exceptions_1.GeospatialValidationException('Latitude must be a number between -90 and 90 degrees', { latitude, longitude });
        }
        if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
            throw new business_logic_exceptions_1.GeospatialValidationException('Longitude must be a number between -180 and 180 degrees', { latitude, longitude });
        }
    }
    validateRadius(radiusMeters) {
        if (typeof radiusMeters !== 'number' || radiusMeters < 10 || radiusMeters > 1000) {
            throw new business_logic_exceptions_1.GeospatialValidationException('Radius must be a number between 10 and 1000 meters');
        }
    }
    validateLocationWithinRadius(actualDistance, requiredRadius, entityName) {
        if (actualDistance > requiredRadius) {
            throw new business_logic_exceptions_1.LocationValidationException(actualDistance, requiredRadius, entityName);
        }
    }
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new business_logic_exceptions_1.DataIntegrityException('Invalid email format', 'User', 'email validation');
        }
    }
    validatePhoneNumber(phone) {
        if (!phone || phone.length < 7 || phone.length > 20) {
            throw new business_logic_exceptions_1.DataIntegrityException('Phone number must be between 7 and 20 characters', 'User', 'phone validation');
        }
    }
    validateDepartmentName(name, businessId) {
        if (!name || name.trim().length === 0) {
            throw new business_logic_exceptions_1.DataIntegrityException('Department name cannot be empty', 'Department', 'name validation');
        }
        if (name.length > 100) {
            throw new business_logic_exceptions_1.DataIntegrityException('Department name cannot exceed 100 characters', 'Department', 'name validation');
        }
    }
    validateKahaId(kahaId) {
        if (!kahaId || kahaId.trim().length === 0) {
            throw new business_logic_exceptions_1.DataIntegrityException('KahaId cannot be empty', 'Entity', 'kahaId validation');
        }
        if (kahaId.length > 100) {
            throw new business_logic_exceptions_1.DataIntegrityException('KahaId cannot exceed 100 characters', 'Entity', 'kahaId validation');
        }
        const kahaIdRegex = /^[a-zA-Z0-9-_]+$/;
        if (!kahaIdRegex.test(kahaId)) {
            throw new business_logic_exceptions_1.DataIntegrityException('KahaId can only contain letters, numbers, hyphens, and underscores', 'Entity', 'kahaId validation');
        }
    }
    validateUUID(uuid, fieldName = 'ID') {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(uuid)) {
            throw new business_logic_exceptions_1.DataIntegrityException(`${fieldName} must be a valid UUID`, 'General', 'UUID validation');
        }
    }
    validatePrimaryEntityAssignment(departmentId, entityId, isPrimary) {
        this.validateUUID(departmentId, 'Department ID');
        this.validateUUID(entityId, 'Entity ID');
        if (typeof isPrimary !== 'boolean') {
            throw new business_logic_exceptions_1.DataIntegrityException('isPrimary must be a boolean value', 'DepartmentEntityAssignment', 'primary validation');
        }
    }
};
exports.ValidationService = ValidationService;
exports.ValidationService = ValidationService = __decorate([
    (0, common_1.Injectable)()
], ValidationService);
//# sourceMappingURL=validation.service.js.map
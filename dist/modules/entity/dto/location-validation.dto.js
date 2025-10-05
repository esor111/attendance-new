"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocationValidationResponseDto = exports.LocationValidationDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class LocationValidationDto {
}
exports.LocationValidationDto = LocationValidationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity UUID to validate against',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    (0, class_validator_1.IsUUID)(4, { message: 'EntityId must be a valid UUID' }),
    __metadata("design:type", String)
], LocationValidationDto.prototype, "entityId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User current latitude coordinate',
        example: 27.7172,
        minimum: -90,
        maximum: 90,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90, { message: 'Latitude must be between -90 and 90 degrees' }),
    (0, class_validator_1.Max)(90, { message: 'Latitude must be between -90 and 90 degrees' }),
    __metadata("design:type", Number)
], LocationValidationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User current longitude coordinate',
        example: 85.3240,
        minimum: -180,
        maximum: 180,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180, { message: 'Longitude must be between -180 and 180 degrees' }),
    (0, class_validator_1.Max)(180, { message: 'Longitude must be between -180 and 180 degrees' }),
    __metadata("design:type", Number)
], LocationValidationDto.prototype, "longitude", void 0);
class LocationValidationResponseDto {
}
exports.LocationValidationResponseDto = LocationValidationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether location is within allowed radius',
        example: true,
    }),
    __metadata("design:type", Boolean)
], LocationValidationResponseDto.prototype, "isValid", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Actual distance from entity center in meters',
        example: 85.5,
    }),
    __metadata("design:type", Number)
], LocationValidationResponseDto.prototype, "distanceMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity allowed radius in meters',
        example: 100,
    }),
    __metadata("design:type", Number)
], LocationValidationResponseDto.prototype, "allowedRadiusMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the entity being validated against',
        example: 'Main Office Kathmandu',
    }),
    __metadata("design:type", String)
], LocationValidationResponseDto.prototype, "entityName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Human-readable validation message',
        example: 'Location is within allowed radius',
    }),
    __metadata("design:type", String)
], LocationValidationResponseDto.prototype, "message", void 0);
//# sourceMappingURL=location-validation.dto.js.map
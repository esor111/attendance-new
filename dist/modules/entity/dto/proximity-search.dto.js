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
exports.NearbyEntityDto = exports.ProximitySearchDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
class ProximitySearchDto {
    constructor() {
        this.radiusMeters = 1000;
    }
}
exports.ProximitySearchDto = ProximitySearchDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search center latitude coordinate',
        example: 27.7172,
        minimum: -90,
        maximum: 90,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90, { message: 'Latitude must be between -90 and 90 degrees' }),
    (0, class_validator_1.Max)(90, { message: 'Latitude must be between -90 and 90 degrees' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ProximitySearchDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Search center longitude coordinate',
        example: 85.3240,
        minimum: -180,
        maximum: 180,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180, { message: 'Longitude must be between -180 and 180 degrees' }),
    (0, class_validator_1.Max)(180, { message: 'Longitude must be between -180 and 180 degrees' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ProximitySearchDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Search radius in meters (default: 1000m)',
        example: 1000,
        minimum: 10,
        maximum: 10000,
        default: 1000,
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(10, { message: 'Search radius must be at least 10 meters' }),
    (0, class_validator_1.Max)(10000, { message: 'Search radius cannot exceed 10000 meters' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], ProximitySearchDto.prototype, "radiusMeters", void 0);
class NearbyEntityDto {
}
exports.NearbyEntityDto = NearbyEntityDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity name',
        example: 'Main Office Kathmandu',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique KahaId',
        example: 'KTM-MAIN-001',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "kahaId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Entity address',
        example: 'Durbar Marg, Kathmandu 44600, Nepal',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity latitude',
        example: 27.7172,
    }),
    __metadata("design:type", Number)
], NearbyEntityDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity longitude',
        example: 85.3240,
    }),
    __metadata("design:type", Number)
], NearbyEntityDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Entity check-in radius in meters',
        example: 100,
    }),
    __metadata("design:type", Number)
], NearbyEntityDto.prototype, "radiusMeters", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Calculated distance from search point in meters',
        example: 250.5,
    }),
    __metadata("design:type", Number)
], NearbyEntityDto.prototype, "distanceMeters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Entity avatar image URL',
        example: 'https://example.com/images/office-avatar.jpg',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Entity cover image URL',
        example: 'https://example.com/images/office-cover.jpg',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "coverImageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Entity description',
        example: 'Main headquarters office located in the heart of Kathmandu',
    }),
    __metadata("design:type", String)
], NearbyEntityDto.prototype, "description", void 0);
//# sourceMappingURL=proximity-search.dto.js.map
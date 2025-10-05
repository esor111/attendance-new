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
exports.CreateEntityDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateEntityDto {
}
exports.CreateEntityDto = CreateEntityDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Name of the business location',
        example: 'Main Office Kathmandu',
        minLength: 1,
        maxLength: 255,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 255),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Unique identifier for the business location (must be unique across all entities)',
        example: 'KTM-MAIN-001',
        minLength: 1,
        maxLength: 100,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "kahaId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Physical address of the business location',
        example: 'Durbar Marg, Kathmandu 44600, Nepal',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Latitude coordinate in WGS84 format',
        example: 27.7172,
        minimum: -90,
        maximum: 90,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90, { message: 'Latitude must be between -90 and 90 degrees' }),
    (0, class_validator_1.Max)(90, { message: 'Latitude must be between -90 and 90 degrees' }),
    __metadata("design:type", Number)
], CreateEntityDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Longitude coordinate in WGS84 format',
        example: 85.3240,
        minimum: -180,
        maximum: 180,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-180, { message: 'Longitude must be between -180 and 180 degrees' }),
    (0, class_validator_1.Max)(180, { message: 'Longitude must be between -180 and 180 degrees' }),
    __metadata("design:type", Number)
], CreateEntityDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Allowed check-in radius in meters (minimum 10m, maximum 1000m)',
        example: 100,
        minimum: 10,
        maximum: 1000,
    }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(10, { message: 'Radius must be at least 10 meters' }),
    (0, class_validator_1.Max)(1000, { message: 'Radius cannot exceed 1000 meters' }),
    __metadata("design:type", Number)
], CreateEntityDto.prototype, "radiusMeters", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL to the entity avatar image',
        example: 'https://example.com/images/office-avatar.jpg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'URL to the entity cover image',
        example: 'https://example.com/images/office-cover.jpg',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "coverImageUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Description of the business location',
        example: 'Main headquarters office located in the heart of Kathmandu',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateEntityDto.prototype, "description", void 0);
//# sourceMappingURL=create-entity.dto.js.map
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
exports.UserExistsResponseDto = exports.UserProfileResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class UserProfileResponseDto {
}
exports.UserProfileResponseDto = UserProfileResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Internal user UUID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User full name',
        example: 'John Doe',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User phone number',
        example: '+977-9841234567',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "phone", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User email address',
        example: 'john.doe@example.com',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "email", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'User physical address',
        example: 'Kathmandu, Nepal',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "address", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'External user ID from User Microservice',
        example: 'ext-user-123',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether the user is a field worker',
        example: true,
    }),
    __metadata("design:type", Boolean)
], UserProfileResponseDto.prototype, "isFieldWorker", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Department ID the user belongs to',
        example: '123e4567-e89b-12d3-a456-426614174001',
    }),
    __metadata("design:type", String)
], UserProfileResponseDto.prototype, "departmentId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Last sync timestamp with external service',
        example: '2025-10-05T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], UserProfileResponseDto.prototype, "lastSyncedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User creation timestamp',
        example: '2025-10-05T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], UserProfileResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'User last update timestamp',
        example: '2025-10-05T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], UserProfileResponseDto.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Department information if user is assigned to one',
        type: 'object',
        properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
            name: { type: 'string', example: 'Human Resources' },
            businessId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174002' },
        },
    }),
    __metadata("design:type", Object)
], UserProfileResponseDto.prototype, "department", void 0);
class UserExistsResponseDto {
}
exports.UserExistsResponseDto = UserExistsResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Whether user exists in local database',
        example: true,
    }),
    __metadata("design:type", Boolean)
], UserExistsResponseDto.prototype, "exists", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'External user ID if exists',
        example: 'ext-user-123',
    }),
    __metadata("design:type", String)
], UserExistsResponseDto.prototype, "userId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Last sync timestamp if exists',
        example: '2025-10-05T10:30:00.000Z',
    }),
    __metadata("design:type", Date)
], UserExistsResponseDto.prototype, "lastSyncedAt", void 0);
//# sourceMappingURL=user-profile-response.dto.js.map
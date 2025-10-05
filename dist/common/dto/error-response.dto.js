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
exports.EntityAccessDeniedErrorDto = exports.LocationValidationErrorDto = exports.ErrorResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class ErrorResponseDto {
}
exports.ErrorResponseDto = ErrorResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HTTP status code',
        example: 400,
    }),
    __metadata("design:type", Number)
], ErrorResponseDto.prototype, "statusCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Error message',
        example: 'Validation failed',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Detailed validation errors',
        type: 'array',
        items: {
            type: 'object',
            properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Email must be a valid email address' },
                value: { type: 'string', example: 'invalid-email' },
            },
        },
    }),
    __metadata("design:type", Array)
], ErrorResponseDto.prototype, "errors", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Timestamp of the error',
        example: '2025-10-05T10:30:00.000Z',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "timestamp", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Request path that caused the error',
        example: '/api/users/123/profile',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "path", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'HTTP method used',
        example: 'PUT',
    }),
    __metadata("design:type", String)
], ErrorResponseDto.prototype, "method", void 0);
class LocationValidationErrorDto extends ErrorResponseDto {
}
exports.LocationValidationErrorDto = LocationValidationErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Location validation error details',
        type: 'object',
        properties: {
            actualDistance: { type: 'number', example: 150.25 },
            requiredRadius: { type: 'number', example: 100 },
            entityName: { type: 'string', example: 'Main Office' },
        },
    }),
    __metadata("design:type", Object)
], LocationValidationErrorDto.prototype, "details", void 0);
class EntityAccessDeniedErrorDto extends ErrorResponseDto {
}
exports.EntityAccessDeniedErrorDto = EntityAccessDeniedErrorDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Access denial details',
        type: 'object',
        properties: {
            userId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            entityId: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174001' },
            reason: { type: 'string', example: 'User has no department assigned' },
        },
    }),
    __metadata("design:type", Object)
], EntityAccessDeniedErrorDto.prototype, "details", void 0);
//# sourceMappingURL=error-response.dto.js.map
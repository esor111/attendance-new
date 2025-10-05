"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoordinateValidationPipe = exports.EnhancedValidationPipe = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
let EnhancedValidationPipe = class EnhancedValidationPipe {
    async transform(value, { metatype }) {
        if (!metatype || !this.toValidate(metatype)) {
            return value;
        }
        const object = (0, class_transformer_1.plainToClass)(metatype, value);
        const errors = await (0, class_validator_1.validate)(object, {
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        });
        if (errors.length > 0) {
            const formattedErrors = errors.map(error => {
                const constraints = error.constraints || {};
                return {
                    field: error.property,
                    message: Object.values(constraints)[0] || 'Validation failed',
                    value: error.value,
                };
            });
            throw new common_1.BadRequestException({
                message: 'Validation failed',
                errors: formattedErrors,
            });
        }
        return object;
    }
    toValidate(metatype) {
        const types = [String, Boolean, Number, Array, Object];
        return !types.includes(metatype);
    }
};
exports.EnhancedValidationPipe = EnhancedValidationPipe;
exports.EnhancedValidationPipe = EnhancedValidationPipe = __decorate([
    (0, common_1.Injectable)()
], EnhancedValidationPipe);
let CoordinateValidationPipe = class CoordinateValidationPipe {
    transform(value) {
        if (typeof value !== 'object' || value === null) {
            throw new common_1.BadRequestException('Invalid coordinate data');
        }
        const { latitude, longitude } = value;
        if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
            throw new common_1.BadRequestException({
                message: 'Invalid latitude',
                errors: [{
                        field: 'latitude',
                        message: 'Latitude must be a number between -90 and 90',
                        value: latitude,
                    }],
            });
        }
        if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
            throw new common_1.BadRequestException({
                message: 'Invalid longitude',
                errors: [{
                        field: 'longitude',
                        message: 'Longitude must be a number between -180 and 180',
                        value: longitude,
                    }],
            });
        }
        return value;
    }
};
exports.CoordinateValidationPipe = CoordinateValidationPipe;
exports.CoordinateValidationPipe = CoordinateValidationPipe = __decorate([
    (0, common_1.Injectable)()
], CoordinateValidationPipe);
//# sourceMappingURL=validation.pipe.js.map
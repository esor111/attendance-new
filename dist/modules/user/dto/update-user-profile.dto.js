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
exports.UpdateUserProfileDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateUserProfileDto {
}
exports.UpdateUserProfileDto = UpdateUserProfileDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 255, { message: 'Name must be between 1 and 255 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 20, { message: 'Phone must be between 1 and 20 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "phone", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEmail)({}, { message: 'Email must be a valid email address' }),
    (0, class_validator_1.Length)(1, 255, { message: 'Email must be between 1 and 255 characters' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "address", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'isFieldWorker must be a boolean value' }),
    __metadata("design:type", Boolean)
], UpdateUserProfileDto.prototype, "isFieldWorker", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(4, { message: 'DepartmentId must be a valid UUID' }),
    __metadata("design:type", String)
], UpdateUserProfileDto.prototype, "departmentId", void 0);
//# sourceMappingURL=update-user-profile.dto.js.map
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
exports.UserAccessibleEntityDto = exports.DepartmentEntityResponseDto = exports.SetPrimaryEntityDto = exports.AssignEntityDto = void 0;
const class_validator_1 = require("class-validator");
class AssignEntityDto {
    constructor() {
        this.isPrimary = false;
    }
}
exports.AssignEntityDto = AssignEntityDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'EntityId must be a valid UUID' }),
    __metadata("design:type", String)
], AssignEntityDto.prototype, "entityId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)({ message: 'isPrimary must be a boolean value' }),
    __metadata("design:type", Boolean)
], AssignEntityDto.prototype, "isPrimary", void 0);
class SetPrimaryEntityDto {
}
exports.SetPrimaryEntityDto = SetPrimaryEntityDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'EntityId must be a valid UUID' }),
    __metadata("design:type", String)
], SetPrimaryEntityDto.prototype, "entityId", void 0);
class DepartmentEntityResponseDto {
}
exports.DepartmentEntityResponseDto = DepartmentEntityResponseDto;
class UserAccessibleEntityDto {
}
exports.UserAccessibleEntityDto = UserAccessibleEntityDto;
//# sourceMappingURL=assign-entity.dto.js.map
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
exports.Department = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const base_entity_1 = require("../../../common/entities/base.entity");
const user_entity_1 = require("../../user/entities/user.entity");
const department_entity_assignment_entity_1 = require("./department-entity-assignment.entity");
let Department = class Department extends base_entity_1.BaseEntity {
};
exports.Department = Department;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(1, 100, { message: 'Department name must be between 1 and 100 characters' }),
    __metadata("design:type", String)
], Department.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, class_validator_1.IsUUID)(4, { message: 'BusinessId must be a valid UUID' }),
    __metadata("design:type", String)
], Department.prototype, "businessId", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, (user) => user.department),
    __metadata("design:type", Array)
], Department.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => department_entity_assignment_entity_1.DepartmentEntityAssignment, (assignment) => assignment.department),
    __metadata("design:type", Array)
], Department.prototype, "entityAssignments", void 0);
exports.Department = Department = __decorate([
    (0, typeorm_1.Entity)('departments'),
    (0, typeorm_1.Unique)('unique_department_name_per_business', ['name', 'businessId'])
], Department);
//# sourceMappingURL=department.entity.js.map
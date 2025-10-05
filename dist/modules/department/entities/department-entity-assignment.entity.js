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
exports.DepartmentEntityAssignment = void 0;
const typeorm_1 = require("typeorm");
const class_validator_1 = require("class-validator");
const base_entity_1 = require("../../../common/entities/base.entity");
const department_entity_1 = require("./department.entity");
const entity_entity_1 = require("../../entity/entities/entity.entity");
let DepartmentEntityAssignment = class DepartmentEntityAssignment extends base_entity_1.BaseEntity {
};
exports.DepartmentEntityAssignment = DepartmentEntityAssignment;
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, class_validator_1.IsUUID)(4, { message: 'DepartmentId must be a valid UUID' }),
    __metadata("design:type", String)
], DepartmentEntityAssignment.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    (0, class_validator_1.IsUUID)(4, { message: 'EntityId must be a valid UUID' }),
    __metadata("design:type", String)
], DepartmentEntityAssignment.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    (0, class_validator_1.IsBoolean)({ message: 'isPrimary must be a boolean value' }),
    __metadata("design:type", Boolean)
], DepartmentEntityAssignment.prototype, "isPrimary", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => department_entity_1.Department, (department) => department.entityAssignments),
    (0, typeorm_1.JoinColumn)({ name: 'department_id' }),
    __metadata("design:type", department_entity_1.Department)
], DepartmentEntityAssignment.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => entity_entity_1.Entity, (entity) => entity.departmentAssignments),
    (0, typeorm_1.JoinColumn)({ name: 'entity_id' }),
    __metadata("design:type", entity_entity_1.Entity)
], DepartmentEntityAssignment.prototype, "entity", void 0);
exports.DepartmentEntityAssignment = DepartmentEntityAssignment = __decorate([
    (0, typeorm_1.Entity)('department_entity_assignments'),
    (0, typeorm_1.Unique)(['departmentId', 'entityId'])
], DepartmentEntityAssignment);
//# sourceMappingURL=department-entity-assignment.entity.js.map
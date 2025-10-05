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
exports.Entity = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("../../../common/entities/base.entity");
const department_entity_assignment_entity_1 = require("../../department/entities/department-entity-assignment.entity");
let Entity = class Entity extends base_entity_1.BaseEntity {
};
exports.Entity = Entity;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Entity.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, unique: true }),
    __metadata("design:type", String)
], Entity.prototype, "kahaId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 12 }),
    __metadata("design:type", String)
], Entity.prototype, "geohash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Entity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'geography',
        spatialFeatureType: 'Point',
        srid: 4326,
    }),
    __metadata("design:type", Object)
], Entity.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'integer', default: 100 }),
    __metadata("design:type", Number)
], Entity.prototype, "radiusMeters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Entity.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Entity.prototype, "coverImageUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Entity.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => department_entity_assignment_entity_1.DepartmentEntityAssignment, (assignment) => assignment.entity),
    __metadata("design:type", Array)
], Entity.prototype, "departmentAssignments", void 0);
exports.Entity = Entity = __decorate([
    (0, typeorm_1.Entity)('entities')
], Entity);
//# sourceMappingURL=entity.entity.js.map
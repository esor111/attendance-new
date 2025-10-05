import { Entity as TypeOrmEntity, Column, OneToMany } from 'typeorm';
import { Point } from 'geojson';
import { BaseEntity } from '../../../common/entities/base.entity';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';

/**
 * Entity (Business Location) - Represents physical business locations with geospatial data
 * Uses PostGIS for location storage and spatial operations
 * Extends BaseEntity for consistent UUID and timestamp management
 */
@TypeOrmEntity('entities')
export class Entity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  kahaId: string; // Unique identifier for the business location

  @Column({ type: 'varchar', length: 12 })
  geohash: string; // For efficient proximity pre-filtering

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326, // WGS84 coordinate system
  })
  location: Point; // PostGIS geography point for precise location

  @Column({ type: 'integer', default: 100 })
  radiusMeters: number; // Allowed check-in radius in meters

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'text', nullable: true })
  coverImageUrl: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(
    () => DepartmentEntityAssignment,
    (assignment) => assignment.entity,
  )
  departmentAssignments: DepartmentEntityAssignment[];
}
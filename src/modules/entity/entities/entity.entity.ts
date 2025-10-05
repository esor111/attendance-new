import { Entity as TypeOrmEntity, Column, OneToMany } from 'typeorm';
import { Point } from 'geojson';
import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';
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
  @IsString()
  @Length(1, 255, { message: 'Name must be between 1 and 255 characters' })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString()
  @Length(1, 100, { message: 'KahaId must be between 1 and 100 characters' })
  kahaId: string; // Unique identifier for the business location

  @Column({ type: 'varchar', length: 12 })
  @IsString()
  geohash: string; // For efficient proximity pre-filtering

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326, // WGS84 coordinate system
  })
  location: Point; // PostGIS geography point for precise location

  @Column({ type: 'integer', default: 100 })
  @IsNumber()
  @Min(10, { message: 'Radius must be at least 10 meters' })
  @Max(1000, { message: 'Radius cannot exceed 1000 meters' })
  radiusMeters: number; // Allowed check-in radius in meters

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @OneToMany(
    () => DepartmentEntityAssignment,
    (assignment) => assignment.entity,
    { cascade: ['remove'] }
  )
  departmentAssignments: DepartmentEntityAssignment[];
}
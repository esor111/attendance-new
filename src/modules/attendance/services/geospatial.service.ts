import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity as BusinessEntity } from '../../entity/entities/entity.entity';
import { UserEntityAssignmentRepository } from '../repositories/user-entity-assignment.repository';
import { DepartmentEntityAssignment } from '../../department/entities/department-entity-assignment.entity';
import { User } from '../../user/entities/user.entity';
import {
  GeospatialServiceInterface,
  EntityDistanceResult,
  LocationValidationResult,
} from '../interfaces/attendance.interface';

/**
 * Geospatial Service - Handles location calculations and entity access resolution
 * Implements Haversine formula for distance calculations and PostGIS integration
 * Manages user entity access through both direct assignments and department assignments
 */
@Injectable()
export class GeospatialService implements GeospatialServiceInterface {
  constructor(
    @InjectRepository(BusinessEntity)
    private readonly entityRepository: Repository<BusinessEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(DepartmentEntityAssignment)
    private readonly departmentEntityRepository: Repository<DepartmentEntityAssignment>,
    private readonly userEntityAssignmentRepository: UserEntityAssignmentRepository,
  ) {}

  /**
   * Calculate distance between two coordinates using Haversine formula
   * Returns distance in meters with high precision for geospatial operations
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180; // φ, λ in radians
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Calculate travel speed between two points
   * Returns speed in km/h for fraud detection analysis
   */
  calculateTravelSpeed(distance: number, timeMinutes: number): number {
    if (timeMinutes <= 0) return 0;
    
    const distanceKm = distance / 1000; // Convert meters to kilometers
    const timeHours = timeMinutes / 60; // Convert minutes to hours
    
    return distanceKm / timeHours;
  }

  /**
   * Check if coordinates are within entity radius
   */
  isWithinRadius(
    entityLat: number,
    entityLng: number,
    userLat: number,
    userLng: number,
    radiusMeters: number,
  ): boolean {
    const distance = this.calculateDistance(entityLat, entityLng, userLat, userLng);
    return distance <= radiusMeters;
  }

  /**
   * Find nearest authorized entity for a user at given coordinates
   * Considers both user-specific and department-based entity assignments
   */
  async findNearestAuthorizedEntity(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<EntityDistanceResult> {
    const authorizedEntities = await this.getAuthorizedEntities(userId);
    
    if (authorizedEntities.length === 0) {
      throw new Error('No authorized entities found for user');
    }

    let nearestEntity: EntityDistanceResult | null = null;
    let minDistance = Infinity;

    for (const entity of authorizedEntities) {
      const entityLat = entity.location.coordinates[1]; // PostGIS stores as [lng, lat]
      const entityLng = entity.location.coordinates[0];
      
      const distance = this.calculateDistance(entityLat, entityLng, latitude, longitude);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestEntity = {
          entityId: entity.id,
          entityName: entity.name,
          distance,
          isWithinRadius: distance <= entity.radiusMeters,
          latitude: entityLat,
          longitude: entityLng,
          radiusMeters: entity.radiusMeters,
        };
      }
    }

    if (!nearestEntity) {
      throw new Error('Unable to determine nearest entity');
    }

    return nearestEntity;
  }

  /**
   * Validate user location access against authorized entities
   * Returns validation result with entity information or error details
   */
  async validateLocationAccess(
    userId: string,
    latitude: number,
    longitude: number,
  ): Promise<LocationValidationResult> {
    try {
      const nearestEntity = await this.findNearestAuthorizedEntity(userId, latitude, longitude);
      
      if (nearestEntity.isWithinRadius) {
        return {
          isValid: true,
          entity: nearestEntity,
        };
      } else {
        // Get nearby entities for suggestions
        const nearbyEntities = await this.getNearbyEntities(userId, latitude, longitude, 5);
        
        return {
          isValid: false,
          errorMessage: `Location is ${Math.round(nearestEntity.distance)}m from nearest authorized entity "${nearestEntity.entityName}" (radius: ${nearestEntity.radiusMeters}m)`,
          nearestEntities: nearbyEntities,
        };
      }
    } catch (error) {
      return {
        isValid: false,
        errorMessage: error.message || 'Unable to validate location access',
      };
    }
  }

  /**
   * Get all authorized entities for a user (user-specific + department-based)
   * User-specific assignments take priority over department assignments
   */
  private async getAuthorizedEntities(userId: string): Promise<BusinessEntity[]> {
    // First, get user-specific entity assignments
    const userAssignments = await this.userEntityAssignmentRepository.getAuthorizedEntitiesWithDetails(userId);
    const userEntityIds = userAssignments.map(assignment => assignment.entityId);
    
    // If user has specific assignments, use those exclusively
    if (userEntityIds.length > 0) {
      return userAssignments.map(assignment => assignment.entity);
    }

    // Otherwise, get department-based assignments
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['department'],
    });

    if (!user || !user.departmentId) {
      return [];
    }

    const departmentAssignments = await this.departmentEntityRepository.find({
      where: { departmentId: user.departmentId },
      relations: ['entity'],
    });

    return departmentAssignments.map(assignment => assignment.entity);
  }

  /**
   * Get nearby entities for location suggestions
   */
  private async getNearbyEntities(
    userId: string,
    latitude: number,
    longitude: number,
    limit: number = 5,
  ): Promise<EntityDistanceResult[]> {
    const authorizedEntities = await this.getAuthorizedEntities(userId);
    
    const entitiesWithDistance = authorizedEntities.map(entity => {
      const entityLat = entity.location.coordinates[1];
      const entityLng = entity.location.coordinates[0];
      const distance = this.calculateDistance(entityLat, entityLng, latitude, longitude);
      
      return {
        entityId: entity.id,
        entityName: entity.name,
        distance,
        isWithinRadius: distance <= entity.radiusMeters,
        latitude: entityLat,
        longitude: entityLng,
        radiusMeters: entity.radiusMeters,
      };
    });

    // Sort by distance and return top results
    return entitiesWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }

  /**
   * Get entity by ID with location data
   */
  async getEntityById(entityId: string): Promise<BusinessEntity | null> {
    return await this.entityRepository.findOne({
      where: { id: entityId },
    });
  }

  /**
   * Check if user has access to specific entity
   */
  async hasEntityAccess(userId: string, entityId: string): Promise<boolean> {
    const authorizedEntities = await this.getAuthorizedEntities(userId);
    return authorizedEntities.some(entity => entity.id === entityId);
  }
}
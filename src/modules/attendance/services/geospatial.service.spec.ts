import { Test, TestingModule } from '@nestjs/testing';
import { GeospatialService } from './geospatial.service';
import { EntityAccessService } from './entity-access.service';
import { GeospatialCalculationException } from '../../../common/exceptions/attendance.exceptions';

/**
 * Geospatial Service Unit Tests
 * Tests distance calculations, travel speed analysis, and location validation
 * Requirements: 2.1, 2.2, 7.1, 7.2, 7.3
 */
describe('GeospatialService', () => {
  let service: GeospatialService;
  let entityAccessService: EntityAccessService;

  // Known coordinate test data with pre-calculated distances
  const testCoordinates = {
    // Kathmandu, Nepal coordinates
    kathmandu: { lat: 27.7172, lng: 85.3240 },
    // Bhaktapur, Nepal (approximately 13km from Kathmandu)
    bhaktapur: { lat: 27.6710, lng: 85.4298 },
    // Lalitpur, Nepal (approximately 5km from Kathmandu)
    lalitpur: { lat: 27.6588, lng: 85.3247 },
    // Pokhara, Nepal (approximately 200km from Kathmandu)
    pokhara: { lat: 28.2096, lng: 83.9856 },
    
    // Edge cases
    northPole: { lat: 90, lng: 0 },
    southPole: { lat: -90, lng: 0 },
    equatorPrime: { lat: 0, lng: 0 },
    dateLine: { lat: 0, lng: 180 },
    
    // Close proximity (within 100m)
    office1: { lat: 27.717200, lng: 85.324000 },
    office2: { lat: 27.717250, lng: 85.324050 }, // ~50m away
    
    // Medium distance (1-10km)
    site1: { lat: 27.7172, lng: 85.3240 },
    site2: { lat: 27.7272, lng: 85.3340 }, // ~1.4km away
    
    // Long distance (>50km)
    city1: { lat: 27.7172, lng: 85.3240 },
    city2: { lat: 28.2096, lng: 83.9856 }, // ~200km away
  };

  beforeEach(async () => {
    const mockEntityAccessService = {
      getAuthorizedEntities: jest.fn(),
      findNearestAuthorizedEntity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeospatialService,
        {
          provide: EntityAccessService,
          useValue: mockEntityAccessService,
        },
      ],
    }).compile();

    service = module.get<GeospatialService>(GeospatialService);
    entityAccessService = module.get<EntityAccessService>(EntityAccessService);
  });

  describe('calculateDistance', () => {
    it('should calculate distance between Kathmandu and Bhaktapur correctly', () => {
      const distance = service.calculateDistance(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.bhaktapur.lat,
        testCoordinates.bhaktapur.lng
      );

      // Expected distance is approximately 13km (13000m)
      expect(distance).toBeGreaterThan(12000);
      expect(distance).toBeLessThan(14000);
    });

    it('should calculate distance between Kathmandu and Lalitpur correctly', () => {
      const distance = service.calculateDistance(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.lalitpur.lat,
        testCoordinates.lalitpur.lng
      );

      // Expected distance is approximately 5km (5000m)
      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(6000);
    });

    it('should calculate distance between Kathmandu and Pokhara correctly', () => {
      const distance = service.calculateDistance(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.pokhara.lat,
        testCoordinates.pokhara.lng
      );

      // Expected distance is approximately 200km (200000m)
      expect(distance).toBeGreaterThan(190000);
      expect(distance).toBeLessThan(210000);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = service.calculateDistance(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng
      );

      expect(distance).toBe(0);
    });

    it('should handle edge cases - North Pole to South Pole', () => {
      const distance = service.calculateDistance(
        testCoordinates.northPole.lat,
        testCoordinates.northPole.lng,
        testCoordinates.southPole.lat,
        testCoordinates.southPole.lng
      );

      // Half the Earth's circumference (~20,000km)
      expect(distance).toBeGreaterThan(19900000);
      expect(distance).toBeLessThan(20100000);
    });

    it('should handle crossing the date line', () => {
      const distance = service.calculateDistance(
        0, 179,
        0, -179
      );

      // Should be approximately 222km (shortest path across date line)
      expect(distance).toBeGreaterThan(200000);
      expect(distance).toBeLessThan(250000);
    });

    it('should calculate short distances accurately', () => {
      const distance = service.calculateDistance(
        testCoordinates.office1.lat,
        testCoordinates.office1.lng,
        testCoordinates.office2.lat,
        testCoordinates.office2.lng
      );

      // Expected distance is approximately 50m
      expect(distance).toBeGreaterThan(40);
      expect(distance).toBeLessThan(60);
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => {
        service.calculateDistance(91, 0, 0, 0);
      }).toThrow(GeospatialCalculationException);

      expect(() => {
        service.calculateDistance(0, 181, 0, 0);
      }).toThrow(GeospatialCalculationException);
    });
  });

  describe('calculateTravelSpeed', () => {
    it('should calculate speed correctly for normal travel', () => {
      const distance = 5000; // 5km
      const timeMinutes = 10; // 10 minutes
      
      const speed = service.calculateTravelSpeed(distance, timeMinutes);
      
      // 5km in 10 minutes = 30 km/h
      expect(speed).toBe(30);
    });

    it('should calculate speed for walking pace', () => {
      const distance = 1000; // 1km
      const timeMinutes = 12; // 12 minutes
      
      const speed = service.calculateTravelSpeed(distance, timeMinutes);
      
      // 1km in 12 minutes = 5 km/h (walking pace)
      expect(speed).toBe(5);
    });

    it('should calculate speed for driving', () => {
      const distance = 50000; // 50km
      const timeMinutes = 60; // 60 minutes
      
      const speed = service.calculateTravelSpeed(distance, timeMinutes);
      
      // 50km in 60 minutes = 50 km/h
      expect(speed).toBe(50);
    });

    it('should handle very short distances', () => {
      const distance = 10; // 10m
      const timeMinutes = 1; // 1 minute
      
      const speed = service.calculateTravelSpeed(distance, timeMinutes);
      
      // 10m in 1 minute = 0.6 km/h
      expect(speed).toBe(0.6);
    });

    it('should handle zero distance', () => {
      const distance = 0;
      const timeMinutes = 10;
      
      const speed = service.calculateTravelSpeed(distance, timeMinutes);
      
      expect(speed).toBe(0);
    });

    it('should throw error for zero or negative time', () => {
      expect(() => {
        service.calculateTravelSpeed(1000, 0);
      }).toThrow(GeospatialCalculationException);

      expect(() => {
        service.calculateTravelSpeed(1000, -5);
      }).toThrow(GeospatialCalculationException);
    });

    it('should throw error for negative distance', () => {
      expect(() => {
        service.calculateTravelSpeed(-1000, 10);
      }).toThrow(GeospatialCalculationException);
    });
  });

  describe('isWithinRadius', () => {
    it('should return true when location is within radius', () => {
      const result = service.isWithinRadius(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.office2.lat,
        testCoordinates.office2.lng,
        100 // 100m radius
      );

      expect(result).toBe(true);
    });

    it('should return false when location is outside radius', () => {
      const result = service.isWithinRadius(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.bhaktapur.lat,
        testCoordinates.bhaktapur.lng,
        1000 // 1km radius (Bhaktapur is ~13km away)
      );

      expect(result).toBe(false);
    });

    it('should handle exact radius boundary', () => {
      // Calculate exact distance first
      const distance = service.calculateDistance(
        testCoordinates.office1.lat,
        testCoordinates.office1.lng,
        testCoordinates.office2.lat,
        testCoordinates.office2.lng
      );

      // Test with radius exactly equal to distance
      const result = service.isWithinRadius(
        testCoordinates.office1.lat,
        testCoordinates.office1.lng,
        testCoordinates.office2.lat,
        testCoordinates.office2.lng,
        Math.floor(distance) // Should be within
      );

      expect(result).toBe(true);
    });

    it('should handle zero radius', () => {
      const result = service.isWithinRadius(
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng,
        0
      );

      expect(result).toBe(true); // Same location, zero radius
    });
  });

  describe('validateLocationAccess', () => {
    it('should validate location access successfully', async () => {
      const mockEntity = {
        id: 'entity-1',
        name: 'Test Office',
        latitude: testCoordinates.kathmandu.lat,
        longitude: testCoordinates.kathmandu.lng,
        radiusMeters: 100,
      };

      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: mockEntity,
          distance: 50,
          isWithinRadius: true,
        });

      const result = await service.validateLocationAccess(
        'user-1',
        testCoordinates.office2.lat,
        testCoordinates.office2.lng
      );

      expect(result.isValid).toBe(true);
      expect(result.entity).toEqual(mockEntity);
      expect(result.distance).toBe(50);
    });

    it('should reject location access when outside radius', async () => {
      const mockEntity = {
        id: 'entity-1',
        name: 'Test Office',
        latitude: testCoordinates.kathmandu.lat,
        longitude: testCoordinates.kathmandu.lng,
        radiusMeters: 100,
      };

      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue({
          entity: mockEntity,
          distance: 150,
          isWithinRadius: false,
        });

      const result = await service.validateLocationAccess(
        'user-1',
        testCoordinates.bhaktapur.lat,
        testCoordinates.bhaktapur.lng
      );

      expect(result.isValid).toBe(false);
      expect(result.distance).toBe(150);
    });

    it('should handle no authorized entities', async () => {
      jest.spyOn(entityAccessService, 'findNearestAuthorizedEntity')
        .mockResolvedValue(null);

      const result = await service.validateLocationAccess(
        'user-1',
        testCoordinates.kathmandu.lat,
        testCoordinates.kathmandu.lng
      );

      expect(result.isValid).toBe(false);
      expect(result.entity).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should calculate distances efficiently for multiple coordinates', () => {
      const startTime = Date.now();
      
      // Calculate 1000 distance calculations
      for (let i = 0; i < 1000; i++) {
        service.calculateDistance(
          testCoordinates.kathmandu.lat + (Math.random() - 0.5) * 0.01,
          testCoordinates.kathmandu.lng + (Math.random() - 0.5) * 0.01,
          testCoordinates.lalitpur.lat + (Math.random() - 0.5) * 0.01,
          testCoordinates.lalitpur.lng + (Math.random() - 0.5) * 0.01
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 1000 calculations in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should handle precision edge cases', () => {
      // Test with very high precision coordinates
      const distance1 = service.calculateDistance(
        27.717200000001,
        85.324000000001,
        27.717200000002,
        85.324000000002
      );

      // Should handle micro-movements (sub-meter precision)
      expect(distance1).toBeGreaterThan(0);
      expect(distance1).toBeLessThan(1);
    });
  });

  describe('Error Handling', () => {
    it('should validate coordinate ranges in distance calculation', () => {
      expect(() => {
        service.calculateDistance(91, 0, 0, 0);
      }).toThrow('Latitude must be between -90 and 90 degrees');

      expect(() => {
        service.calculateDistance(0, 181, 0, 0);
      }).toThrow('Longitude must be between -180 and 180 degrees');
    });

    it('should handle NaN and Infinity values', () => {
      expect(() => {
        service.calculateDistance(NaN, 0, 0, 0);
      }).toThrow(GeospatialCalculationException);

      expect(() => {
        service.calculateDistance(Infinity, 0, 0, 0);
      }).toThrow(GeospatialCalculationException);
    });

    it('should validate radius values', () => {
      expect(() => {
        service.isWithinRadius(0, 0, 0, 0, -1);
      }).toThrow('Radius cannot be negative');

      expect(() => {
        service.isWithinRadius(0, 0, 0, 0, NaN);
      }).toThrow(GeospatialCalculationException);
    });
  });
});
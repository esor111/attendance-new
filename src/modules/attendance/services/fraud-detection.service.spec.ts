import { Test, TestingModule } from '@nestjs/testing';
import { FraudDetectionService } from './fraud-detection.service';
import { GeospatialService } from './geospatial.service';
import { FraudDetectionException } from '../../../common/exceptions/attendance.exceptions';

/**
 * Fraud Detection Service Unit Tests
 * Tests fraud detection algorithms with various speed scenarios and patterns
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
describe('FraudDetectionService', () => {
  let service: FraudDetectionService;
  let geospatialService: GeospatialService;

  // Test scenarios with known travel speeds
  const travelScenarios = {
    // Walking scenarios (1-6 km/h)
    walking: {
      slow: { distance: 500, timeMinutes: 10, expectedSpeed: 3 }, // 500m in 10min = 3km/h
      normal: { distance: 1000, timeMinutes: 12, expectedSpeed: 5 }, // 1km in 12min = 5km/h
      fast: { distance: 1500, timeMinutes: 15, expectedSpeed: 6 }, // 1.5km in 15min = 6km/h
    },
    
    // Cycling scenarios (10-25 km/h)
    cycling: {
      leisure: { distance: 2000, timeMinutes: 12, expectedSpeed: 10 }, // 2km in 12min = 10km/h
      normal: { distance: 5000, timeMinutes: 20, expectedSpeed: 15 }, // 5km in 20min = 15km/h
      fast: { distance: 10000, timeMinutes: 24, expectedSpeed: 25 }, // 10km in 24min = 25km/h
    },
    
    // Driving scenarios (30-80 km/h)
    driving: {
      city: { distance: 10000, timeMinutes: 20, expectedSpeed: 30 }, // 10km in 20min = 30km/h
      highway: { distance: 50000, timeMinutes: 40, expectedSpeed: 75 }, // 50km in 40min = 75km/h
      traffic: { distance: 5000, timeMinutes: 15, expectedSpeed: 20 }, // 5km in 15min = 20km/h
    },
    
    // Suspicious scenarios (>100 km/h)
    suspicious: {
      impossible: { distance: 100000, timeMinutes: 30, expectedSpeed: 200 }, // 100km in 30min = 200km/h
      teleport: { distance: 50000, timeMinutes: 5, expectedSpeed: 600 }, // 50km in 5min = 600km/h
      airplane: { distance: 500000, timeMinutes: 60, expectedSpeed: 500 }, // 500km in 60min = 500km/h
    },
    
    // Edge cases
    edge: {
      sameLocation: { distance: 0, timeMinutes: 10, expectedSpeed: 0 }, // No movement
      microMovement: { distance: 5, timeMinutes: 1, expectedSpeed: 0.3 }, // 5m in 1min = 0.3km/h
      instantaneous: { distance: 1000, timeMinutes: 0.1, expectedSpeed: 600 }, // 1km in 6sec = 600km/h
    }
  };

  // Known coordinate pairs for testing
  const testLocations = {
    office: { lat: 27.7172, lng: 85.3240 },
    nearbyShop: { lat: 27.7175, lng: 85.3245 }, // ~50m away
    distantOffice: { lat: 27.7272, lng: 85.3340 }, // ~1.4km away
    anotherCity: { lat: 28.2096, lng: 83.9856 }, // ~200km away
    suspiciousLocation: { lat: 0, lng: 0 }, // Null Island - suspicious
  };

  beforeEach(async () => {
    const mockGeospatialService = {
      calculateDistance: jest.fn(),
      calculateTravelSpeed: jest.fn(),
      isWithinRadius: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudDetectionService,
        {
          provide: GeospatialService,
          useValue: mockGeospatialService,
        },
      ],
    }).compile();

    service = module.get<FraudDetectionService>(FraudDetectionService);
    geospatialService = module.get<GeospatialService>(GeospatialService);
  });

  describe('validateTravelSpeed', () => {
    it('should allow normal walking speeds', async () => {
      const scenario = travelScenarios.walking.normal;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.nearbyShop,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.travelSpeed).toBe(scenario.expectedSpeed);
      expect(result.fraudType).toBeNull();
    });

    it('should allow normal cycling speeds', async () => {
      const scenario = travelScenarios.cycling.normal;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.distantOffice,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.travelSpeed).toBe(scenario.expectedSpeed);
    });

    it('should allow normal driving speeds', async () => {
      const scenario = travelScenarios.driving.city;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.distantOffice,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.travelSpeed).toBe(scenario.expectedSpeed);
    });

    it('should flag impossible travel speeds', async () => {
      const scenario = travelScenarios.suspicious.impossible;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.anotherCity,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(false);
      expect(result.fraudType).toBe('impossible_travel_speed');
      expect(result.travelSpeed).toBe(scenario.expectedSpeed);
    });

    it('should flag teleportation-like speeds', async () => {
      const scenario = travelScenarios.suspicious.teleport;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.anotherCity,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(false);
      expect(result.fraudType).toBe('impossible_travel_speed');
      expect(result.travelSpeed).toBeGreaterThan(500);
    });

    it('should handle same location (no movement)', async () => {
      const scenario = travelScenarios.edge.sameLocation;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.office,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.travelSpeed).toBe(0);
    });

    it('should handle micro-movements correctly', async () => {
      const scenario = travelScenarios.edge.microMovement;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        { lat: 27.717201, lng: 85.324001 }, // Very close
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.isValid).toBe(true);
      expect(result.travelSpeed).toBeLessThan(1);
    });

    it('should use custom speed thresholds', async () => {
      const scenario = travelScenarios.driving.highway;
      
      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(scenario.distance);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(scenario.expectedSpeed);

      // Test with lower threshold (should flag)
      const result1 = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.anotherCity,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date(),
        50 // 50 km/h threshold
      );

      expect(result1.isValid).toBe(false);

      // Test with higher threshold (should pass)
      const result2 = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.anotherCity,
        new Date(Date.now() - scenario.timeMinutes * 60 * 1000),
        new Date(),
        100 // 100 km/h threshold
      );

      expect(result2.isValid).toBe(true);
    });
  });

  describe('detectLocationSpoofing', () => {
    it('should detect suspicious coordinate patterns', async () => {
      const suspiciousCoordinates = [
        { lat: 0, lng: 0 }, // Null Island
        { lat: 1.111111, lng: 1.111111 }, // Repeated digits
        { lat: 12.345678, lng: 12.345678 }, // Sequential pattern
        { lat: 90, lng: 180 }, // Extreme values
      ];

      for (const coord of suspiciousCoordinates) {
        const result = await service.detectLocationSpoofing('user-1', coord);
        expect(result.isSuspicious).toBe(true);
        expect(result.fraudType).toBe('location_spoofing');
      }
    });

    it('should allow normal coordinate patterns', async () => {
      const normalCoordinates = [
        testLocations.office,
        testLocations.nearbyShop,
        testLocations.distantOffice,
        { lat: 27.123456, lng: 85.987654 }, // Normal precision
      ];

      for (const coord of normalCoordinates) {
        const result = await service.detectLocationSpoofing('user-1', coord);
        expect(result.isSuspicious).toBe(false);
      }
    });

    it('should detect excessive coordinate precision', async () => {
      const highPrecisionCoord = {
        lat: 27.71720000000001,
        lng: 85.32400000000001
      };

      const result = await service.detectLocationSpoofing('user-1', highPrecisionCoord);
      expect(result.isSuspicious).toBe(true);
      expect(result.reason).toContain('excessive precision');
    });
  });

  describe('analyzeLocationPattern', () => {
    it('should detect repeated use of same location', async () => {
      const locationHistory = [
        { ...testLocations.office, timestamp: new Date(Date.now() - 86400000) }, // 1 day ago
        { ...testLocations.office, timestamp: new Date(Date.now() - 43200000) }, // 12 hours ago
        { ...testLocations.office, timestamp: new Date() }, // Now
      ];

      const result = await service.analyzeLocationPattern('user-1', locationHistory);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.fraudType).toBe('suspicious_location_pattern');
      expect(result.pattern).toBe('repeated_exact_location');
    });

    it('should detect rapid location changes', async () => {
      const locationHistory = [
        { ...testLocations.office, timestamp: new Date(Date.now() - 300000) }, // 5 min ago
        { ...testLocations.anotherCity, timestamp: new Date(Date.now() - 240000) }, // 4 min ago
        { ...testLocations.office, timestamp: new Date() }, // Now
      ];

      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValueOnce(200000) // 200km
        .mockReturnValueOnce(200000); // 200km back

      const result = await service.analyzeLocationPattern('user-1', locationHistory);
      
      expect(result.isSuspicious).toBe(true);
      expect(result.fraudType).toBe('rapid_location_changes');
    });

    it('should allow normal location patterns', async () => {
      const locationHistory = [
        { ...testLocations.office, timestamp: new Date(Date.now() - 28800000) }, // 8 hours ago
        { ...testLocations.nearbyShop, timestamp: new Date(Date.now() - 14400000) }, // 4 hours ago
        { ...testLocations.distantOffice, timestamp: new Date() }, // Now
      ];

      jest.spyOn(geospatialService, 'calculateDistance')
        .mockReturnValueOnce(50) // 50m
        .mockReturnValueOnce(1400); // 1.4km

      const result = await service.analyzeLocationPattern('user-1', locationHistory);
      
      expect(result.isSuspicious).toBe(false);
    });
  });

  describe('validateAttendanceSequence', () => {
    it('should detect time anomalies in attendance sequence', async () => {
      const attendanceEvents = [
        { type: 'clock-in', timestamp: new Date(Date.now() - 28800000) }, // 8 hours ago
        { type: 'session-check-in', timestamp: new Date(Date.now() - 28799000) }, // 1 second later
        { type: 'session-check-out', timestamp: new Date(Date.now() - 28798000) }, // 1 second later
        { type: 'clock-out', timestamp: new Date() },
      ];

      const result = await service.validateAttendanceSequence('user-1', attendanceEvents);
      
      expect(result.isValid).toBe(false);
      expect(result.fraudType).toBe('time_anomaly');
      expect(result.anomalies).toContain('rapid_sequence');
    });

    it('should allow normal attendance sequences', async () => {
      const attendanceEvents = [
        { type: 'clock-in', timestamp: new Date(Date.now() - 28800000) }, // 8 hours ago
        { type: 'session-check-in', timestamp: new Date(Date.now() - 25200000) }, // 1 hour later
        { type: 'session-check-out', timestamp: new Date(Date.now() - 21600000) }, // 1 hour later
        { type: 'clock-out', timestamp: new Date() },
      ];

      const result = await service.validateAttendanceSequence('user-1', attendanceEvents);
      
      expect(result.isValid).toBe(true);
    });

    it('should detect impossible work hours', async () => {
      const attendanceEvents = [
        { type: 'clock-in', timestamp: new Date(Date.now() - 86400000) }, // 24 hours ago
        { type: 'clock-out', timestamp: new Date() }, // Now (24 hour shift)
      ];

      const result = await service.validateAttendanceSequence('user-1', attendanceEvents);
      
      expect(result.isValid).toBe(false);
      expect(result.fraudType).toBe('time_anomaly');
      expect(result.anomalies).toContain('excessive_work_hours');
    });
  });

  describe('Integration Tests', () => {
    it('should perform comprehensive fraud check', async () => {
      const currentLocation = testLocations.anotherCity;
      const previousLocation = testLocations.office;
      const timeMinutes = 10; // 10 minutes for 200km = impossible speed

      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(200000);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(1200); // 1200 km/h

      const result = await service.performComprehensiveFraudCheck(
        'user-1',
        currentLocation,
        previousLocation,
        new Date(Date.now() - timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.overallRisk).toBe('HIGH');
      expect(result.flags).toContain('impossible_travel_speed');
      expect(result.recommendedAction).toBe('BLOCK');
    });

    it('should pass comprehensive check for normal behavior', async () => {
      const currentLocation = testLocations.nearbyShop;
      const previousLocation = testLocations.office;
      const timeMinutes = 10; // 10 minutes for 50m = normal walking

      jest.spyOn(geospatialService, 'calculateDistance').mockReturnValue(50);
      jest.spyOn(geospatialService, 'calculateTravelSpeed').mockReturnValue(0.3); // 0.3 km/h

      const result = await service.performComprehensiveFraudCheck(
        'user-1',
        currentLocation,
        previousLocation,
        new Date(Date.now() - timeMinutes * 60 * 1000),
        new Date()
      );

      expect(result.overallRisk).toBe('LOW');
      expect(result.flags).toHaveLength(0);
      expect(result.recommendedAction).toBe('ALLOW');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle null or undefined locations gracefully', async () => {
      const result = await service.validateTravelSpeed(
        'user-1',
        null,
        testLocations.office,
        new Date(Date.now() - 600000),
        new Date()
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid location data');
    });

    it('should handle invalid time sequences', async () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour in future
      const pastTime = new Date(Date.now() - 3600000); // 1 hour in past

      const result = await service.validateTravelSpeed(
        'user-1',
        testLocations.office,
        testLocations.nearbyShop,
        futureTime, // Future time as "previous"
        pastTime // Past time as "current"
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid time sequence');
    });

    it('should perform efficiently with large datasets', async () => {
      const startTime = Date.now();
      
      // Generate 100 location checks
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          service.validateTravelSpeed(
            `user-${i}`,
            testLocations.office,
            testLocations.nearbyShop,
            new Date(Date.now() - 600000),
            new Date()
          )
        );
      }

      await Promise.all(promises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 fraud checks in less than 1 second
      expect(duration).toBeLessThan(1000);
    });
  });
});
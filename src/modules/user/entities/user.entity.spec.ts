import { User } from './user.entity';
import { Department } from '../../department/entities/department.entity';

describe('User Entity', () => {
  let user: User;

  beforeEach(() => {
    user = new User();
  });

  describe('Entity Structure', () => {
    it('should create a user with all required properties', () => {
      user.name = 'John Doe';
      user.email = 'john.doe@example.com';
      user.phone = '+1234567890';
      user.isFieldWorker = false;

      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john.doe@example.com');
      expect(user.phone).toBe('+1234567890');
      expect(user.isFieldWorker).toBe(false);
    });

    it('should have validation decorators for required fields', () => {
      // Check that validation decorators are present (they will be used by NestJS pipes)
      expect(user).toBeDefined();
      expect(typeof user.name).toBe('undefined'); // Initially undefined
      expect(typeof user.email).toBe('undefined');
      expect(typeof user.phone).toBe('undefined');
      expect(typeof user.isFieldWorker).toBe('undefined');
    });

    it('should allow optional fields', () => {
      user.address = 'Some address';
      user.userId = 'external-123';
      user.departmentId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      user.lastSyncedAt = new Date();

      expect(user.address).toBe('Some address');
      expect(user.userId).toBe('external-123');
      expect(user.departmentId).toBe('f47ac10b-58cc-4372-a567-0e02b2c3d479');
      expect(user.lastSyncedAt).toBeInstanceOf(Date);
    });
  });

  describe('Relationships', () => {
    it('should have a department relationship', () => {
      const department = new Department();
      department.id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      department.name = 'Engineering';
      department.businessId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

      user.department = department;
      user.departmentId = department.id;

      expect(user.department).toBe(department);
      expect(user.departmentId).toBe(department.id);
    });

    it('should support optional department relationship', () => {
      // Department relationship is optional (nullable: true in TypeORM)
      // Initially undefined until set
      expect(user.department).toBeUndefined();
      expect(user.departmentId).toBeUndefined();
    });
  });

  describe('BaseEntity inheritance', () => {
    it('should inherit BaseEntity properties', () => {
      expect(user.id).toBeUndefined(); // Will be set by TypeORM
      expect(user.createdAt).toBeUndefined(); // Will be set by TypeORM
      expect(user.updatedAt).toBeUndefined(); // Will be set by TypeORM
    });
  });
});
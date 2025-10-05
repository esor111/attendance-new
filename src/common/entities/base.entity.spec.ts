import { BaseEntity } from './base.entity';
import { Entity, Column } from 'typeorm';

// Test entity extending BaseEntity
@Entity('test_entities')
class TestEntity extends BaseEntity {
  @Column()
  name: string;
}

describe('BaseEntity', () => {
  let testEntity: TestEntity;

  beforeEach(() => {
    testEntity = new TestEntity();
    testEntity.name = 'Test Entity';
  });

  it('should be instantiable', () => {
    expect(testEntity).toBeInstanceOf(TestEntity);
    expect(testEntity).toBeInstanceOf(BaseEntity);
  });

  it('should allow setting custom properties', () => {
    expect(testEntity.name).toBe('Test Entity');
  });

  it('should have BaseEntity in prototype chain', () => {
    expect(Object.getPrototypeOf(Object.getPrototypeOf(testEntity))).toBe(BaseEntity.prototype);
  });

  it('should be properly decorated with TypeORM decorators', () => {
    // Check that the class has TypeORM metadata (decorators applied)
    expect(Reflect.hasMetadata('design:type', testEntity, 'id')).toBeTruthy();
    expect(Reflect.hasMetadata('design:type', testEntity, 'createdAt')).toBeTruthy();
    expect(Reflect.hasMetadata('design:type', testEntity, 'updatedAt')).toBeTruthy();
  });
});
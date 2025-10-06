import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AttendanceModule } from '../attendance.module';
import { UserModule } from '../../user/user.module';
import { EntityModule } from '../../entity/entity.module';
import { DepartmentModule } from '../../department/department.module';
import { HolidayModule } from '../../holiday/holiday.module';
import { AuthModule } from '../../auth/auth.module';

describe('AttendanceRequestController (Integration)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'attendance_test',
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
        }),
        AttendanceModule,
        UserModule,
        EntityModule,
        DepartmentModule,
        HolidayModule,
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/attendance/request', () => {
    it('should create attendance request successfully', async () => {
      const createRequestDto = {
        requestedDate: '2025-10-01',
        reason: 'Forgot to clock in due to emergency',
      };

      const response = await request(app.getHttpServer())
        .post('/api/attendance/request')
        .send(createRequestDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.reason).toBe(createRequestDto.reason);
    });

    it('should reject request for future date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      
      const createRequestDto = {
        requestedDate: futureDate.toISOString().split('T')[0],
        reason: 'Future request',
      };

      await request(app.getHttpServer())
        .post('/api/attendance/request')
        .send(createRequestDto)
        .expect(400);
    });
  });

  describe('GET /api/attendance/requests', () => {
    it('should return user attendance requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/attendance/requests/pending', () => {
    it('should return pending requests for manager', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/attendance/requests/pending')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/attendance/requests/can-create/:date', () => {
    it('should check if user can create request for date', async () => {
      const testDate = '2025-10-01';
      
      const response = await request(app.getHttpServer())
        .get(`/api/attendance/requests/can-create/${testDate}`)
        .expect(200);

      expect(response.body).toHaveProperty('canCreate');
      expect(typeof response.body.canCreate).toBe('boolean');
    });
  });
});
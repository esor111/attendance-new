# Authentication System Documentation

## Overview

This document describes the centralized authentication system designed for microservices in the Kaha ecosystem. The system provides JWT-based authentication with business context support, enabling secure communication between services while maintaining user and business data synchronization.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Kaha Main Service (v3)                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Auth Service  │  │ Business Service│  │  User Service   │ │
│  │                 │  │                 │  │                 │ │
│  │ - Login         │  │ - Business Data │  │ - User Data     │ │
│  │ - Profile Switch│  │ - Bulk Fetch    │  │ - Bulk Fetch    │ │
│  │ - JWT Generation│  │ - Caching       │  │ - Caching       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ JWT Tokens
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Microservice (Attendance)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Auth Module   │  │Service Comm.    │  │  Application    │ │
│  │                 │  │    Module       │  │    Logic        │ │
│  │ - JWT Verify    │  │ - Business Svc  │  │ - Controllers   │ │
│  │ - Guards        │  │ - User Service  │  │ - Services      │ │
│  │ - Strategies    │  │ - Data Sync     │  │ - Entities      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant KahaMain as Kaha Main v3
    participant Microservice as Attendance Service

    User->>Frontend: Login Request
    Frontend->>KahaMain: POST /auth/login
    KahaMain->>KahaMain: Validate Credentials
    KahaMain->>Frontend: User Token (userId, kahaId)
    
    Note over Frontend: User Token contains basic user info
    
    Frontend->>Microservice: API Request + User Token
    Microservice->>Microservice: Verify JWT
    Microservice->>User: Limited Access (User Context Only)
```

### 2. Business Profile Switch Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant KahaMain as Kaha Main v3
    participant Microservice as Attendance Service

    User->>Frontend: Switch to Business Profile
    Frontend->>KahaMain: POST /auth/switch-profile + businessId
    KahaMain->>KahaMain: Validate Business Access
    KahaMain->>Frontend: Business Token (userId, kahaId, businessId)
    
    Note over Frontend: Business Token contains business context
    
    Frontend->>Microservice: API Request + Business Token
    Microservice->>Microservice: Verify JWT + Extract Business Context
    Microservice->>KahaMain: Sync Business/User Data
    Microservice->>User: Full Access (Business Context)
```

## JWT Token Structure

### User Token (Basic Authentication)
```json
{
  "id": "user-uuid-here",
  "kahaId": "kaha-system-id",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Business Token (Business Context)
```json
{
  "id": "user-uuid-here",
  "kahaId": "kaha-system-id", 
  "businessId": "business-uuid-here",
  "iat": 1640995200,
  "exp": 1641081600
}
```

## Implementation Guide

### 1. Module Setup

#### Install Dependencies
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/axios axios rxjs @nestjs/config
npm install --save-dev @types/passport-jwt
```

#### Environment Variables
```env
# JWT Configuration
JWT_SECRET_TOKEN=your-shared-jwt-secret

# External Service URLs  
KAHA_MAIN_URL=https://dev.kaha.com.np

# Application Configuration
PORT=3000
NODE_ENV=development
```

### 2. Auth Module Integration

#### Import Auth Module
```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ServiceCommunicationModule } from './service-communication/service-communication.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ServiceCommunicationModule,
    // ... other modules
  ],
})
export class AppModule {}
```

### 3. Using Authentication Guards

#### Basic JWT Authentication
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from './auth';
import { JwtPayload } from './auth/interfaces/jwt-payload.interface';

@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: JwtPayload) {
    return {
      userId: user.id,
      kahaId: user.kahaId,
      hasBusinessContext: !!user.businessId
    };
  }
}
```

#### Business Context Required
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { BusinessAuthGuard, CurrentUser } from './auth';
import { JwtPayload } from './auth/interfaces/jwt-payload.interface';

@Controller('business')
export class BusinessController {
  @Get('dashboard')
  @UseGuards(BusinessAuthGuard)
  getDashboard(@CurrentUser() user: JwtPayload) {
    // user.businessId is guaranteed to exist
    return {
      businessId: user.businessId,
      userId: user.id,
      message: 'Business dashboard data'
    };
  }
}
```

#### Optional Authentication
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { OptionalJwtAuthGuard, CurrentUser } from './auth';
import { JwtPayload } from './auth/interfaces/jwt-payload.interface';

@Controller('public')
export class PublicController {
  @Get('data')
  @UseGuards(OptionalJwtAuthGuard)
  getData(@CurrentUser() user?: JwtPayload) {
    if (user) {
      return { message: 'Personalized data', userId: user.id };
    }
    return { message: 'Public data' };
  }
}
```

### 4. Service Communication

#### Fetching Business Data
```typescript
import { Injectable } from '@nestjs/common';
import { BusinessService } from './service-communication';

@Injectable()
export class AttendanceService {
  constructor(private readonly businessService: BusinessService) {}

  async getBusinessAttendance(businessId: string) {
    // Fetch business data from Kaha Main
    const businessData = await this.businessService.getBusinessData(businessId);
    
    if (!businessData) {
      throw new NotFoundException('Business not found');
    }

    // Use business data in your logic
    return {
      businessName: businessData.name,
      attendance: await this.getAttendanceData(businessId)
    };
  }
}
```

#### Fetching User Data
```typescript
import { Injectable } from '@nestjs/common';
import { UserService } from './service-communication';

@Injectable()
export class UserProfileService {
  constructor(private readonly userService: UserService) {}

  async getUserProfile(userId: string) {
    // Fetch user data from Kaha Main
    const userData = await this.userService.getUserData(userId);
    
    return {
      name: userData?.name || 'Unknown User',
      email: userData?.email,
      avatar: userData?.avatar
    };
  }
}
```

## Available Guards

### JwtAuthGuard
- **Purpose**: Basic JWT token validation
- **Requirements**: Valid JWT token
- **Use Case**: Any authenticated endpoint
- **Token Type**: User Token or Business Token

### BusinessAuthGuard  
- **Purpose**: Requires business context
- **Requirements**: Valid JWT token with `businessId`
- **Use Case**: Business-specific operations
- **Token Type**: Business Token only

### OptionalJwtAuthGuard
- **Purpose**: Optional authentication
- **Requirements**: None (token optional)
- **Use Case**: Public endpoints with optional personalization
- **Token Type**: Any or none

## Service Communication Features

### Business Service
- **Bulk Data Fetching**: Fetch multiple businesses in one request
- **Caching**: 10-minute cache for performance
- **Error Handling**: Graceful fallback to cached data
- **Auto-retry**: Built-in retry mechanism

### User Service  
- **Bulk Data Fetching**: Fetch multiple users in one request
- **Caching**: 10-minute cache for performance
- **Error Handling**: Graceful fallback to cached data
- **Auto-retry**: Built-in retry mechanism

## Security Considerations

### JWT Secret Management
- Use strong, unique secrets for each environment
- Rotate secrets regularly
- Never commit secrets to version control
- Use environment variables or secret management systems

### Token Validation
- Always verify token signature
- Check token expiration
- Validate required claims (id, kahaId)
- Handle malformed tokens gracefully

### Business Context Security
- Verify user has access to requested business
- Implement proper authorization checks
- Log security events for auditing
- Rate limit authentication attempts

## Error Handling

### Common Error Scenarios

#### Invalid Token
```typescript
// Automatic handling by guards
throw new UnauthorizedException('Invalid token');
```

#### Expired Token
```typescript
// Automatic handling by guards  
throw new UnauthorizedException('Token has expired');
```

#### Missing Business Context
```typescript
// BusinessAuthGuard handles this
throw new ForbiddenException('Business token required for this endpoint');
```

#### Service Communication Errors
```typescript
// Services handle gracefully
this.logger.error('Failed to fetch business data', error);
// Returns cached data or null
```

## Best Practices

### 1. Guard Selection
- Use `JwtAuthGuard` for basic authentication
- Use `BusinessAuthGuard` for business-specific operations
- Use `OptionalJwtAuthGuard` for public endpoints with optional auth

### 2. Data Synchronization
- Always sync external data when user logs in or switches business
- Cache external data to improve performance
- Handle service unavailability gracefully
- Implement proper error logging

### 3. Token Management
- Validate tokens on every request
- Handle token refresh on the frontend
- Implement proper logout functionality
- Clear cached data on logout

### 4. Performance Optimization
- Use bulk data fetching when possible
- Implement proper caching strategies
- Monitor external service response times
- Implement circuit breakers for external calls

## Migration Guide

### From Custom JWT Implementation

1. **Replace Custom Guards**
   ```typescript
   // Before
   @UseGuards(CustomJwtGuard)
   
   // After  
   @UseGuards(JwtAuthGuard)
   ```

2. **Update User Extraction**
   ```typescript
   // Before
   @Request() req: any
   const user = req.user;
   
   // After
   @CurrentUser() user: JwtPayload
   ```

3. **Add Service Communication**
   ```typescript
   // Add to module imports
   imports: [ServiceCommunicationModule]
   
   // Inject services
   constructor(
     private readonly businessService: BusinessService,
     private readonly userService: UserService,
   ) {}
   ```

### Testing

#### Unit Tests
```typescript
describe('AuthGuard', () => {
  it('should validate JWT token', async () => {
    const mockToken = 'valid.jwt.token';
    const result = await jwtTokenService.verifyToken(mockToken);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });
});
```

#### Integration Tests
```typescript
describe('Business Endpoints', () => {
  it('should require business token', async () => {
    const response = await request(app)
      .get('/business/dashboard')
      .set('Authorization', 'Bearer user-token-without-business')
      .expect(403);
  });
});
```

## Troubleshooting

### Common Issues

1. **Token Verification Fails**
   - Check JWT secret configuration
   - Verify token format and structure
   - Ensure token hasn't expired

2. **Business Context Missing**
   - Verify user has switched to business profile
   - Check businessId in token payload
   - Ensure proper token type is being used

3. **Service Communication Errors**
   - Check network connectivity to Kaha Main
   - Verify service URLs in configuration
   - Check authentication for external service calls

4. **Performance Issues**
   - Monitor cache hit rates
   - Check external service response times
   - Implement proper error handling and fallbacks

## Support and Maintenance

### Monitoring
- Monitor authentication success/failure rates
- Track external service response times
- Log security events and anomalies
- Monitor cache performance

### Updates
- Keep JWT library dependencies updated
- Monitor security advisories
- Update documentation with changes
- Test thoroughly before deploying updates

---

This authentication system provides a robust, scalable foundation for microservice authentication in the Kaha ecosystem. Follow this documentation to ensure consistent implementation across all services.
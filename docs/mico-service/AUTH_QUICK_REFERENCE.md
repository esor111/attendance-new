# Authentication Quick Reference

## Quick Setup Checklist

### 1. Installation
```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt @nestjs/axios axios rxjs @nestjs/config
npm install --save-dev @types/passport-jwt
```

### 2. Environment Setup
```env
JWT_SECRET_TOKEN=your-shared-jwt-secret
KAHA_MAIN_URL=https://dev.kaha.com.np
```

### 3. Module Import
```typescript
// app.module.ts
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  AuthModule,
  ServiceCommunicationModule,
]
```

## Guard Usage Patterns

### Basic Authentication (Any Token)
```typescript
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: JwtPayload) {
  // user.id and user.kahaId available
  // user.businessId may or may not exist
}
```

### Business Context Required
```typescript
@Get('business-data')
@UseGuards(BusinessAuthGuard)
getBusinessData(@CurrentUser() user: JwtPayload) {
  // user.businessId guaranteed to exist
  // Full business context available
}
```

### Optional Authentication
```typescript
@Get('public-data')
@UseGuards(OptionalJwtAuthGuard)
getPublicData(@CurrentUser() user?: JwtPayload) {
  // user can be undefined
  // Handle both authenticated and anonymous users
}
```

## Service Communication

### Fetch Business Data
```typescript
constructor(private readonly businessService: BusinessService) {}

async someMethod(businessId: string) {
  const business = await this.businessService.getBusinessData(businessId);
  // Returns BusinessData or null
}
```

### Fetch User Data
```typescript
constructor(private readonly userService: UserService) {}

async someMethod(userId: string) {
  const user = await this.userService.getUserData(userId);
  // Returns UserData or null
}
```

### Bulk Operations
```typescript
// Fetch multiple businesses
const businesses = await this.businessService.getBulkBusinessData(['id1', 'id2']);
// Returns Map<string, BusinessData>

// Fetch multiple users  
const users = await this.userService.getBulkUserData(['id1', 'id2']);
// Returns Map<string, UserData>
```

## Token Types

### User Token (Basic)
```json
{
  "id": "user-id",
  "kahaId": "kaha-id",
  "iat": 1640995200,
  "exp": 1641081600
}
```

### Business Token (Full Context)
```json
{
  "id": "user-id", 
  "kahaId": "kaha-id",
  "businessId": "business-id",
  "iat": 1640995200,
  "exp": 1641081600
}
```

## Common Patterns

### Controller with Business Context
```typescript
@Controller('attendance')
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly businessService: BusinessService,
  ) {}

  @Get()
  @UseGuards(BusinessAuthGuard)
  async getAttendance(@CurrentUser() user: JwtPayload) {
    // Get business info
    const business = await this.businessService.getBusinessData(user.businessId);
    
    // Get attendance data for this business
    return this.attendanceService.getAttendanceForBusiness(user.businessId);
  }
}
```

### Service with User Data
```typescript
@Injectable()
export class AttendanceService {
  constructor(
    private readonly userService: UserService,
  ) {}

  async recordAttendance(userId: string, businessId: string) {
    // Get user details
    const user = await this.userService.getUserData(userId);
    
    // Record attendance with user info
    return this.createAttendanceRecord({
      userId,
      userName: user?.name || 'Unknown',
      businessId,
      timestamp: new Date(),
    });
  }
}
```

## Error Handling

### Guard Errors (Automatic)
- `401 Unauthorized`: Invalid/expired token
- `403 Forbidden`: Missing business context (BusinessAuthGuard)

### Service Communication Errors
```typescript
try {
  const business = await this.businessService.getBusinessData(businessId);
  if (!business) {
    throw new NotFoundException('Business not found');
  }
} catch (error) {
  this.logger.error('Failed to fetch business data', error);
  // Handle gracefully - service returns null on error
}
```

## Testing

### Mock JWT Payload
```typescript
const mockUser: JwtPayload = {
  id: 'user-123',
  kahaId: 'kaha-456', 
  businessId: 'business-789',
  iat: Date.now(),
  exp: Date.now() + 3600000,
};
```

### Mock Services
```typescript
const mockBusinessService = {
  getBusinessData: jest.fn().mockResolvedValue({
    id: 'business-123',
    name: 'Test Business',
  }),
};
```

## Debugging

### Enable Debug Logging
```typescript
// In service constructors
private readonly logger = new Logger(ServiceName.name);

// Log authentication events
this.logger.debug(`User ${user.id} authenticated for business ${user.businessId}`);
```

### Check Token Contents
```typescript
// In development only
console.log('Token payload:', user);
console.log('Has business context:', !!user.businessId);
```

## Migration Checklist

- [ ] Install required dependencies
- [ ] Set up environment variables
- [ ] Import AuthModule and ServiceCommunicationModule
- [ ] Replace custom guards with provided guards
- [ ] Update user extraction to use @CurrentUser()
- [ ] Add service communication for external data
- [ ] Update tests to use new interfaces
- [ ] Test authentication flows
- [ ] Test business context requirements
- [ ] Verify service communication works

## Common Mistakes

❌ **Don't do this:**
```typescript
// Using wrong guard for business operations
@UseGuards(JwtAuthGuard) // Should be BusinessAuthGuard
getBusinessData(@CurrentUser() user: JwtPayload) {
  // user.businessId might be undefined!
  return this.businessService.getBusinessData(user.businessId);
}
```

✅ **Do this:**
```typescript
// Use correct guard for business operations
@UseGuards(BusinessAuthGuard)
getBusinessData(@CurrentUser() user: JwtPayload) {
  // user.businessId is guaranteed to exist
  return this.businessService.getBusinessData(user.businessId);
}
```

❌ **Don't do this:**
```typescript
// Ignoring service communication errors
const business = await this.businessService.getBusinessData(businessId);
return business.name; // Will throw if business is null
```

✅ **Do this:**
```typescript
// Handle service communication gracefully
const business = await this.businessService.getBusinessData(businessId);
if (!business) {
  throw new NotFoundException('Business not found');
}
return business.name;
```
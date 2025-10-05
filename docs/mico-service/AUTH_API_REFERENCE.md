# Authentication API Reference

## Interfaces

### JwtPayload
```typescript
interface JwtPayload {
  id: string;           // User identifier
  kahaId: string;       // Kaha system identifier  
  businessId?: string;  // Business identifier (only in Business Token)
  iat?: number;         // Issued at timestamp
  exp?: number;         // Expiration timestamp
}
```

### BusinessData
```typescript
interface BusinessData {
  id: string;           // Business identifier
  name: string;         // Business name
  avatar?: string;      // Business avatar URL
  address?: string;     // Business address
  kahaId?: string;      // Associated Kaha ID
}
```

### UserData
```typescript
interface UserData {
  id: string;           // User identifier
  name: string;         // User full name
  email?: string;       // User email address
  avatar?: string;      // User avatar URL
  kahaId?: string;      // Associated Kaha ID
}
```

## Guards

### JwtAuthGuard
**Purpose**: Basic JWT token validation

**Usage**:
```typescript
@UseGuards(JwtAuthGuard)
```

**Behavior**:
- Validates JWT token signature
- Checks token expiration
- Populates `req.user` with JwtPayload
- Throws `401 Unauthorized` for invalid tokens

**Token Requirements**: Any valid JWT token (User or Business)

### BusinessAuthGuard
**Purpose**: Requires business context in JWT token

**Usage**:
```typescript
@UseGuards(BusinessAuthGuard)
```

**Behavior**:
- Extends JwtAuthGuard functionality
- Validates presence of `businessId` in token
- Throws `403 Forbidden` if `businessId` missing
- Guarantees `user.businessId` exists in handler

**Token Requirements**: Business Token with `businessId`

### OptionalJwtAuthGuard
**Purpose**: Optional authentication (allows anonymous access)

**Usage**:
```typescript
@UseGuards(OptionalJwtAuthGuard)
```

**Behavior**:
- Validates token if present
- Allows request to proceed without token
- Sets `req.user` to undefined if no token
- Never throws authentication errors

**Token Requirements**: None (token optional)

## Decorators

### @CurrentUser()
**Purpose**: Extract current user from request

**Usage**:
```typescript
getProfile(@CurrentUser() user: JwtPayload) {
  // user contains JWT payload
}

// With optional authentication
getPublicData(@CurrentUser() user?: JwtPayload) {
  // user can be undefined
}
```

**Returns**: JwtPayload object or undefined (with OptionalJwtAuthGuard)

## Services

### JwtTokenService

#### verifyToken(token: string): JwtPayload
**Purpose**: Verify and decode JWT token

**Parameters**:
- `token`: JWT token string

**Returns**: JwtPayload object

**Throws**:
- `UnauthorizedException`: Invalid, expired, or malformed token

**Example**:
```typescript
const payload = this.jwtTokenService.verifyToken(token);
console.log(payload.id); // User ID
```

#### hasBusinessContext(payload: JwtPayload): boolean
**Purpose**: Check if token contains business context

**Parameters**:
- `payload`: JWT payload object

**Returns**: Boolean indicating presence of businessId

**Example**:
```typescript
const hasBusiness = this.jwtTokenService.hasBusinessContext(user);
if (hasBusiness) {
  // User has business context
}
```

### BusinessService

#### getBusinessData(businessId: string): Promise<BusinessData | null>
**Purpose**: Fetch single business data

**Parameters**:
- `businessId`: Business identifier

**Returns**: BusinessData object or null if not found

**Caching**: 10 minutes

**Example**:
```typescript
const business = await this.businessService.getBusinessData('business-123');
if (business) {
  console.log(business.name);
}
```

#### getBulkBusinessData(businessIds: string[]): Promise<Map<string, BusinessData>>
**Purpose**: Fetch multiple businesses in one request

**Parameters**:
- `businessIds`: Array of business identifiers

**Returns**: Map of businessId to BusinessData

**Caching**: 10 minutes per business

**Example**:
```typescript
const businesses = await this.businessService.getBulkBusinessData(['id1', 'id2']);
const business1 = businesses.get('id1');
```

#### clearBusinessCache(businessId: string): void
**Purpose**: Clear cache for specific business

**Parameters**:
- `businessId`: Business identifier to clear from cache

**Example**:
```typescript
this.businessService.clearBusinessCache('business-123');
```

#### clearAllCache(): void
**Purpose**: Clear entire business cache

**Example**:
```typescript
this.businessService.clearAllCache();
```

#### getCacheStats(): { size: number; keys: string[] }
**Purpose**: Get cache statistics

**Returns**: Object with cache size and keys

**Example**:
```typescript
const stats = this.businessService.getCacheStats();
console.log(`Cache size: ${stats.size}`);
```

### UserService

#### getUserData(userId: string): Promise<UserData | null>
**Purpose**: Fetch single user data

**Parameters**:
- `userId`: User identifier

**Returns**: UserData object or null if not found

**Caching**: 10 minutes

**Example**:
```typescript
const user = await this.userService.getUserData('user-123');
if (user) {
  console.log(user.name);
}
```

#### getBulkUserData(userIds: string[]): Promise<Map<string, UserData>>
**Purpose**: Fetch multiple users in one request

**Parameters**:
- `userIds`: Array of user identifiers

**Returns**: Map of userId to UserData

**Caching**: 10 minutes per user

**Example**:
```typescript
const users = await this.userService.getBulkUserData(['id1', 'id2']);
const user1 = users.get('id1');
```

#### clearUserCache(userId: string): void
**Purpose**: Clear cache for specific user

**Parameters**:
- `userId`: User identifier to clear from cache

**Example**:
```typescript
this.userService.clearUserCache('user-123');
```

#### clearAllCache(): void
**Purpose**: Clear entire user cache

**Example**:
```typescript
this.userService.clearAllCache();
```

#### getCacheStats(): { size: number; keys: string[] }
**Purpose**: Get cache statistics

**Returns**: Object with cache size and keys

**Example**:
```typescript
const stats = this.userService.getCacheStats();
console.log(`Cache size: ${stats.size}`);
```

## Modules

### AuthModule
**Purpose**: Provides authentication functionality

**Exports**:
- JwtTokenModule
- JwtAuthGuard
- BusinessAuthGuard  
- OptionalJwtAuthGuard
- PassportModule

**Dependencies**:
- ConfigModule
- PassportModule
- JwtTokenModule
- ServiceCommunicationModule

### JwtTokenModule
**Purpose**: JWT token handling

**Exports**:
- JwtTokenService
- JwtModule

**Dependencies**:
- ConfigModule
- JwtModule

### ServiceCommunicationModule
**Purpose**: External service communication

**Exports**:
- BusinessService
- UserService

**Dependencies**:
- HttpModule
- ConfigModule

## Configuration

### Required Environment Variables

```env
# JWT secret for token verification (required)
JWT_SECRET_TOKEN=your-shared-secret-here

# Kaha Main service URL (optional, defaults to dev)
KAHA_MAIN_URL=https://dev.kaha.com.np

# Application port (optional)
PORT=3000

# Environment (optional)
NODE_ENV=development
```

### JWT Configuration
The JWT module is configured to:
- Use shared secret from environment
- Verify tokens (not generate them)
- Extract tokens from Authorization header
- Handle standard JWT errors

### HTTP Configuration
The HTTP module is configured with:
- 5-second timeout for external requests
- JSON content type headers
- Automatic retry on network errors
- Graceful error handling

## Error Responses

### Authentication Errors

#### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

**Causes**:
- Missing Authorization header
- Invalid JWT token
- Expired JWT token
- Malformed JWT token

#### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Business token required for this endpoint. Please switch to a business profile.",
  "error": "Forbidden"
}
```

**Causes**:
- Using User Token on BusinessAuthGuard endpoint
- Missing businessId in JWT payload

### Service Communication Errors

Services handle external API errors gracefully:
- Network errors: Return cached data or null
- Service unavailable: Return cached data or null
- Invalid response: Log error and return null
- Timeout: Return cached data or null

## Performance Considerations

### Caching Strategy
- **Cache Duration**: 10 minutes for both user and business data
- **Cache Key**: Based on ID (userId or businessId)
- **Cache Invalidation**: Manual via clearCache methods
- **Memory Usage**: Unbounded (consider implementing LRU cache)

### Bulk Operations
- Use bulk methods when fetching multiple entities
- Bulk requests reduce API calls to external services
- Cache is checked before making external requests
- Partial results returned if some IDs fail

### Request Optimization
- External service timeout: 5 seconds
- Concurrent requests supported
- Failed requests don't block successful ones
- Graceful degradation on service unavailability

## Security Notes

### Token Security
- Tokens are verified using shared secret
- Signature validation prevents tampering
- Expiration checking prevents replay attacks
- Malformed tokens are rejected

### Business Context Security
- BusinessAuthGuard ensures business access
- User must have valid business token
- Business ID is validated in token payload
- No additional authorization checks performed

### Service Communication Security
- External API calls use HTTPS
- No authentication credentials stored
- Error messages don't expose sensitive data
- Failed requests are logged for monitoring
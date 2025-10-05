# 🔧 API Testing Issues & Fixes

## 📋 **Issues Identified from Server Logs**

### ❌ **Issue 1: User Module - Missing POST Endpoint**

**Problem**: 
```
[Nest] 30096 - ERROR [GlobalExceptionFilter] POST /users - 404 - Cannot POST /users
```

**Root Cause**: The UserController only has GET and PUT methods, no POST method for creating users.

**Evidence**: 
- UserModule is properly registered in app.module.ts ✅
- UserController is properly registered in user.module.ts ✅
- UserController exists but missing @Post() decorator ❌

**Solution**: The UserController is designed for profile management, not user creation. User creation likely happens through the handshake process with external microservices.

**Workaround for Testing**: 
1. Create users directly in database, OR
2. Use the handshake process endpoint, OR  
3. Add a temporary POST endpoint for testing

---

### ❌ **Issue 2: Entity Nearby Search - Parameter Name Mismatch**

**Problem**:
```
[Nest] 30096 - ERROR [GlobalExceptionFilter] GET /entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000 - 400 - Validation failed
```

**Root Cause**: The DTO expects `radiusMeters` but our test uses `radius`.

**Evidence**: ProximitySearchDto expects:
- `latitude` ✅
- `longitude` ✅  
- `radiusMeters` ❌ (we used `radius`)

**Solution**: Change query parameter from `radius` to `radiusMeters`.

---

### ✅ **Issue 3: Attendance Endpoints - Authentication Working**

**Status**: 
```
[Nest] 30096 - ERROR [GlobalExceptionFilter] POST /api/attendance/clock-in - 401 - Unauthorized
```

**Analysis**: This is actually **GOOD** - the endpoint exists and is properly protected by JWT authentication.

---

## 🛠️ **FIXES IMPLEMENTED**

### Fix 1: Update Entity Nearby Search Test

**Before**:
```javascript
const nearbyResponse = await apiCall('GET', '/entities/nearby?latitude=27.7172&longitude=85.3240&radius=5000');
```

**After**:
```javascript
const nearbyResponse = await apiCall('GET', '/entities/nearby?latitude=27.7172&longitude=85.3240&radiusMeters=5000');
```

### Fix 2: User Creation Workaround

Since the UserController doesn't have a POST endpoint, we have several options:

#### Option A: Direct Database Insert (Temporary)
```sql
INSERT INTO users (id, name, phone, email, address, user_id, is_field_worker, department_id)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'John Manager', '+9779812345678', 'john.manager@company.com', 'Kathmandu, Nepal', 'manager-001', false, 'DEPT_ID_HERE'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Alice Worker', '+9779812345679', 'alice.worker@company.com', 'Kathmandu, Nepal', 'worker-001', false, 'DEPT_ID_HERE'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Bob FieldWorker', '+9779812345680', 'bob.field@company.com', 'Kathmandu, Nepal', 'field-001', true, 'DEPT_ID_HERE');
```

#### Option B: Use Handshake Process
Check if there's a handshake endpoint for user creation:
```javascript
// Look for endpoints like:
// POST /api/handshake/users
// POST /api/users/sync
// GET /api/users/:externalUserId (might create if not exists)
```

#### Option C: Add Temporary POST Endpoint
Add a temporary POST method to UserController for testing purposes.

---

## 🔄 **UPDATED TEST FIXES**

### Fix the Entity Nearby Search Test
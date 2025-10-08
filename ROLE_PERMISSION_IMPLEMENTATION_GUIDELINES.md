# 🚨 ROLE-PERMISSION IMPLEMENTATION GUIDELINES

## ⚠️ **CRITICAL: DO NOT ADD DECORATORS EARLY**

**This document prevents agents from prematurely adding permission decorators before the system is ready.**

---

## 🎯 **Implementation Strategy Overview**

### **Phase 1: Foundation Building (Current Phase)**
- ✅ Create database tables (roles, permissions, user_roles, entity_role_permissions)
- ✅ Implement core services (EntityPermissionService, PermissionGuard)
- ✅ Create @RequirePermissions decorator
- ✅ Seed basic test data
- ❌ **DO NOT ADD DECORATORS TO CONTROLLERS YET**

### **Phase 2: Testing Phase**
- ✅ Test with **ONE SINGLE ROUTE ONLY** for validation
- ✅ Verify permission system works correctly
- ✅ Test with real user data and permissions
- ❌ **DO NOT ADD DECORATORS TO OTHER ROUTES**

### **Phase 3: Project Completion Phase**
- ✅ Complete ALL other features first
- ✅ Finish entire attendance system
- ✅ Complete all business logic
- ✅ **ONLY THEN** add decorators to all routes

### **Phase 4: Full Rollout (Final Phase)**
- ✅ Add @RequirePermissions to all controllers
- ✅ Remove legacy authorization code
- ✅ Full system migration

---

## 🚨 **STRICT RULES FOR AGENTS**

### **❌ NEVER DO THESE (Until Phase 4):**

```typescript
// ❌ DO NOT ADD THESE TO CONTROLLERS YET
@RequirePermissions('APPROVE_REQUESTS')
@RequirePermissions('VIEW_TEAM_REPORTS')
@RequirePermissions('CREATE_ENTITIES')

// ❌ DO NOT ADD PERMISSION GUARD TO CONTROLLERS YET
@UseGuards(JwtAuthGuard, PermissionGuard)

// ❌ DO NOT REMOVE EXISTING AUTH LOGIC YET
// Keep existing manager relationship checks
```

### **✅ ONLY DO THESE (Current Phase):**

```typescript
// ✅ CREATE FOUNDATION SERVICES
@Injectable()
export class EntityPermissionService { ... }

@Injectable() 
export class PermissionGuard { ... }

// ✅ CREATE DECORATOR (but don't use it yet)
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// ✅ CREATE DATABASE TABLES
CREATE TABLE roles (...);
CREATE TABLE permissions (...);

// ✅ KEEP EXISTING AUTH LOGIC INTACT
async canApproveRequest(request: Request, approverId: string): Promise<boolean> {
  // Keep this existing logic for now
}
```

---

## 🧪 **Testing Phase: ONE ROUTE ONLY**

### **Designated Test Route:**
```typescript
// ONLY THIS ONE ROUTE gets the decorator for testing
@Controller('api/test-permissions')
export class TestPermissionController {
  
  @Get('manager-only')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermissions('TEST_MANAGER_ACCESS')
  async testManagerAccess(@CurrentUser() user: any) {
    return { 
      message: 'Permission system working!', 
      user: user.id,
      timestamp: new Date()
    };
  }
}
```

### **Test Data Setup:**
```sql
-- Create test permission
INSERT INTO permissions (id, name, resource, action, scope) VALUES
('test-perm-id', 'TEST_MANAGER_ACCESS', 'TEST', 'ACCESS', 'MANAGER');

-- Assign to manager role in specific entity
INSERT INTO entity_role_permissions (entity_id, role_id, permission_id, is_granted) VALUES
('your-test-entity-id', 'manager-role-id', 'test-perm-id', true);

-- Assign user to manager role in that entity
INSERT INTO user_roles (user_id, role_id, entity_id) VALUES
('your-test-user-id', 'manager-role-id', 'your-test-entity-id');
```

---

## 📋 **Implementation Checklist**

### **Phase 1: Foundation (Current) ✅**
- [ ] Create `roles` table
- [ ] Create `permissions` table  
- [ ] Create `user_roles` table
- [ ] Create `entity_role_permissions` table
- [ ] Implement `EntityPermissionService`
- [ ] Implement `PermissionGuard`
- [ ] Create `@RequirePermissions` decorator
- [ ] Seed basic roles and permissions
- [ ] **DO NOT TOUCH EXISTING CONTROLLERS**

### **Phase 2: Single Route Testing ⏳**
- [ ] Create dedicated test controller
- [ ] Add decorator to ONE test route only
- [ ] Test with real user data
- [ ] Verify permission checks work
- [ ] **DO NOT ADD TO PRODUCTION CONTROLLERS**

### **Phase 3: Complete Other Features First ⏳**
- [ ] Finish all attendance features
- [ ] Complete all business logic
- [ ] Finish all other requirements
- [ ] System is fully functional
- [ ] **STILL DO NOT ADD DECORATORS**

### **Phase 4: Full Permission Rollout (Final) ⏳**
- [ ] Add decorators to all controllers systematically
- [ ] Remove legacy authorization code
- [ ] Update all guards
- [ ] Full system migration
- [ ] **NOW DECORATORS ARE SAFE TO ADD**

---

## 🚨 **WARNING SIGNS - STOP IF YOU SEE THESE**

### **❌ Agent Mistakes to Prevent:**

```typescript
// ❌ WRONG: Adding decorators too early
@Controller('api/requests')
@UseGuards(JwtAuthGuard, PermissionGuard)  // ← TOO EARLY!
export class RequestController {
  
  @Post(':id/approve')
  @RequirePermissions('APPROVE_REQUESTS')  // ← TOO EARLY!
  async approveRequest() { ... }
}

// ❌ WRONG: Removing existing auth logic
async canApproveRequest() {
  // ❌ Don't remove this yet!
  // return await this.permissionService.hasPermission(...);
}

// ❌ WRONG: Modifying production controllers
@Controller('api/attendance')
@UseGuards(JwtAuthGuard, PermissionGuard)  // ← TOO EARLY!
export class AttendanceController { ... }
```

### **✅ CORRECT: Foundation Only**

```typescript
// ✅ RIGHT: Building foundation services
@Injectable()
export class EntityPermissionService {
  async hasPermissionInEntity(userId: string, entityId: string, permission: string) {
    // Implementation here
  }
}

// ✅ RIGHT: Creating decorator (but not using it)
export const RequirePermissions = (...permissions: string[]) => 
  SetMetadata('permissions', permissions);

// ✅ RIGHT: Keeping existing logic intact
@Controller('api/requests')
@UseGuards(JwtAuthGuard)  // ← Keep existing guards
export class RequestController {
  
  @Post(':id/approve')
  // ← NO PERMISSION DECORATOR YET
  async approveRequest() {
    // Keep existing authorization logic
    const canApprove = await this.canApproveRequest(request, user.id);
    if (!canApprove) throw new ForbiddenException();
  }
}
```

---

## 🎯 **Current Phase Focus**

### **What to Build Now:**
1. **Database Schema**: Create all permission tables
2. **Core Services**: EntityPermissionService, PermissionGuard
3. **Decorator Definition**: @RequirePermissions (but don't use)
4. **Test Data**: Seed roles and permissions
5. **Single Test Route**: One controller for validation

### **What NOT to Touch:**
1. **Production Controllers**: Leave them unchanged
2. **Existing Auth Logic**: Keep manager relationship checks
3. **Current Guards**: Don't modify existing @UseGuards
4. **Service Methods**: Don't change existing authorization

---

## 📝 **Agent Instructions**

### **When Working on Controllers:**
```typescript
// ✅ SAFE: Keep existing patterns
@Controller('api/something')
@UseGuards(JwtAuthGuard)  // ← Keep this as-is
export class SomethingController {
  
  @Post('action')
  // ← NO @RequirePermissions decorator
  async doAction(@CurrentUser() user: any) {
    // Keep existing authorization logic
    const hasAccess = await this.checkExistingPermission(user.id);
    if (!hasAccess) throw new ForbiddenException();
  }
}
```

### **When Creating New Features:**
```typescript
// ✅ SAFE: Follow existing patterns
@Controller('api/new-feature')
@UseGuards(JwtAuthGuard)  // ← Use existing auth pattern
export class NewFeatureController {
  
  @Get('data')
  async getData(@CurrentUser() user: any) {
    // Use existing authorization patterns
    // DO NOT use permission decorators yet
  }
}
```

---

## 🔒 **Security During Transition**

### **Current Security (Keep This):**
```typescript
// ✅ Keep using existing manager relationship checks
private async canApproveRequest(request: Request, approverId: string): Promise<boolean> {
  const isDirectManager = await this.reportingStructureRepository.existsRelationship(
    request.userId, approverId
  );
  return isDirectManager;
}

// ✅ Keep using existing access validation
private async validateRequestAccess(request: Request, userId: string): Promise<boolean> {
  if (request.userId === userId) return true;
  
  const isManager = await this.reportingStructureRepository.existsRelationship(
    request.userId, userId
  );
  return isManager;
}
```

### **Future Security (Don't Implement Yet):**
```typescript
// ❌ Don't replace existing logic with this yet
private async canApproveRequest(request: Request, approverId: string): Promise<boolean> {
  return await this.permissionService.hasPermissionInEntity(
    approverId, request.entityId, 'APPROVE_REQUESTS'
  );
}
```

---

## 🎉 **Success Criteria**

### **Phase 1 Complete When:**
- [ ] All database tables created
- [ ] All services implemented
- [ ] Decorator created (but unused)
- [ ] Test data seeded
- [ ] **Zero production controllers modified**

### **Phase 2 Complete When:**
- [ ] Single test route working
- [ ] Permission system validated
- [ ] Real user testing successful
- [ ] **Still zero production controllers modified**

### **Phase 3 Complete When:**
- [ ] All other features finished
- [ ] Entire system functional
- [ ] Ready for final migration
- [ ] **Permission system ready for rollout**

### **Phase 4 Complete When:**
- [ ] All controllers have decorators
- [ ] Legacy auth code removed
- [ ] Full system migration complete
- [ ] **Permission system fully active**

---

## 🚨 **FINAL REMINDER**

**DO NOT ADD @RequirePermissions DECORATORS TO PRODUCTION CONTROLLERS UNTIL PHASE 4**

**The system must be:**
1. ✅ Fully built and tested
2. ✅ All features complete
3. ✅ Ready for final migration
4. ✅ **ONLY THEN** add decorators

**This prevents breaking the system during development!** 🛡️
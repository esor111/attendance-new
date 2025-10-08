# 🏢 Entity-Specific Permissions Design

## 🎯 **The Challenge**

**Scenario:** Same role name, different permissions per entity
- **Alice (Hotel Manager)**: Can view attendance reports
- **Bob (Tech Company Manager)**: Cannot view attendance reports  
- **Same Route**: `GET /users/attendance/:entityId`
- **Question**: How does the system know which MANAGER role has access?

---

## 🧠 **Brainstorming Solutions**

### **🔍 Problem Analysis**

```
User A: Alice
└── Role: MANAGER in Hotel Entity → CAN view attendance reports

User B: Bob  
└── Role: MANAGER in Tech Entity → CANNOT view attendance reports

Route: GET /users/attendance/hotel-123     ← Alice hits this → Should ALLOW
Route: GET /users/attendance/tech-456      ← Bob hits this → Should DENY
```

**The Challenge**: Different users, same role name, same route, but different permissions based on entity context!

---

## 🏗️ **Solution 1: Entity-Scoped Permissions (Recommended)**

### **Database Design**
```sql
-- Enhanced permission system with entity context
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,              -- 'VIEW_ATTENDANCE_REPORTS'
    display_name VARCHAR(150) NOT NULL,      -- 'View Attendance Reports'
    resource VARCHAR(50) NOT NULL,           -- 'ATTENDANCE'
    action VARCHAR(50) NOT NULL,             -- 'VIEW'
    scope VARCHAR(50) NOT NULL,              -- 'TEAM'
    is_active BOOLEAN DEFAULT true
);

-- Entity-specific role permissions (KEY TABLE!)
CREATE TABLE entity_role_permissions (
    id UUID PRIMARY KEY,
    entity_id UUID NOT NULL REFERENCES entities(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    is_granted BOOLEAN DEFAULT true,         -- Can be false for explicit deny
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    UNIQUE(entity_id, role_id, permission_id)
);

-- User roles remain entity-scoped
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    entity_id UUID NOT NULL REFERENCES entities(id), -- REQUIRED!
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id, entity_id)
);
```

### **Seed Data Example**
```sql
-- Create entities
INSERT INTO entities (id, name, type) VALUES
('hotel-123', 'Grand Hotel', 'HOTEL'),
('tech-456', 'TechCorp Inc', 'TECHNOLOGY');

-- Create roles
INSERT INTO roles (id, name, display_name) VALUES
('manager-role', 'MANAGER', 'Manager');

-- Create permissions
INSERT INTO permissions (id, name, resource, action, scope) VALUES
('view-attendance', 'VIEW_ATTENDANCE_REPORTS', 'ATTENDANCE', 'VIEW', 'TEAM');

-- Hotel: Manager CAN view attendance reports
INSERT INTO entity_role_permissions (entity_id, role_id, permission_id, is_granted) VALUES
('hotel-123', 'manager-role', 'view-attendance', true);

-- Tech Company: Manager CANNOT view attendance reports (no record = no permission)
-- OR explicit deny:
INSERT INTO entity_role_permissions (entity_id, role_id, permission_id, is_granted) VALUES
('tech-456', 'manager-role', 'view-attendance', false);

-- Assign user to both entities with same role
INSERT INTO user_roles (user_id, role_id, entity_id) VALUES
('john-smith', 'manager-role', 'hotel-123'),
('john-smith', 'manager-role', 'tech-456');
```

---

## 🔧 **Implementation: Permission Service**

### **Enhanced Permission Service**
```typescript
@Injectable()
export class EntityPermissionService {
  constructor(
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
    @InjectRepository(EntityRolePermission)
    private entityRolePermissionRepository: Repository<EntityRolePermission>,
  ) {}

  /**
   * Check if user has permission in specific entity context
   */
  async hasPermissionInEntity(
    userId: string,
    entityId: string,
    permissionName: string
  ): Promise<boolean> {
    // 1. Get user's roles in this specific entity
    const userRoles = await this.userRoleRepository.find({
      where: {
        userId,
        entityId,
        isActive: true,
        // Check expiration
        ...(await this.getActiveRoleConditions())
      },
      relations: ['role']
    });

    if (userRoles.length === 0) {
      return false; // User has no roles in this entity
    }

    // 2. Check if any of the user's roles have this permission in this entity
    for (const userRole of userRoles) {
      const hasPermission = await this.entityRolePermissionRepository.findOne({
        where: {
          entityId,
          roleId: userRole.roleId,
          permission: { name: permissionName },
          isGranted: true
        },
        relations: ['permission']
      });

      if (hasPermission) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all permissions for user in specific entity
   */
  async getUserPermissionsInEntity(
    userId: string,
    entityId: string
  ): Promise<Permission[]> {
    const query = `
      SELECT DISTINCT p.*
      FROM permissions p
      JOIN entity_role_permissions erp ON p.id = erp.permission_id
      JOIN user_roles ur ON erp.role_id = ur.role_id
      WHERE ur.user_id = $1 
        AND ur.entity_id = $2 
        AND erp.entity_id = $2
        AND ur.is_active = true
        AND erp.is_granted = true
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `;

    return await this.userRoleRepository.query(query, [userId, entityId]);
  }

  /**
   * Check multiple permissions at once (for performance)
   */
  async hasAnyPermissionInEntity(
    userId: string,
    entityId: string,
    permissionNames: string[]
  ): Promise<{ [permission: string]: boolean }> {
    const userPermissions = await this.getUserPermissionsInEntity(userId, entityId);
    const permissionMap = userPermissions.reduce((acc, perm) => {
      acc[perm.name] = true;
      return acc;
    }, {} as { [key: string]: boolean });

    const result: { [permission: string]: boolean } = {};
    for (const permName of permissionNames) {
      result[permName] = !!permissionMap[permName];
    }

    return result;
  }

  private async getActiveRoleConditions() {
    return {
      expiresAt: IsNull() || MoreThan(new Date())
    };
  }
}
```

---

## 🛡️ **Enhanced Permission Guard**

### **Entity-Aware Permission Guard**
```typescript
@Injectable()
export class EntityPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entityPermissionService: EntityPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user) {
      return false;
    }

    // Extract entity ID from request
    const entityId = this.extractEntityId(request);
    
    if (!entityId) {
      throw new BadRequestException('Entity ID is required for this operation');
    }

    // Check each required permission in the entity context
    for (const permission of requiredPermissions) {
      const hasPermission = await this.entityPermissionService.hasPermissionInEntity(
        user.id,
        entityId,
        permission
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Access denied: Missing permission '${permission}' in entity '${entityId}'`
        );
      }
    }

    return true;
  }

  private extractEntityId(request: any): string | null {
    // Try different sources for entity ID
    return (
      request.params?.entityId ||     // /users/attendance/:entityId
      request.params?.id ||           // /entities/:id/reports
      request.query?.entityId ||      // ?entityId=123
      request.body?.entityId ||       // POST body
      request.headers?.['x-entity-id'] // Custom header
    );
  }
}
```

---

## 🎯 **Controller Implementation**

### **Entity-Aware Controller**
```typescript
@Controller('users/attendance')
@UseGuards(JwtAuthGuard, EntityPermissionGuard)
export class AttendanceController {

  @Get(':entityId')
  @RequirePermissions('VIEW_ATTENDANCE_REPORTS')
  async getAttendanceReports(
    @CurrentUser() user: any,
    @Param('entityId') entityId: string,
    @Query() filters: AttendanceFiltersDto
  ) {
    // At this point, the guard has already verified:
    // 1. User is authenticated
    // 2. User has 'VIEW_ATTENDANCE_REPORTS' permission in this specific entity
    
    return await this.attendanceService.getReportsForEntity(entityId, filters);
  }

  @Get(':entityId/team')
  @RequirePermissions('VIEW_TEAM_ATTENDANCE')
  async getTeamAttendance(
    @CurrentUser() user: any,
    @Param('entityId') entityId: string
  ) {
    // Guard ensures user has team attendance permission in this entity
    return await this.attendanceService.getTeamAttendanceForEntity(user.id, entityId);
  }

  @Post(':entityId/reports/export')
  @RequirePermissions('EXPORT_ATTENDANCE_REPORTS')
  async exportReports(
    @CurrentUser() user: any,
    @Param('entityId') entityId: string,
    @Body() exportOptions: ExportOptionsDto
  ) {
    // Guard ensures user can export reports in this entity
    return await this.attendanceService.exportReportsForEntity(entityId, exportOptions);
  }
}
```

---

## 🔄 **How It Works: Step-by-Step**

### **Scenario: Different Managers access attendance reports**

#### **Request 1: Alice (Hotel Manager)**
```http
GET /users/attendance/hotel-123
Authorization: Bearer <alice-token>
```

**Flow:**
1. **JwtAuthGuard**: Validates token → User: Alice
2. **EntityPermissionGuard**: 
   - Extracts `entityId = "hotel-123"`
   - Checks: Does Alice have `VIEW_ATTENDANCE_REPORTS` in `hotel-123`?
   - Query: `user_roles` → Alice has `MANAGER` role in `hotel-123`
   - Query: `entity_role_permissions` → `MANAGER` role has `VIEW_ATTENDANCE_REPORTS` in `hotel-123`
   - Result: ✅ **ALLOWED**
3. **Controller**: Executes `getAttendanceReports()`

#### **Request 2: Bob (Tech Company Manager)**
```http
GET /users/attendance/tech-456
Authorization: Bearer <bob-token>
```

**Flow:**
1. **JwtAuthGuard**: Validates token → User: Bob
2. **EntityPermissionGuard**:
   - Extracts `entityId = "tech-456"`
   - Checks: Does Bob have `VIEW_ATTENDANCE_REPORTS` in `tech-456`?
   - Query: `user_roles` → Bob has `MANAGER` role in `tech-456`
   - Query: `entity_role_permissions` → `MANAGER` role does NOT have `VIEW_ATTENDANCE_REPORTS` in `tech-456`
   - Result: ❌ **DENIED** → Throws `ForbiddenException`
3. **Controller**: Never reached

---

## 🚀 **Alternative Solutions**

### **Solution 2: Permission Templates per Entity Type**
```sql
-- Entity types have different permission templates
CREATE TABLE entity_types (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,        -- 'HOTEL', 'TECH_COMPANY'
    display_name VARCHAR(100) NOT NULL
);

CREATE TABLE entity_type_role_permissions (
    id UUID PRIMARY KEY,
    entity_type_id UUID NOT NULL REFERENCES entity_types(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    is_granted BOOLEAN DEFAULT true,
    UNIQUE(entity_type_id, role_id, permission_id)
);

-- Entities inherit from their type
CREATE TABLE entities (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    entity_type_id UUID NOT NULL REFERENCES entity_types(id),
    -- Custom overrides can be stored in entity_role_permissions
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Solution 3: Dynamic Permission Policies**
```sql
-- JSON-based permission policies
CREATE TABLE permission_policies (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    entity_id UUID REFERENCES entities(id),
    role_id UUID REFERENCES roles(id),
    policy_document JSONB NOT NULL,          -- Complex rules
    is_active BOOLEAN DEFAULT true
);

-- Example policy document:
-- {
--   "permissions": ["VIEW_ATTENDANCE_REPORTS"],
--   "conditions": {
--     "entity_type": "HOTEL",
--     "user_level": ">=4",
--     "time_range": {"start": "09:00", "end": "17:00"}
--   }
-- }
```

---

## 🎯 **Recommended Approach**

For your attendance system, I recommend **Solution 1 (Entity-Scoped Permissions)** because:

### **✅ Advantages:**
- **Clear and explicit**: Each entity-role-permission combination is explicit
- **Flexible**: Can grant/deny permissions per entity independently
- **Performant**: Simple joins, can be cached effectively
- **Auditable**: Clear trail of who has what permission where
- **Scalable**: Works with thousands of entities and roles

### **✅ Implementation Steps:**
1. **Add `entity_role_permissions` table**
2. **Update `EntityPermissionService`**
3. **Create `EntityPermissionGuard`**
4. **Update controllers with `@RequirePermissions`**
5. **Seed default permissions per entity type**

### **✅ Example Usage:**
```typescript
// Hotel manager gets attendance permissions
await entityPermissionService.grantPermission(
  'hotel-123', 'MANAGER', 'VIEW_ATTENDANCE_REPORTS'
);

// Tech company manager doesn't get attendance permissions
// (no record = no permission)

// Same route, different access based on entity context!
```

This approach gives you **maximum flexibility** while keeping the **same clean API routes**! 🚀

The key insight is: **The entity ID in the URL becomes the security context** that determines which permissions apply.
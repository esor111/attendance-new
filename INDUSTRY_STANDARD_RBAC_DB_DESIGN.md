# 🏛️ Industry Standard RBAC Database Design Patterns

## 📋 **Overview**

This document covers **real-world, production-proven** database design patterns used by major companies (Google, Microsoft, AWS, Salesforce) and frameworks (Spring Security, Laravel, Django) for Role-Based Access Control (RBAC).

---

## 🎯 **Core RBAC Model (NIST Standard)**

The **National Institute of Standards and Technology (NIST)** defines the standard RBAC model used worldwide:

### **Basic RBAC Components:**
1. **Users** - Individual accounts
2. **Roles** - Job functions or positions
3. **Permissions** - Specific access rights
4. **Sessions** - User's active role assignments

---

## 🏗️ **Pattern 1: Basic RBAC (Most Common)**

### **Used by:** Laravel, Django, Spring Security, Ruby on Rails

```sql
-- Core Tables
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,        -- 'admin', 'manager', 'employee'
    display_name VARCHAR(100) NOT NULL,      -- 'System Administrator'
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,       -- 'users.create', 'posts.delete'
    display_name VARCHAR(150) NOT NULL,      -- 'Create Users'
    description TEXT,
    resource VARCHAR(50),                    -- 'users', 'posts', 'reports'
    action VARCHAR(50),                      -- 'create', 'read', 'update', 'delete'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction Tables (Many-to-Many)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP NULL,               -- Optional expiration
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    is_granted BOOLEAN DEFAULT true,         -- true=grant, false=deny
    UNIQUE(role_id, permission_id)
);

-- Indexes for Performance
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
```

---

## 🏢 **Pattern 2: Hierarchical RBAC (Enterprise)**

### **Used by:** Microsoft Active Directory, AWS IAM, Google Cloud IAM

```sql
-- Enhanced Roles with Hierarchy
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_role_id UUID REFERENCES roles(id),  -- Hierarchy support
    level INTEGER NOT NULL DEFAULT 0,          -- 0=highest, 5=lowest
    path VARCHAR(500),                         -- Materialized path: '/admin/manager/supervisor'
    is_system_role BOOLEAN DEFAULT false,      -- System vs custom roles
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Role Inheritance Table (for complex hierarchies)
CREATE TABLE role_hierarchy (
    id UUID PRIMARY KEY,
    parent_role_id UUID NOT NULL REFERENCES roles(id),
    child_role_id UUID NOT NULL REFERENCES roles(id),
    depth INTEGER NOT NULL DEFAULT 1,         -- How many levels deep
    UNIQUE(parent_role_id, child_role_id)
);

-- Enhanced Permissions with Conditions
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    effect VARCHAR(10) DEFAULT 'ALLOW',       -- 'ALLOW' or 'DENY'
    conditions JSONB,                         -- Dynamic conditions
    priority INTEGER DEFAULT 0,              -- Higher number = higher priority
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Example conditions in JSONB:
-- {
--   "time_range": {"start": "09:00", "end": "17:00"},
--   "ip_whitelist": ["192.168.1.0/24"],
--   "resource_owner": true,
--   "department": ["HR", "Finance"]
-- }
```

---

## 🌐 **Pattern 3: Multi-Tenant RBAC (SaaS)**

### **Used by:** Salesforce, Slack, Microsoft 365, Atlassian

```sql
-- Tenant/Organization Support
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,        -- 'acme-corp'
    subscription_tier VARCHAR(20),           -- 'free', 'pro', 'enterprise'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users belong to organizations
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    default_org_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Organization membership
CREATE TABLE organization_users (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',     -- 'active', 'invited', 'suspended'
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Roles are scoped to organizations
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id), -- NULL = global role
    name VARCHAR(50) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, name)            -- Unique within org
);

-- User roles within organizations
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    scope JSONB,                             -- Additional scoping
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id, organization_id)
);

-- Example scope JSONB:
-- {
--   "departments": ["sales", "marketing"],
--   "projects": ["proj-123", "proj-456"],
--   "regions": ["us-west", "eu-central"]
-- }
```

---

## 🎯 **Pattern 4: Attribute-Based Access Control (ABAC)**

### **Used by:** AWS IAM Policies, Google Cloud IAM, Azure RBAC

```sql
-- Policy-Based Permissions (Most Flexible)
CREATE TABLE policies (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    effect VARCHAR(10) NOT NULL,             -- 'ALLOW' or 'DENY'
    version VARCHAR(10) DEFAULT '1.0',
    policy_document JSONB NOT NULL,          -- Full policy in JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Policy Attachments (can attach to users, roles, or groups)
CREATE TABLE policy_attachments (
    id UUID PRIMARY KEY,
    policy_id UUID NOT NULL REFERENCES policies(id),
    principal_type VARCHAR(20) NOT NULL,     -- 'user', 'role', 'group'
    principal_id UUID NOT NULL,
    attached_at TIMESTAMP DEFAULT NOW(),
    attached_by UUID REFERENCES users(id),
    UNIQUE(policy_id, principal_type, principal_id)
);

-- Example policy document:
-- {
--   "Version": "2012-10-17",
--   "Statement": [
--     {
--       "Effect": "Allow",
--       "Action": ["s3:GetObject", "s3:PutObject"],
--       "Resource": "arn:aws:s3:::my-bucket/*",
--       "Condition": {
--         "StringEquals": {
--           "s3:x-amz-server-side-encryption": "AES256"
--         },
--         "DateGreaterThan": {
--           "aws:CurrentTime": "2023-01-01T00:00:00Z"
--         }
--       }
--     }
--   ]
-- }

-- Resource-Based Permissions
CREATE TABLE resources (
    id UUID PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,      -- 'document', 'project', 'folder'
    resource_id VARCHAR(100) NOT NULL,       -- External resource identifier
    owner_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    metadata JSONB,                          -- Resource-specific data
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(resource_type, resource_id)
);

CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY,
    resource_id UUID NOT NULL REFERENCES resources(id),
    principal_type VARCHAR(20) NOT NULL,     -- 'user', 'role', 'group'
    principal_id UUID NOT NULL,
    permission VARCHAR(50) NOT NULL,         -- 'read', 'write', 'admin'
    granted_at TIMESTAMP DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    expires_at TIMESTAMP NULL,
    UNIQUE(resource_id, principal_type, principal_id, permission)
);
```

---

## 🔧 **Pattern 5: Temporal RBAC (Time-Based)**

### **Used by:** Banking systems, Healthcare, Government

```sql
-- Time-constrained roles and permissions
CREATE TABLE temporal_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    
    -- Time constraints
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NULL,              -- NULL = permanent
    
    -- Recurring patterns
    recurrence_pattern JSONB,                -- Cron-like patterns
    
    -- Activation rules
    requires_approval BOOLEAN DEFAULT false,
    auto_activate BOOLEAN DEFAULT true,
    max_duration INTERVAL,                   -- Maximum session duration
    
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, role_id, valid_from)
);

-- Example recurrence patterns:
-- {
--   "type": "weekly",
--   "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
--   "hours": {"start": "09:00", "end": "17:00"},
--   "timezone": "UTC"
-- }

-- Session-based activation
CREATE TABLE role_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    temporal_role_id UUID NOT NULL REFERENCES temporal_roles(id),
    activated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    activation_context JSONB                 -- IP, device, etc.
);
```

---

## 📊 **Pattern 6: Audit & Compliance (SOX, GDPR, HIPAA)**

### **Used by:** Financial institutions, Healthcare, Enterprise

```sql
-- Comprehensive audit trail
CREATE TABLE permission_audit_log (
    id UUID PRIMARY KEY,
    
    -- What happened
    action VARCHAR(50) NOT NULL,             -- 'GRANTED', 'REVOKED', 'ACCESSED', 'DENIED'
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    permission VARCHAR(100),
    
    -- Who did it
    user_id UUID REFERENCES users(id),
    acting_user_id UUID REFERENCES users(id), -- Who performed the action
    role_id UUID REFERENCES roles(id),
    
    -- When and where
    timestamp TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Context
    reason TEXT,
    approval_required BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Compliance
    compliance_tags VARCHAR(100)[],          -- ['SOX', 'GDPR', 'HIPAA']
    retention_until TIMESTAMP,               -- Data retention policy
    
    -- Additional context
    metadata JSONB
);

-- Permission requests (for approval workflows)
CREATE TABLE permission_requests (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES users(id),
    requested_permission VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    justification TEXT NOT NULL,
    
    -- Approval workflow
    status VARCHAR(20) DEFAULT 'pending',    -- 'pending', 'approved', 'rejected'
    approver_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    approval_notes TEXT,
    
    -- Time limits
    requested_duration INTERVAL,
    expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🚀 **Performance Optimization Patterns**

### **1. Permission Caching Table**
```sql
-- Materialized view of user permissions (for performance)
CREATE TABLE user_permission_cache (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    permission VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    scope JSONB,
    
    -- Cache metadata
    computed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    cache_version INTEGER DEFAULT 1,
    
    UNIQUE(user_id, organization_id, permission, resource_type)
);

-- Refresh cache function
CREATE OR REPLACE FUNCTION refresh_user_permissions(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM user_permission_cache WHERE user_id = p_user_id;
    
    INSERT INTO user_permission_cache (user_id, organization_id, permission, resource_type, scope)
    SELECT DISTINCT 
        ur.user_id,
        ur.organization_id,
        p.name as permission,
        p.resource as resource_type,
        ur.scope
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = true
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      AND rp.is_granted = true
      AND p.is_active = true;
END;
$$ LANGUAGE plpgsql;
```

### **2. Hierarchical Queries (PostgreSQL)**
```sql
-- Recursive CTE for role inheritance
WITH RECURSIVE role_tree AS (
    -- Base case: direct roles
    SELECT ur.user_id, ur.role_id, r.name, 0 as depth
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    WHERE ur.user_id = $1 AND ur.is_active = true
    
    UNION ALL
    
    -- Recursive case: inherited roles
    SELECT rt.user_id, rh.parent_role_id, pr.name, rt.depth + 1
    FROM role_tree rt
    JOIN role_hierarchy rh ON rt.role_id = rh.child_role_id
    JOIN roles pr ON rh.parent_role_id = pr.id
    WHERE rt.depth < 10  -- Prevent infinite recursion
)
SELECT DISTINCT rt.user_id, p.name as permission
FROM role_tree rt
JOIN role_permissions rp ON rt.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE rp.is_granted = true AND p.is_active = true;
```

---

## 🎯 **Industry Best Practices**

### **1. Naming Conventions**
```sql
-- Permissions: resource.action or resource:action:scope
'users.create', 'users.read', 'users.update', 'users.delete'
'reports:view:own', 'reports:view:team', 'reports:export:all'

-- Roles: job function or responsibility
'admin', 'manager', 'employee', 'hr_specialist', 'finance_analyst'

-- Tables: plural nouns
'users', 'roles', 'permissions', 'user_roles', 'role_permissions'
```

### **2. Security Principles**
```sql
-- Principle of Least Privilege
INSERT INTO role_permissions (role_id, permission_id, is_granted)
SELECT r.id, p.id, true
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.name IN ('profile.read', 'profile.update', 'requests.create');

-- Explicit Deny (higher priority than allow)
INSERT INTO role_permissions (role_id, permission_id, is_granted)
VALUES (role_id, sensitive_permission_id, false);  -- Explicit deny
```

### **3. Data Integrity**
```sql
-- Constraints to prevent invalid states
ALTER TABLE user_roles ADD CONSTRAINT check_valid_dates 
CHECK (expires_at IS NULL OR expires_at > assigned_at);

ALTER TABLE role_hierarchy ADD CONSTRAINT prevent_self_reference
CHECK (parent_role_id != child_role_id);

-- Triggers for audit logging
CREATE OR REPLACE FUNCTION audit_permission_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO permission_audit_log (action, user_id, role_id, permission, timestamp)
    VALUES (TG_OP, NEW.user_id, NEW.role_id, 'role_assignment', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_permission_changes();
```

---

## 🏆 **Recommended Pattern for Your System**

Based on your attendance microservice requirements, I recommend **Pattern 2 (Hierarchical RBAC)** with elements from **Pattern 3 (Multi-Tenant)**:

```sql
-- Your optimal schema
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,       -- 'REQUEST:APPROVE:TEAM'
    resource VARCHAR(50) NOT NULL,           -- 'REQUEST'
    action VARCHAR(50) NOT NULL,             -- 'APPROVE'
    scope VARCHAR(50) NOT NULL,              -- 'TEAM'
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    entity_id UUID REFERENCES entities(id),  -- Scope to specific entity
    assigned_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE role_permissions (
    id UUID PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES roles(id),
    permission_id UUID NOT NULL REFERENCES permissions(id),
    is_granted BOOLEAN DEFAULT true
);
```

This gives you **enterprise-grade flexibility** while being **simple enough** to implement and maintain! 🚀
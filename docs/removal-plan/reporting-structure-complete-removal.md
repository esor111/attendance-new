# Reporting Structure Complete Removal Plan

**Date:** 2025-10-08  
**Decision:** Remove ALL reporting structure - no team/manager hierarchy needed now

---

## 🎯 What We're Removing

### **Files to Delete:**
1. `src/modules/attendance/entities/reporting-structure.entity.ts`
2. `src/modules/attendance/repositories/reporting-structure.repository.ts`

### **Services to Update (Remove Repository Usage):**
1. `AttendanceService` - Remove team viewing methods
2. `RequestService` - Remove approval validation
3. `LeaveService` - Remove team methods
4. `RemoteWorkService` - Remove team methods
5. `AttendanceRequestService` - Remove approval validation

### **Module to Update:**
1. `attendance.module.ts` - Remove repository registration

---

## 🚀 Execution Plan

### Step 1: Delete Entity and Repository
### Step 2: Remove from Module
### Step 3: Update Services (Remove Team Methods)
### Step 4: Update Database Diagram
### Step 5: Verification

---

## 📝 Services Impact

### Methods to REMOVE or SIMPLIFY:

**AttendanceService:**
- ❌ `getTeamAttendance()` - Remove (no team concept)
- ❌ `getTeamMemberAttendance()` - Remove (no team concept)

**RequestService:**
- ⚠️ `canApproveRequest()` - Simplify (just check permission, no manager check)
- ⚠️ `validateRequestAccess()` - Simplify (owner only)

**LeaveService:**
- ❌ `getTeamLeaveRequests()` - Remove (no team concept)
- ❌ `getPendingTeamRequests()` - Remove (no team concept)
- ⚠️ `canApproveRequest()` - Simplify (just check permission)

**RemoteWorkService:**
- ❌ `getTeamRequests()` - Remove (no team concept)
- ❌ `getPendingTeamRequests()` - Remove (no team concept)

**AttendanceRequestService:**
- ⚠️ `approveRequest()` - Simplify (just check permission)

---

## ✅ Result

After removal:
- ✅ No team/manager hierarchy
- ✅ RBAC handles all permissions
- ✅ Users can only see/manage their own data
- ✅ Admins with proper permissions can see all data
- ✅ Simpler codebase

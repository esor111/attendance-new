# Reporting Module Removal - Quick Checklist

## 🎯 Files to DELETE (5 files)

```bash
# Controllers
[ ] src/modules/attendance/controllers/reporting.controller.ts

# Services
[ ] src/modules/attendance/services/reporting.service.ts
[ ] src/modules/attendance/services/reporting.service.spec.ts

# DTOs
[ ] src/modules/attendance/dto/create-reporting-structure.dto.ts
[ ] src/modules/attendance/dto/update-reporting-structure.dto.ts
```

---

## ✏️ Files to MODIFY (3 files)

### 1. src/modules/attendance/attendance.module.ts
```typescript
[ ] Remove import: ReportingController
[ ] Remove import: ReportingService
[ ] Remove from controllers array: ReportingController
[ ] Remove from providers array: ReportingService (line ~93)
[ ] Remove from exports array: ReportingService (line ~114)
```

### 2. src/schedule-integration.spec.ts
```typescript
[ ] Remove import: ReportingService (line 5)
[ ] Remove variable: reportingService (line 14)
[ ] Remove provider mock (lines 43-47)
[ ] Remove module.get call (line 55)
[ ] Remove expect statement (line 131)
[ ] Remove entire test case: 'should integrate reporting with schedule compliance'
```

### 3. test/schedule-integration.spec.ts
```typescript
[ ] Same changes as above (duplicate file)
```

---

## ✅ KEEP These Files (DO NOT DELETE)

```bash
✅ src/modules/attendance/entities/reporting-structure.entity.ts
✅ src/modules/attendance/repositories/reporting-structure.repository.ts
✅ database-diagram.dbml (reporting_structure table stays)
```

---

## 🔍 Verification Commands

```bash
# 1. Check for remaining references (should be empty)
[ ] grep -r "ReportingService" src/ --exclude-dir=node_modules
[ ] grep -r "ReportingController" src/ --exclude-dir=node_modules

# 2. Verify repository still used (should show results)
[ ] grep -r "ReportingStructureRepository" src/ --exclude-dir=node_modules

# 3. Build and test
[ ] npm run build
[ ] npm test
[ ] npm run start:dev
```

---

## 📊 Expected Results

### After Deletion:
- ❌ 5 files deleted
- ✏️ 3 files modified
- ✅ 3 files kept (entity, repository, table)

### After Verification:
- ✅ No compilation errors
- ✅ All tests pass (except removed reporting tests)
- ✅ Application starts successfully
- ✅ AttendanceService still works
- ✅ RequestService still works
- ✅ LeaveService still works

---

## 🚨 If Something Breaks

```bash
# Quick rollback
git checkout backup/before-reporting-removal
```

---

## 📝 Notes

- **Repository is used by:** AttendanceService, RequestService, LeaveService
- **Table stays in database:** reporting_structure
- **Alternative endpoints:** Use /api/attendance/team instead
- **Breaking change:** Yes - /api/reporting/* endpoints removed

---

**Total Time:** ~45 minutes  
**Risk Level:** MEDIUM (Breaking API changes)  
**Rollback:** Easy (git checkout backup branch)

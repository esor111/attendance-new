# Leave Management Migration Strategy

## Overview

This document outlines the migration strategy for consolidating the leave management system from 3 tables (leave_types, leave_requests, leave_balances) to 1 table (leave_requests) with embedded configuration and balance tracking.

## Migration Steps

### Phase 1: Data Preservation (Before Code Changes)

1. **Backup Existing Data**
   ```sql
   -- Create backup tables
   CREATE TABLE leave_types_backup AS SELECT * FROM leave_types;
   CREATE TABLE leave_requests_backup AS SELECT * FROM leave_requests;
   CREATE TABLE leave_balances_backup AS SELECT * FROM leave_balances;
   ```

2. **Export Leave Type Mappings**
   ```sql
   -- Export leave type configurations for reference
   SELECT id, name, max_days_per_year, requires_approval, can_carry_forward, 
          max_carry_forward_days, min_advance_notice_days
   FROM leave_types 
   WHERE is_active = true;
   ```

### Phase 2: Schema Migration (After Code Deployment)

1. **Update leave_requests Table Structure**
   ```sql
   -- Add new columns to leave_requests
   ALTER TABLE leave_requests 
   ADD COLUMN leave_type VARCHAR(20),
   ADD COLUMN balance_info JSONB;

   -- Create index on new leave_type column
   CREATE INDEX idx_leave_request_type ON leave_requests(leave_type);
   ```

2. **Migrate Leave Type Data**
   ```sql
   -- Map existing leave_type_id to enum values
   UPDATE leave_requests 
   SET leave_type = CASE 
     WHEN lt.name ILIKE '%annual%' OR lt.name ILIKE '%vacation%' THEN 'ANNUAL'
     WHEN lt.name ILIKE '%sick%' THEN 'SICK'
     WHEN lt.name ILIKE '%personal%' THEN 'PERSONAL'
     WHEN lt.name ILIKE '%emergency%' THEN 'EMERGENCY'
     ELSE 'ANNUAL' -- Default fallback
   END
   FROM leave_types lt
   WHERE leave_requests.leave_type_id = lt.id;
   ```

3. **Migrate Balance Data**
   ```sql
   -- Populate balance_info JSON column
   UPDATE leave_requests 
   SET balance_info = jsonb_build_object(
     'allocatedDays', COALESCE(lb.allocated_days, lt.max_days_per_year),
     'usedDays', COALESCE(lb.used_days, 0),
     'remainingDays', COALESCE(lb.remaining_days, lt.max_days_per_year)
   )
   FROM leave_types lt
   LEFT JOIN leave_balances lb ON (
     lb.user_id = leave_requests.user_id 
     AND lb.leave_type_id = leave_requests.leave_type_id
     AND lb.year = EXTRACT(YEAR FROM leave_requests.start_date)
   )
   WHERE leave_requests.leave_type_id = lt.id;
   ```

### Phase 3: Cleanup (After Verification)

1. **Remove Old Columns and Constraints**
   ```sql
   -- Remove foreign key constraint
   ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS fk_leave_requests_leave_type_id;
   
   -- Remove old column
   ALTER TABLE leave_requests DROP COLUMN leave_type_id;
   ```

2. **Drop Old Tables (After Verification)**
   ```sql
   -- Only after confirming data integrity
   DROP TABLE leave_balances;
   DROP TABLE leave_types;
   ```

## Data Validation

### Pre-Migration Validation
```sql
-- Count records in each table
SELECT 'leave_types' as table_name, COUNT(*) as record_count FROM leave_types
UNION ALL
SELECT 'leave_requests', COUNT(*) FROM leave_requests
UNION ALL
SELECT 'leave_balances', COUNT(*) FROM leave_balances;

-- Check for orphaned records
SELECT COUNT(*) as orphaned_requests
FROM leave_requests lr
LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lt.id IS NULL;
```

### Post-Migration Validation
```sql
-- Verify all requests have leave_type and balance_info
SELECT COUNT(*) as missing_leave_type
FROM leave_requests 
WHERE leave_type IS NULL;

SELECT COUNT(*) as missing_balance_info
FROM leave_requests 
WHERE balance_info IS NULL;

-- Verify balance calculations
SELECT 
  leave_type,
  COUNT(*) as request_count,
  AVG((balance_info->>'allocatedDays')::numeric) as avg_allocated,
  AVG((balance_info->>'usedDays')::numeric) as avg_used,
  AVG((balance_info->>'remainingDays')::numeric) as avg_remaining
FROM leave_requests
GROUP BY leave_type;
```

## Rollback Plan

If issues are discovered after migration:

1. **Restore from Backup**
   ```sql
   -- Restore original tables
   DROP TABLE leave_requests;
   CREATE TABLE leave_requests AS SELECT * FROM leave_requests_backup;
   CREATE TABLE leave_types AS SELECT * FROM leave_types_backup;
   CREATE TABLE leave_balances AS SELECT * FROM leave_balances_backup;
   ```

2. **Recreate Indexes and Constraints**
   ```sql
   -- Recreate necessary indexes and foreign keys
   ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_leave_type_id 
   FOREIGN KEY (leave_type_id) REFERENCES leave_types(id);
   ```

## Leave Type Configuration Mapping

| Old Database Config | New Enum Value | Configuration |
|---------------------|----------------|---------------|
| Annual Leave / Vacation | ANNUAL | 25 days, requires approval, can carry forward 5 days, 7 days notice |
| Sick Leave | SICK | 10 days, no approval required, no carry forward, no advance notice |
| Personal Leave | PERSONAL | 5 days, requires approval, no carry forward, 3 days notice |
| Emergency Leave | EMERGENCY | 3 days, requires approval, no carry forward, no advance notice |

## Testing Strategy

1. **Unit Tests**: Verify new service methods work with migrated data
2. **Integration Tests**: Test complete leave request workflows
3. **Performance Tests**: Ensure JSON queries perform adequately
4. **User Acceptance Tests**: Verify all existing functionality works

## Timeline

- **Phase 1 (Data Backup)**: 1 hour
- **Phase 2 (Migration)**: 2-3 hours
- **Phase 3 (Cleanup)**: 1 hour after 1 week verification period

## Success Criteria

- ✅ All existing leave requests preserved with correct leave types
- ✅ Balance information accurately migrated
- ✅ All API endpoints function correctly
- ✅ No data loss or corruption
- ✅ Performance maintained or improved
- ✅ Reduced complexity achieved (3 tables → 1 table)

## Risk Mitigation

- **Data Loss**: Complete backups before any changes
- **Performance Issues**: Monitor query performance, add indexes as needed
- **Business Logic Errors**: Comprehensive testing of all leave scenarios
- **User Impact**: Deploy during low-usage hours with rollback plan ready
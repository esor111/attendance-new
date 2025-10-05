---
inclusion: always
---


# Development Process & Rules - Attendance Microservice

---

## 1. Data Population (HANDSHAKE PROCESS)

### When Data Gets Populated
- **User Login** → Check if user exists locally → If NO, fetch from User Microservice → Save locally
- **Business Switch** → Check if business exists locally → If NO, fetch from Business Microservice → Save locally

### Simple Flow
```typescript
// User logs in with userId and businessId

// Check user
let user = await userRepository.findOne({ where: { userId } });
if (!user) {
  // Fetch from User Microservice & save locally
  const data = await httpService.get(`${USER_SERVICE_URL}/users/${userId}`);
  user = await userRepository.save({ userId, ...data, lastSyncedAt: new Date() });
}

// Check business
let business = await businessRepository.findOne({ where: { businessId } });
if (!business) {
  // Fetch from Business Microservice & save locally
  const data = await httpService.get(`${BUSINESS_SERVICE_URL}/businesses/${businessId}`);
  business = await businessRepository.save({ businessId, ...data, lastSyncedAt: new Date() });
}

// Now user can perform attendance operations
Key Points

We DON'T own user/business data - just keep a local copy
External microservices are the source of truth
We only READ and CACHE
Population happens automatically during login/switch
Once populated, data is reused (no repeated API calls)


2. Error Handling & Self-Correction
When You Get Stuck or Repeat a Mistake:
1. STOP CODING ⛔
Don't write more code. Don't try "one more thing."
2. SCAN CODEBASE 🔍

Read all related files completely
Check entity definitions, services, controllers
Find similar patterns that work correctly

3. UNDERSTAND ROOT CAUSE 🧠
Ask yourself:

WHY did this error happen?
WHAT assumption was wrong?
WHERE is this done correctly in the codebase?

4. DOCUMENT THE ISSUE 📝
Create documentation explaining the problem and solution.
5. CODE CORRECTLY ✅
Now write code using the correct pattern.
Example
typescript// ❌ MISTAKE
@Get(':id/records')
async getRecords(@Param('id') id: string) {
  return this.service.findById(id);  // Wrong - using internal UUID approach
}

// 🛑 STOP → 🔍 SCAN other controllers → 🧠 UNDERSTAND pattern

// ✅ CORRECT
@Get(':userId/records')
async getRecords(@Param('userId') userId: string) {
  return this.service.findByUserId(userId);  // Right - using external ID
}

3. Documentation Requirements
WHEN to Document
ScenarioExampleCreate InMajor ChangesAdded new moduledocs/architecture/Repeated MistakeKeep using wrong ID typedocs/troubleshooting/Stuck on ProblemGeofence calculation issuesdocs/troubleshooting/Complex LogicMulti-step validation rulesdocs/business-logic/External APIUser Microservice contractdocs/api/Architecture DecisionWhy dual ID systemdocs/decisions/
Documentation Folders
docs/
├── architecture/      # System design
├── decisions/        # Why we chose X
├── troubleshooting/  # Common errors
├── business-logic/   # Complex rules
├── api/             # External services
└── learnings/       # Mistake/solution pairs

4. Documentation Template
markdown# [Title]

## Problem
[What happened or what you're documenting]

## Context
[Why this matters, background information]

## Root Cause
[Why this happened or why this decision was made]

## Solution
[How to do it correctly]

## Code Examples

### ❌ Wrong Way
```typescript
// Wrong code here
✅ Correct Way
typescript// Correct code here
Related Files

src/modules/attendance/attendance.controller.ts
src/modules/user/user.entity.ts

Key Takeaways

Point 1
Point 2
Point 3

Date
2025-10-05

---

## 5. What NOT to Build

### We Don't Build:

❌ **Caching** (Redis, in-memory) - Database is fast enough  
❌ **Migration files** - We use `synchronize: true`  
❌ **Message queues** - Everything is synchronous  
❌ **WebSockets** - Request/response only  
❌ **GraphQL** - REST is sufficient  
❌ **Background jobs** - Process immediately  
❌ **Complex auth** - JWT on one route initially  
❌ **Deep abstractions** - Keep code simple  
❌ **Premature optimization** - Optimize when measured  
❌ **100% test coverage** - Test what matters  

### Only Add If:
1. ✅ You have **measured data** showing it's needed
2. ✅ Problem is **current and painful**, not hypothetical
3. ✅ **Simpler solutions** exhausted
4. ✅ **Team agrees** it's worth complexity

---

## Quick Checklist

### Before Any Task
- [ ] Understand handshake process?
- [ ] Know when data gets populated?
- [ ] Checked "What NOT to Build" list?

### When Stuck
- [ ] Stopped coding?
- [ ] Scanned codebase?
- [ ] Understood root cause?
- [ ] Documented issue?

### Before Adding Feature
- [ ] In "What NOT to Build" list?
- [ ] Have measured data?
- [ ] Problem is current?
- [ ] Simpler solutions tried?

**Remember: Build only what's needed. Document when necessary. Stay focused.**<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> <!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
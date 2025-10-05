---
inclusion: always
---

# Attendance Microservice - Complete Development Guide

## Core Philosophy

**"Build exactly what's needed - not less, not more."**

- No over-engineering
- No premature optimization
- Synchronous operations only
- Clean, readable code with meaningful comments
- Reuse patterns through base classes
- Test smartly, not excessively

---

## Technology Stack

### Backend
- **Framework**: NestJS + TypeScript (strict mode)
- **Database**: PostgreSQL with TypeORM
- **API**: REST only (no GraphQL, no WebSockets)
- **Auth**: JWT (test with one route initially per module)

### Critical Configuration
```typescript
// TypeORM Config - ALWAYS use synchronize mode
{
  type: 'postgres',
  synchronize: true,  // NO migration files EVER
  autoLoadEntities: true,
  logging: true
}<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
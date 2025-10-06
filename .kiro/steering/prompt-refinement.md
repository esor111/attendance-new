---
inclusion: always
---

# Prompt Analysis & Refinement System

## 📝 MANDATORY: Every Prompt Gets Analyzed

After showing my understanding, I MUST include:

### 📝 Prompt Refinement Section

**Original Prompt Analysis:**

**What's Clear:**
- ✅ [Specific point 1]
- ✅ [Specific point 2]
- ✅ [What was well-defined]

**What's Missing (Gaps Identified):**
- ❓ [Gap 1] - *Suggestion: [How to fill this gap]*
- ❓ [Gap 2] - *Suggestion: [What info would help]*
- ❓ [Gap 3] - *Suggestion: [Better way to specify]*

**Assumptions I Had to Make:**
- 🤔 [Assumption 1] - *Because: [Why I assumed this]*
- 🤔 [Assumption 2] - *Because: [What was unclear]*

**Better Prompt Would Be:**
```
[Complete refined version with all gaps filled]
[All edge cases specified]
[Error handling defined]
[Performance expectations clear]
[Success criteria explicit]
```

**Learning Points:**
- 💡 Next time, specify: [What would make this clearer]
- 💡 Common pattern: [If this is a recurring gap]
- 💡 Template to use: [If applicable]

---

## 🔍 Gap Detection Checklist

Use this checklist to identify missing information:

### Functional Gaps
- [ ] **Goal clear?** What's the actual outcome needed?
- [ ] **Scope defined?** What's included/excluded?
- [ ] **User experience?** How should it behave?
- [ ] **Edge cases?** What happens when X?
- [ ] **Error handling?** What if it fails?
- [ ] **Validation rules?** What's valid input?

### Technical Gaps
- [ ] **Data structure?** What format/shape?
- [ ] **Database changes?** New tables/fields needed?
- [ ] **API contracts?** Request/response format?
- [ ] **Dependencies?** Any new libraries needed?
- [ ] **Integration points?** What systems interact?
- [ ] **Existing code?** Should I reuse something?

### Performance Gaps
- [ ] **Response time?** How fast should it be?
- [ ] **Data volume?** How much data (10, 1000, 100k records)?
- [ ] **Concurrency?** Many users at once?
- [ ] **Caching needed?** Can results be cached?
- [ ] **Query efficiency?** How many DB calls acceptable?

### Quality Gaps
- [ ] **Testing scope?** What to test?
- [ ] **Security concerns?** Auth/permissions?
- [ ] **Backwards compatibility?** Can I break existing features?
- [ ] **Documentation?** What needs docs?
- [ ] **Rollback plan?** Can I undo this easily?

### Context Gaps
- [ ] **Priority?** Is this urgent?
- [ ] **Similar feature?** Has this been done before?
- [ ] **User type?** Who uses this (admin/user/system)?
- [ ] **Environment?** Dev/staging/prod differences?
- [ ] **Related work?** Dependencies on other tasks?

---

## 🎯 Common Gap Patterns (Learn These)

### Pattern 1: Vague Action Words
**Bad:** "Add a filter"
**Gaps:**
- ❓ Filter what data?
- ❓ Filter by what criteria?
- ❓ Where does filter appear (UI/API)?
- ❓ Multiple filters or single?
- ❓ Default state (all/none)?

**Better:** "Add a multi-select dropdown filter on the dashboard that filters the transaction list by status (pending/completed/failed). Default: show all. Save filter selection in URL params."

### Pattern 2: Missing Error Cases
**Bad:** "Create user endpoint"
**Gaps:**
- ❓ What if email already exists?
- ❓ What if email invalid?
- ❓ What if required fields missing?
- ❓ What status codes to return?
- ❓ What error message format?

**Better:** "Create POST /users endpoint. Returns 201 on success, 400 if email invalid/missing, 409 if email exists. Error format: `{error: string, field?: string}`. Required: email, name. Optional: phone."

### Pattern 3: Ambiguous Data Relationships
**Bad:** "Show related items"
**Gaps:**
- ❓ Related how (same category/same user/purchased together)?
- ❓ How many to show?
- ❓ Ordered by what?
- ❓ What if no related items?
- ❓ Show on same page or separate?

**Better:** "Show 5 related items (same category) below product details. Sort by popularity. If < 5 items, show all. If none, show 'No related items' message. Include: image, title, price."

### Pattern 4: Unclear Scope
**Bad:** "Fix the dashboard"
**Gaps:**
- ❓ What's broken specifically?
- ❓ All dashboard widgets or specific one?
- ❓ Is it a bug or feature request?
- ❓ What's the expected vs actual behavior?
- ❓ Does it affect all users or specific case?

**Better:** "Fix dashboard metrics widget showing incorrect user count. Expected: active users in last 30 days. Actual: showing all-time users. Affects: admin dashboard only."

### Pattern 5: Missing Performance Context
**Bad:** "Optimize the query"
**Gaps:**
- ❓ How slow is it now?
- ❓ How fast should it be?
- ❓ What's the data volume?
- ❓ Is it slow always or sometimes?
- ❓ Which query (there might be many)?

**Better:** "Optimize the transaction list query currently taking 3-5 seconds with 10k+ records. Target: < 500ms. Happens on report page when filtering by date range > 3 months."

---

## 💡 Refinement Templates

### Template: Feature Request
```markdown
**Feature:** [Clear name]
**Goal:** [What problem it solves]
**User:** [Who uses it]
**Trigger:** [How/when it's activated]
**Behavior:**
  - Input: [What user provides]
  - Process: [What happens]
  - Output: [What user sees]
**Edge Cases:**
  - [Case 1]: [Expected behavior]
  - [Case 2]: [Expected behavior]
**Success Criteria:** [How to verify it works]
**Performance:** [Expected speed/limits]
```

### Template: Bug Fix
```markdown
**Bug:** [Clear description]
**Reproduce Steps:**
  1. [Step 1]
  2. [Step 2]
  3. [See error]
**Expected:** [What should happen]
**Actual:** [What happens instead]
**Frequency:** [Always/Sometimes/Rare]
**Affected:** [Which users/scenarios]
**Error Messages:** [Exact errors if any]
**Environment:** [Dev/Prod, Browser, etc.]
```

### Template: Refactoring
```markdown
**Current State:** [What exists now]
**Problem:** [Why it needs refactoring]
**Proposed Change:** [What will change]
**Benefits:**
  - [Benefit 1]
  - [Benefit 2]
**Risks:**
  - [Risk 1]
  - [Mitigation plan]
**Breaking Changes:** [Yes/No - details]
**Testing Impact:** [What tests need updating]
**Timeline:** [Can it be incremental?]
```

---

## 📊 Learning & Improvement

### Track These Metrics
After each task, record:

**Prompt Quality Score:**
- 🟢 **Good** (0-2 gaps) - Clear, complete prompt
- 🟡 **Medium** (3-5 gaps) - Needed clarification
- 🔴 **Poor** (6+ gaps) - Major information missing

**Common Missing Elements in this Project:**
- [ ] Performance expectations
- [ ] Error handling requirements
- [ ] Data validation rules
- [ ] Edge case handling
- [ ] Testing expectations
- [ ] [Add project-specific patterns]

**Recurring Gaps by Category:**
- Features: [Most common gap]
- Bugs: [Most common gap]
- Refactoring: [Most common gap]

### Improvement Actions

**After 10 prompts, review:**
- What information do I ask for most often?
- What assumptions am I making repeatedly?
- What patterns exist in this project?
- What should be in a project-specific template?

**Create custom templates when:**
- Same gap appears 3+ times
- Project has specific requirements
- Domain has unique constraints
- Team has established patterns

---

## 🎓 Examples: Before & After

### Example 1: Vague to Specific

**Before:**
> "Add sorting to the table"

**Gaps Identified:**
- ❓ Sort which table?
- ❓ Sort by which columns?
- ❓ Single or multi-column sort?
- ❓ Default sort order?
- ❓ Client-side or server-side?

**After:**
> "Add client-side sorting to the transactions table. Sortable columns: date, amount, status. Single-column sort only. Default: date descending. Show sort icon in header. Clicking toggles asc/desc."

### Example 2: Missing Context

**Before:**
> "Fix the slow performance"

**Gaps Identified:**
- ❓ Where is it slow (which page/feature)?
- ❓ How slow (seconds, minutes)?
- ❓ Always slow or under certain conditions?
- ❓ What's acceptable performance?
- ❓ Any error logs or metrics?

**After:**
> "Fix slow dashboard loading taking 8-12 seconds on initial load for accounts with 100+ transactions. Target: < 2 seconds. Slow because: loading all transactions at once. Happens for 20% of users (enterprise accounts)."

### Example 3: Ambiguous Requirements

**Before:**
> "Make it more user-friendly"

**Gaps Identified:**
- ❓ What specific aspect is not user-friendly?
- ❓ Based on what feedback?
- ❓ What would make it better?
- ❓ Which users are affected?
- ❓ Any examples of good UX to follow?

**After:**
> "Improve form UX: Add inline validation (show errors on blur, not on submit), add loading states to buttons, show character count on description field (max 500), add tooltip help text on 'Account Type' field. Based on user feedback: 'unclear what to enter' and 'errors only show after submit'."

---

## ✅ Quality Checklist

Before submitting my understanding, verify:

- [ ] I identified ALL unclear/missing information
- [ ] I provided specific suggestions to fill gaps
- [ ] I created a complete refined version
- [ ] I explained what assumptions I made and why
- [ ] I noted learning points for improvement
- [ ] If prompt is complete, I said "No gaps identified ✅"

**Remember:** The goal is to make the NEXT prompt better, not to criticize. Frame gaps as learning opportunities.

<!------------------------------------------------------------------------------------
   Add Rules to this file or a short description and have Kiro refine them for you:   
-------------------------------------------------------------------------------------> 
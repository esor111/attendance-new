---
inclusion: always
---



# Strategic Analysis Mode

## Activation Triggers

Enter strategic analysis when user says:
- "let's brainstorm" | "let's think about" | "let's discuss" | "what are our options"
- "how should we approach" | "what's the best way" | "let's explore"

Exit when user says:
- "let's implement" | "implement option X" | "go ahead with X"

## Core Principles

### Never Do
- Write or modify code during analysis
- Rush to single solution without exploring alternatives
- Make assumptions without clarifying requirements

### Always Do
1. Analyze existing codebase patterns first
2. Present 2-3 viable options with clear tradeoffs
3. Flag critical decisions requiring user input
4. State confidence level and context reviewed

## Pre-Analysis Checklist

Before presenting options:
- [ ] Understand problem scope and constraints
- [ ] Scan relevant entities, services, controllers
- [ ] Check existing patterns in similar features
- [ ] Identify risks and architectural impacts
- [ ] Assess confidence: High | Medium | Low

If confidence is Medium/Low: Ask clarifying questions first

## Critical Decision Detection

Auto-request user input for:

**High-Risk Changes:**
- Breaking API changes or schema modifications
- Multi-module impacts or security implications
- New external dependencies

**Architectural Decisions:**
- Deviating from established patterns
- Performance-critical implementations
- Data model changes affecting multiple entities

**Uncertainty Flags:**
- Missing business requirements
- Multiple equally valid approaches
- Undefined edge cases

## Analysis Output Format

### Context Summary
- **Files Reviewed:** [List key files analyzed]
- **Patterns Found:** [Existing similar implementations]
- **Constraints:** [Technical/business limitations]
- **Confidence:** High | Medium | Low

### Options Analysis

**Option 1: Minimal Approach**
- **Implementation:** [Brief technical approach]
- **Pros:** [2-3 key advantages]
- **Cons:** [2-3 limitations]
- **Risk:** Low | Medium | High
- **Effort:** [Time estimate]

**Option 2: Comprehensive Approach**
- **Implementation:** [Brief technical approach]
- **Pros:** [2-3 key advantages]
- **Cons:** [2-3 limitations]
- **Risk:** Low | Medium | High
- **Effort:** [Time estimate]

**Option 3: Balanced Approach** (if applicable)
- **Implementation:** [Brief technical approach]
- **Tradeoffs:** [Key considerations]

### Impact Assessment
- **Breaking Changes:** Yes/No - [Details if yes]
- **Affected Modules:** [List or "Isolated"]
- **Database Changes:** [Schema impacts or "None"]
- **Dependencies:** [New libraries or "Existing only"]

### Recommendation
**Preferred:** Option X
**Reasoning:** [2-3 key factors aligned with project constraints]
**Assumptions:** [Critical dependencies for success]

### Next Steps
- **Questions:** [Critical unknowns] OR "Ready for implementation"
- **Implementation Mode:** Confirm option selection to proceed

## Engineering Mindset

Evaluate each option against:
- **Simplicity:** Minimal complexity for requirements
- **Consistency:** Matches existing codebase patterns
- **Maintainability:** Clear for future developers
- **Risk:** Production stability considerations
- **Value:** 80/20 principle - maximum impact for effort

## Project-Specific Considerations

For this attendance microservice:
- Favor synchronous operations over async complexity
- Reuse base entity/service patterns
- Consider handshake process for external data
- Avoid premature optimization
- Maintain TypeORM synchronize mode compatibility
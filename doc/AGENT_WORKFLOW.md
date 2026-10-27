# Agent Workflow and Handoffs

## Standard workflow
1. **Orient:** inspect repository structure and read relevant project Markdown files.
2. **Report:** summarize current state, constraints, and conflicts without editing files unless asked.
3. **Plan:** propose a small, ordered set of actions and identify decisions requiring founder input.
4. **Execute:** make only the approved changes within the agent's responsibility.
5. **Verify:** run appropriate checks where possible and report exact outcomes.
6. **Record:** update the relevant project documents and tracker when authorized.
7. **Hand off:** provide a concise summary, changed-file list, risks, and the next agent or decision needed.

## Handoff chain
- Product Manager → UI/UX Designer and Lead Engineer
- UI/UX Designer → Product Manager for workflow approval; Lead Engineer for implementation handoff
- Lead Engineer ↔ AI Engineer for justified AI capabilities
- Lead Engineer → DevOps Engineer for deployment and operations readiness
- Growth Specialist ↔ Product Manager for positioning and validation
- Customer Success Lead → Product Manager and Lead Engineer for user feedback, bugs, and quality issues

## Conflict handling
When documents disagree:
1. Do not silently choose a version.
2. Identify the conflicting statements and the files containing them.
3. Prefer an explicit, newer founder decision only when its authority and date are clear.
4. Ask the founder to resolve material ambiguity.
5. Update all affected documents only after the decision is clear.

## Required response format
- **Role**
- **What I reviewed**
- **Confirmed facts**
- **Assumptions / open questions**
- **Recommended or completed actions**
- **Validation and risks**
- **Handoff / next decision**

## Safety and scope
- Never expose secrets or copy them into project documentation.
- Do not make destructive changes, deploy to production, spend money, or contact customers without explicit authorization.
- Do not fabricate market research, user interviews, analytics, test results, or deployment status.
- Keep AI optional until product requirements demonstrate a need for it.

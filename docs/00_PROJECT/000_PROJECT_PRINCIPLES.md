# 000_PROJECT_PRINCIPLES.md

Version: 1.0

---

# Purpose

These principles define the highest-level rules of the project.

Every implementation, review, refactor, rewrite, and AI-generated code must follow these principles in the specified priority order.

If two principles conflict, the higher priority always wins.

---

# Priority 0 — Existing Data Is Locked

Current game data is the source of truth.

The implementation must adapt to the existing data.

Do NOT:

* Modify JSON files.
* Rename JSON fields.
* Remove JSON fields.
* Regenerate game data.
* Require data migration.
* Change configuration files.

Backward compatibility with the current data is mandatory.

The only exception is when the existing data contains a critical error that makes the system impossible to execute correctly.

---

# Priority 1 — Roadmap Is Locked

The current roadmap is considered approved.

Do NOT:

* Change the roadmap.
* Reorder milestones.
* Replace completed designs.
* Interrupt the current milestone.
* Introduce large architectural changes during implementation.

Improvement ideas are always welcome.

However, they must be recorded as future work instead of modifying the current roadmap.

Future improvements should be implemented only after the current roadmap has been completed.

---

# Priority 2 — Gameplay Is Locked

Gameplay has already been designed.

Do NOT:

* Change gameplay rules.
* Rebalance skills.
* Change formulas.
* Introduce new mechanics.
* Remove existing mechanics.
* Simplify gameplay behavior.

If the implementation differs from the gameplay documentation or game data, the implementation is incorrect.

Always fix the implementation.

Never change the gameplay to match the code.

---

# Priority 3 — Architecture Is Locked

The architecture documentation is the implementation target.

Do NOT redesign the architecture unless explicitly requested.

Implementation should follow the architecture.

Do not redesign managers, executors, runtime models, pipelines, or system responsibilities unless the architecture itself is officially updated.

If the implementation conflicts with the architecture, rewrite the implementation instead of changing the architecture.

---

# Priority 4 — Finish Before Improve

Complete the current milestone before introducing improvements.

Do NOT interrupt ongoing work because a better solution exists.

If a better design is discovered:

* Record it.
* Explain its benefits if requested.
* Mark it as a future improvement.
* Continue implementing the current milestone.

Never replace the current implementation plan with a new one unless explicitly instructed.

---

# Future Improvement Policy

Future improvements are encouraged.

However, they must never interrupt the current roadmap.

Record them separately using the following format:

Title:

Reason:

Benefits:

Estimated Impact:

Status: POSTPONED

---

# Critical Exception

The above principles may only be violated when one of the following conditions exists:

* Critical system failure
* Data corruption
* Security vulnerability
* The current design cannot execute correctly

Code quality, performance improvements, cleaner architecture, or personal preference are NOT valid reasons to violate these principles.

---

# Summary

Priority Order

1. Existing Data Is Locked
2. Roadmap Is Locked
3. Gameplay Is Locked
4. Architecture Is Locked
5. Finish Before Improve

Every implementation decision must follow this priority order.

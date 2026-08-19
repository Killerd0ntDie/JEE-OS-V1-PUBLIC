# Project: JEE-OS Comprehensive Architecture, Security, and Code Quality Audit

## Architecture & Scope
A deep, multi-dimensional audit of the JEE-OS codebase targeting:
1. **Core Engines (`audit_reports/core_engines.md`)**: AnalyticsEngine, ChapterInfoEngine, OptimizationEngine, PlannerEngine, RevisionEngine, StudyBrainRuntime, and associated math/telemetry engines.
2. **State Management & Data Layer (`audit_reports/state_management.md`)**: StudyBrainContext, StudyBrainActions, persistence/localStorage sync, reducers, mutation handlers, concurrency/race conditions.
3. **UI Components & Modals (`audit_reports/ui_components.md`)**: Page layouts, universal modals (ChapterEditModal, etc.), execution queues, charts, radar renders, rendering bottlenecks, memory leaks.
4. **Security & Reliability (`audit_reports/security.md`)**: Input sanitization, data integrity, error boundaries, state corruption risks, scale limitations, malicious payload handling, offline reliability.

## Feature Inventory (Audit Domains)
| # | Domain / Feature | Scope | Output Report | Status |
|---|------------------|-------|---------------|--------|
| 1 | Core Engines | All files in `src/engines/` and math utilities | `audit_reports/core_engines.md` | Surveying |
| 2 | State Management | Contexts, Actions, reducers, persistence, runtime | `audit_reports/state_management.md` | Surveying |
| 3 | UI Components & Modals | All components, pages, universal modals, rendering | `audit_reports/ui_components.md` | Surveying |
| 4 | Security & Reliability | Input sanitization, data safety, crash risks, scale | `audit_reports/security.md` | Surveying |

## Mandatory Report Requirements
Every domain report in `audit_reports/` MUST include:
1. Identified Bugs (logic errors, off-by-one, type inconsistencies, edge cases)
2. Dead Code (unused imports, unreachable branches, orphaned types/functions)
3. Illicit / Poor Logic (anti-patterns, redundant calculations, mutation risks, performance anti-patterns)
4. Dedicated Section: `## Predicted Failure Points` (detailed failure scenarios under scale, edge cases, rapid state changes, missing null-checks)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Codebase Survey & Domain Exploration | Explorers probe all domains | none | IN_PROGRESS |
| M2 | Report Generation | Workers compile detailed reports in `audit_reports/` | M1 | PLANNED |
| M3 | Review & Adversarial Verification | 2 Reviewers, 2 Challengers audit the reports | M2 | PLANNED |
| M4 | Forensic Audit & Read-Only Check | Forensic Auditor verifies read-only integrity & completeness | M3 | PLANNED |
| M5 | Final Synthesis & Handover | Orchestrator synthesizes findings and notifies parent | M4 | PLANNED |

## Code Layout & Constraint Rules
- Root Workspace: `d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)`
- Output Directory: `d:\JEE OS PLEASE HELP\jee-os (5)\jee-os (10)\audit_reports`
- STRICT READ-ONLY: ZERO modifications to `.ts` or `.tsx` source code in the repository.

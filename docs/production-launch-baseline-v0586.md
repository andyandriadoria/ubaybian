# UbayBian v0.5.86 — Production Launch Baseline

This release establishes the first real learning baseline for Ubay and Bian.

## Goal

All development/testing learning history is cleared once so every XP, coin, score, streak, badge, review item, report entry, game best, and reward activity shown after launch belongs to the children’s real usage.

## Cleared once

For profiles `ubay` and `bian`:

- Practice sessions, question snapshots, and answers
- Practice `progress_summary`
- Assessment sessions, question snapshots, and answers
- Review state (derived from Practice + Assessment history)
- XP, coins, streak, level progress, session totals, report history (all derived from cleared learning history)
- Brain Games / Memory Grid `game_sessions`, including best scores and game XP
- Reward Shop request history and spent/reserved coin state
- Achievement ledger / badges

## Preserved

- Family account and password
- Ubay and Bian profile definitions
- Parent PIN/security configuration
- Login/session infrastructure
- Question banks / Google Sheets sources
- Assessment Registry and blueprints
- Application configuration and source code

## Safety

`src/launch-baseline.js` records the reset key `production-launch-2026-09-13-v1` in `launch_resets` after a successful cleanup. Once recorded, later requests and deployments do not clear learning data again.

The Worker entry point is `src/worker.js`, which runs the baseline guard before normal API handling. This allows production D1 to be cleaned even when D1 migrations and Worker deployments happen separately.

Migration `0006_production_launch_baseline.sql` creates the marker table but does not itself delete learning data.

## Expected clean state

Immediately after the one-time reset and before either child starts a new activity:

- XP: 0
- Coins: 0
- Level: 1 · Rookie Bot
- Streak: 0
- Practice sessions: 0
- Assessment sessions: 0
- Review queue: 0
- Report: empty
- Badges/Achievements: none
- Brain Games / Memory Grid best: 0
- Reward Shop history: empty

From that point forward, all recorded learning data is production data.

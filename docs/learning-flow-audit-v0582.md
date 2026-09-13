# UbayBian Learning Flow Audit — v0.5.82

This audit stabilizes the end-to-end learning flow across both profiles and all configured subjects:

`Practice / Assessment → Result → Reward → Review → Dashboard / Report`

## Invariants

### Practice

- Auto-scored questions award the existing Practice rewards.
- Wrong and skipped questions enter Review.
- Practice sessions contribute to XP, coins, streak, total learning sessions, subject activity, badges, and Report.

### Assessment

- Assessment remains backed by the historical internal `exam_*` API/table naming for backward compatibility.
- User-facing terminology is **Assessment**.
- Assessment availability follows the full subject list for Ubay and Bian.
- Reward policy remains separate from Practice:
  - +5 XP per auto-correct answer.
  - +20 coins per auto-correct answer.
  - +50 XP when at least 80% of the Assessment is answered.
  - Reward is granted only to the first qualifying attempt for the same profile + subject + blueprint.
- Wrong and unanswered auto-scored questions enter Review.
- Open-response questions never enter automatic Review because they require manual review.
- Assessment sessions contribute to streak, total learning sessions, subject activity, question totals, and Report.

### Open response and score semantics

Assessment papers containing open-response questions do **not** expose the auto-score as a final score.

Report entries distinguish:

- `scoreStatus: final` — no pending open response; score can be used in final averages/mastery.
- `scoreStatus: auto` — score covers auto-scored questions only; open response is still pending review.

Provisional auto-scores are visible for learning feedback but are excluded from final-score averages and Subject Master calculations.

### Report

- Report shows the 10 most recent completed learning sessions across Practice and Assessment.
- Rows identify their source as Practice or Assessment.
- Report averages, best score, benchmark insights, and recent-score trend use final scores only.
- Provisional Assessment auto-scores are labelled as such and explained in the UI.

### Streak and aggregate activity

- A completed Practice or Assessment can keep the learning-day streak alive.
- `totalSessions` combines Practice + Assessment.
- Aggregate answered/correct counts include Assessment activity while preserving separate Practice/Assessment breakdown fields.

### Rewards and balances

- Reward accounting remains source-specific and is not inferred from Report data.
- Practice reward totals and Assessment reward totals are computed independently, then combined into the profile XP/coin balance.
- Retaking an already rewarded Assessment does not mint a second Assessment reward.

## Compatibility

No D1 migration is required for v0.5.82. Existing `exam_sessions`, `exam_session_questions`, and `exam_answers` remain unchanged.

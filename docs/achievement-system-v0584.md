# UbayBian Achievement System · v0.5.84

Badges are durable learning achievements, not temporary dashboard decorations. The backend still derives eligibility from learning history, but once migration `0005_achievement_ledger.sql` is active every unlocked badge is persisted in the `achievements` ledger and remains part of the child's history across grade and academic-year changes.

## Principles

- Badges belong to a child profile, never to the shared family account.
- Similar milestones upgrade one badge instead of stacking near-duplicates.
- Practice, Assessment, Review recovery, consistency, and subject mastery have separate achievement families.
- `Subject Master` requires a final-scored Assessment. A short Practice session cannot award Master.
- Assessment results containing open-response items remain provisional (`auto`) and cannot award Assessment Ace, Assessment Perfect, or Subject Master until a final score exists.
- Assessment wrong/unanswered auto-scored questions followed by a later correct Practice/Review answer count as recovery.
- Semester completion is driven by the Assessment Registry. No hard-coded subject list is needed.

## Consistency

One `learning-streak` badge upgrades through:

| Tier | Name | Rule |
|---|---|---|
| Bronze | On Fire | 3 consecutive learning days |
| Gold | Steady Learner | 14 consecutive learning days |
| Crown | Unstoppable | 30 consecutive learning days |

Practice and completed Assessment sessions both count toward learning days. The longest streak is used, so an unlocked streak achievement is not lost when the current streak later breaks.

## Practice & learning volume

### Perfect Score

One `perfect-score` badge upgrades through 1 / 3 / 5 / 10 Practice sessions scored at 100%:

Perfect Starter → Perfect Pro → Perfect Expert → Perfect Legend.

### Study Habit

One `study-habit` badge upgrades at 10 / 25 / 50 / 100 completed Practice + Assessment sessions:

Study Habit → Dedicated Learner → Study Champion → Learning Legend.

### Questions Answered

One `questions-answered` badge upgrades at 100 / 250 / 500 / 1,000 answered Practice + Assessment questions.

### Challenge Accepted

Unlocked after completing a 15-question Practice session.

## Mastery

Each subject has one `subject-mastery` badge scoped by subject:

- **Star** — at least 90% in a Practice session.
- **Master** — at least 90% in a final-scored Assessment for that subject.

This means a learner can first earn `Math Star`, then upgrade that same achievement to `Math Master` rather than showing two unrelated badges.

Multi-subject mastery is also tiered:

- Dual Master — 2 Subject Masters.
- All-Rounder — 3 Subject Masters.
- Multi-Subject Master — 5 Subject Masters.

## Growth & Review

Recovery is calculated from the unified Practice + Assessment history. A unique question counts as recovered when it was previously wrong/unanswered and is later answered correctly.

- Comeback — recover 10 unique questions.
- Never Give Up — recover 25 unique questions.
- Review Clear — recover at least 5 unique questions and currently have no live Review items.

Assessment open-response items are excluded from automatic Review/recovery because they require manual evaluation.

## Assessment achievements

- First Assessment — complete the first Assessment.
- Assessment Ace — final-scored Assessment ≥90%.
- Assessment Perfect — upgrades Assessment Ace after a final-scored 100% Assessment.
- Semester N Finisher — complete every `final` Assessment definition registered for that profile, grade, academic year, and semester.

`Semester Finisher` becomes available automatically when Final Assessment definitions are added to the Assessment Registry.

## Achievement Ledger

Migration `0005_achievement_ledger.sql` adds `achievements` with:

- family/profile ownership,
- badge ID + scope key,
- category,
- tier/tier label,
- rarity/priority,
- display copy,
- academic year / grade / semester snapshot,
- metadata JSON,
- first unlock time,
- latest upgrade time.

The `(profile_id, badge_id, scope_key)` unique key means a tiered badge upgrades in place. `unlocked_at` remains the first milestone date while `upgraded_at` tracks the newest tier.

During rolling deployment the dashboard remains compatible if migration `0005` has not yet been applied: badges are still derived in memory. Once D1 reports `achievementLedgerReady: true`, derived achievements are backfilled into the ledger and future upgrades persist automatically.

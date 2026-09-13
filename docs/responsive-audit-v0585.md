# Responsive Audit — v0.5.85

UbayBian uses `responsive-v0585.css` as the final responsive containment layer. It is intentionally loaded after the older visual layers so responsive fixes do not require rewriting every historical component stylesheet.

## Primary targets

- Desktop: above 1180 px.
- Tablet landscape: 901–1180 px.
- Tablet portrait / phone landscape: 701–900 px.
- Phone portrait / small tablet: up to 700 px.
- Very small phones: up to 420 px.
- Short phone landscape: landscape, up to 950 px wide and 600 px high.

These are layout targets, not device-model assumptions. Components must remain fluid between breakpoints.

## v0.5.85 fixes

### Report

- `report-main-grid`, chart panel, detail panel, and table scroll container can shrink (`min-width: 0`).
- Desktop/tablet table is contained inside its own scroll region instead of increasing page width.
- At phone widths, Detail Sesi changes from a wide four-column table into stacked session cards with `Tanggal`, `Subject`, `Nilai`, and `Benar / Total` labels.
- Report header, mascot, badge, chart, insight cards, and session-type chips are constrained to the viewport.

### Top navigation

- Tablet and smaller layouts use two topbar rows so the centered Home / Report / Robot Lab navigation cannot collide with the brand, version, Ganti profil, or Keluar actions.
- Phone navigation uses three equal-width menu buttons.
- The version chip is hidden on small phones to preserve useful horizontal space.
- `viewport-fit=cover` plus safe-area padding supports devices with display cutouts.

### Home / sidebar

- Main content moves before the sidebar on narrow layouts.
- Tablet sidebar uses two columns.
- Phone profile and Badges cards span the full width, while functional tiles use compact columns when space permits.
- Very small phones fall back to one column.
- Mission Setup controls and floating selection menus are forced to stay within their parent width.

### Practice and Assessment

- Quiz/result cards, result actions, options, Assessment metadata, review items, and navigation buttons can shrink and wrap.
- Assessment result statistics become a two-column grid on phones and one column on very small phones.
- Assessment shells use the full available mobile width without side overflow.

### Robot Lab

- Energy labels and XP labels can wrap instead of colliding.
- Upgrade rows and copy use shrink-safe containers.

### Reward Shop / Parent Access

- Reward and PIN dialogs are constrained to the dynamic viewport.
- Safe-area padding is applied to modal overlays.
- Reward cards, wallet, and dialog controls cannot widen the page.

### Brain Games / Memory Grid

The existing game-specific responsive layers already switch their full-screen chambers at mobile widths. v0.5.85 adds global width containment for images, controls, shells, and content so they cannot create page-level horizontal overflow.

## Regression rule

New UI work should not add a fixed `min-width` to a content card without a mobile override. For grids/flex layouts that contain tables, selectors, long labels, or dynamic question text, use `minmax(0, 1fr)` and/or `min-width: 0` on the child that must shrink.

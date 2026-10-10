# The Trust Sequence brandbook

Step 1 of the design brief: two directions, one philosophy. Maris picks one; step 2 removes the other and restyles the site from it.

Open `specimen.html` to see both. This file is the written rule set behind it. Every value here lives in `tokens.css`; if this file and the tokens disagree, the tokens win and this file gets fixed.

## The idea

Simplicity is the theme and the message. The book promises both chairs a decision made understandable, cut to one step, with the interest on the table. The page should do the same: paper, ink, one accent, a visible grid, and space doing most of the work.

References: Monocle magazine and Danish design. Not the old-school author-site look (full-bleed portrait, caps everywhere).

## The two directions at a glance

| | A. Warm paper, Monocle | B. Cool paper, Danish |
|---|---|---|
| Feel | Editorial, generous, a little warmer | Precise, denser, a little harder |
| Paper | Cream `#F3EEE4` | Near-white `#F7F7F4` |
| Accent | Brick `#A2381F` | Fjord blue `#1E4D5A` |
| Display serif | Source Serif 4, 600 | Source Serif 4, 700 |
| Grotesk | Schibsted Grotesk, 400 and 500 | Inter Tight, 400 and 600 |
| Grid | 12 columns, 24 px gutter, margins 24 / 40 / 64 px, max 1240 px | 12 columns, 16 px gutter, margins 20 / 32 / 48 px, max 1320 px |
| Section spacing | 128 px | 96 px |
| Corners | 2 px | Square |
| Hero layout | Text left in six columns, 3:2 photo right in six | Headline across ten columns, text in four, 16:9 photo in eight |

Both: light ground, ink type, left-aligned, hairline rules, captions under photos, one accent.

## Palette

| Token | Role | A | B | Contrast on paper (A / B) |
|---|---|---|---|---|
| `--color-paper` | Page ground | `#F3EEE4` | `#F7F7F4` | ground |
| `--color-paper-alt` | Panels, grid fills, never a section background | `#E8E1D3` | `#ECECE7` | n/a |
| `--color-ink` | Headlines, body, ink rules, focus ring | `#1B1A17` | `#121212` | 15.05 / 17.45 |
| `--color-ink-soft` | Long copy | `#45423B` | `#3B3B39` | 8.67 / 10.46 |
| `--color-ink-muted` | Captions, labels, metadata | `#625E55` | `#5C5C59` | 5.59 / 6.25 |
| `--color-rule` | Hairlines only, never text | `#CFC6B6` | `#D4D4CE` | decorative |
| `--color-field-border` | Form field borders | `#7A7468` | `#767672` | 4.01 / 4.25 (needs 3.0) |
| `--color-accent` | Primary button and one rule | `#A2381F` | `#1E4D5A` | 5.82 / 8.64 |
| `--color-on-accent` | Text on the accent | paper | paper | 5.82 / 8.64 |
| `--color-error` | A failed form field and its message | `#A2381F` | `#A2381F` | 5.82 / 6.27 |

Every text colour passes WCAG AA (4.5:1) on paper and on paper-alt. Field borders pass the 3:1 rule for interface parts.

**The accent has one permitted use per page:** the primary button and one short rule (2 px by 64 px, above the hero label). It never colours text, links, icons, backgrounds, or a second button. In A the error colour is the same red; it only appears on a field that failed, never as decoration.

## Type

Two families, three weights in total per direction.

| | A | B |
|---|---|---|
| Display and headings | Source Serif 4, 600 | Source Serif 4, 700 |
| Body, labels, buttons, captions | Schibsted Grotesk 400, strong 500 | Inter Tight 400, strong 600 |

**Why Source Serif 4.** The site uses DM Serif Display, which exists in one weight only, so it cannot go heavier. DM Serif was drawn from Source Serif. Source Serif 4 has a display optical size and weights up to 900, so it keeps the same letter shapes with weight available. The specimen shows DM Serif at 400 next to Source Serif 4 at 400, 600 and 700.

**Why these grotesks.** Schibsted Grotesk was made for a Scandinavian newspaper group: editorial, slightly warm, good at small sizes. Inter Tight is neutral and close to the Swiss neo-grotesks, tighter than Inter. Both are free under the SIL Open Font License, which covers web, print, PDF and slides.

**Scale, label to display**

| Token | A | B | Use |
|---|---|---|---|
| `--size-label` | 11 px, caps, tracking 0.14em | 11 px, caps, tracking 0.12em | Section names, eyebrows, metadata |
| `--size-small` | 14 px | 13 px | Captions, notes, form help |
| `--size-body` | 17 px, leading 1.6 | 16 px, leading 1.55 | Running text |
| `--size-lead` | 20 px | 19 px | Intros, the subtitle |
| `--size-h3` | 22 px | 21 px | Card titles |
| `--size-h2` | 28 to 36 px | 26 to 34 px | Section headlines |
| `--size-h1` | 36 to 56 px | 34 to 54 px | Page titles, quotes |
| `--size-display` | 48 to 88 px, leading 1.02 | 44 to 96 px, leading 0.98 | The book title, once per page |

**Line length:** running text at most 66 characters (A) or 62 (B); narrow blocks 44 or 40.

**Rules:** headlines in sentence case. No italics for decoration; italic only for a book title inside running text. The subtitle "Walk Out With a Yes" is set in the grotesk, not in italic serif. Labels are the only uppercase text.

## Grid

| | A | B |
|---|---|---|
| Columns | 4 below 600 px, 8 from 600, 12 from 960 | same |
| Gutter | 24 px | 16 px |
| Margin | 24 px, 40 from 600, 64 from 1280 | 20 px, 32 from 600, 48 from 1280 |
| Max width | 1240 px | 1320 px |

Breakpoints: 600, 960 and 1280 px. Mobile first. When the grid collapses, the order is decided per section (text before photo in the hero, number before label in proof rows), not left to default stacking.

Nothing is centred by default. Centre only by decision, and say why in the code.

## Spacing

One scale on a 4 px base, shared by both directions: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--space-1` to `--space-10`). Sections are `--space-section` apart: 128 px in A, 96 px in B.

## Rules (hairlines)

| Rule | Spec | Where |
|---|---|---|
| Ink rule | 1 px, `--color-ink` | Opens every section; frames the nav and footer; tops each framework card |
| Hairline | 1 px, `--color-rule` | Separates items inside a section; sits above captions and proof numbers |
| Accent rule | 2 px by 64 px, `--color-accent` | Once per page, above the hero label |

Rules are horizontal. No boxes around content except form fields and the specimen's own mock frames.

## Photographs

- Placed as a block inside the grid, never full-bleed, never behind text.
- Always a caption and a credit, in `--size-small`, `--color-ink-muted`, under a hairline. Caption left, credit right.
- Crops: 3:2 (default), 16:9 (wide hero), 4:5 (portrait, once a portrait exists). Nothing else.
- The photo does not set the palette. Its colours stay inside the frame; no tints, overlays or matching backgrounds.
- Logos or watermarks are cropped out, not covered.

Current photograph: the Meet Magento UK 2026 panel, file 268, cropped above the event logos.
Credit line: **Photo: Owen Billcliffe** (from the file's metadata). Caption: "Panel at Meet Magento UK 2026."
Files: `assets/meet-magento-uk-2026-panel.jpg` (16:9, 1600 by 900) and `assets/meet-magento-uk-2026-panel-3x2.jpg` (3:2, 1350 by 900). A higher-resolution original would allow sharper crops; the 1600 px file is enough for the site.

## Components

**Button.** Primary: accent ground, paper text, `--size-small` grotesk at the strong weight, 16 by 24 px padding, corner `--radius`. Hover turns it ink. One primary button per view. Secondary: transparent with a 1 px ink border; hover fills ink. Disabled: 45% opacity, no hover.

**Form field.** Paper ground, 1 px `--color-field-border`, corner `--radius`, body size. Focus: 2 px ink outline. Error: border in `--color-error`, message underneath in the same colour at `--size-small`. Labels are uppercase labels; placeholders are never the only label on the live site.

**Nav.** Wordmark left in the display serif, links in the grotesk at `--size-small`, the secondary button on the right, ink rule underneath. Below 600 px: wordmark and a plain "Menu" control only.

**Footer.** Ink rule above. Wordmark and copyright in the first four columns, links from column seven. No accent.

**Framework card.** No box. Ink rule on top, the number and "Framework" as a label, the name in the serif at h3, the description at `--size-small` in ink soft. Three across from 600 px, one per row below.

**Quote.** Left-aligned, 1 px ink rule on the left, the serif at h1 size, attribution as a label underneath. No quotation-mark graphics.

**Proof number.** The number in the serif at h2, its label beside it, a hairline above.

**Focus.** Every interactive element shows a 2 px ink outline with a 3 px offset when focused from the keyboard.

**Motion.** Colour transitions of 150 ms only. With reduced motion requested, none. No scroll-in reveals.

## Forbidden

- Dark grounds
- The accent on a dark ground
- Centred layouts by default
- Decorative italics
- Gradients
- Drop shadows
- A second accent, or the accent used for decoration
- Full-bleed photographs, or photographs without a caption and credit
- Em dashes in any copy

## Wordmark

Step 2. "The Trust Sequence" set in the chosen display serif as an SVG, with clear-space rules here.

## Cover and interior

Later. The book cover and interior will use this system: one flat colour, one object, the serif title, legible at 80 px wide. This section is a placeholder until that work starts.

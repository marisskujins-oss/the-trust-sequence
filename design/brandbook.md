# The Trust Sequence brandbook

Warm paper, Monocle. One system for the site, emails, social cards, slides, PDFs and, later, the book.

Every value in this document lives in `tokens.css`. If this file and the tokens disagree, the tokens win and this file gets fixed. `specimen.html` shows every token and component as the site renders them.

## The idea

Simplicity is the theme and the message. The book promises both chairs a decision made understandable, cut to one step, with the interest on the table. The page does the same: paper, ink, one accent, a visible grid, and space doing most of the work.

References: Monocle magazine and Danish design. Not the old-school author-site look (full-bleed portrait, caps everywhere).

## Palette

| Token | Role | Value | Contrast on paper |
|---|---|---|---|
| `--color-paper` | Page ground | `#F3EEE4` | ground |
| `--color-paper-alt` | Panels and grid fills, never a section background | `#E8E1D3` | n/a |
| `--color-ink` | Headlines, body, rules, focus ring | `#1B1A17` | 15.05 |
| `--color-ink-soft` | Long copy | `#45423B` | 8.67 |
| `--color-ink-muted` | Captions, labels, metadata | `#625E55` | 5.59 |
| `--color-rule` | Hairlines only, never text | `#CFC6B6` | decorative |
| `--color-field-border` | Form field borders | `#7A7468` | 4.01 (needs 3.0) |
| `--color-error` | A failed form field and its message | `#A2381F` | 5.82 |
| `--color-accent` | Primary button and one rule | `#F2C230` | 1.45 (see below) |
| `--color-on-accent` | Label on the accent | ink | 10.39 on the accent |
| `--color-accent-border` | Edge of the accent button | ink | 15.05 |

Every text colour passes WCAG AA (4.5:1) on paper and on paper-alt. Field borders pass the 3:1 rule for interface parts.

**The accent is signal yellow, used for two things only:** the primary button and one rule (4 by 64 px) above the first label on a page. Yellow on cream is low in contrast, so the button always carries a 1 px ink border, which gives it a visible edge (15:1) and a printed look. The label on the button is ink. The accent never colours text, links, icons, backgrounds or a second kind of button. A page may repeat the primary button where a second form appears (the hero and the foot of the page), never twice in one view.

## Type

Two families, three weights.

| Use | Family | Weight |
|---|---|---|
| Display, headings, wordmark, quotes, proof numbers | Source Serif 4 (display optical size) | 600 |
| Body, labels, buttons, captions | Schibsted Grotesk | 400, strong 500 |

**Why Source Serif 4.** The site used DM Serif Display, which exists in one weight only. DM Serif was drawn from Source Serif. Source Serif 4 keeps the letter shapes and goes one step heavier, so a headline holds the page without going to capitals.

**Why Schibsted Grotesk.** Made for a Scandinavian newspaper group: editorial, slightly warm, clear at small sizes. Both families are free under the SIL Open Font License, which covers web, print, PDF and slides.

| Token | Size | Use |
|---|---|---|
| `--size-label` | 11 px, capitals, tracking 0.14em | Section names, eyebrows, metadata |
| `--size-small` | 14 px | Captions, notes, form help, cards |
| `--size-body` | 17 px, leading 1.6 | Running text |
| `--size-lead` | 20 px | Intros |
| `--size-h3` | 22 px | Card and point titles |
| `--size-h2` | 28 to 36 px | Section headlines |
| `--size-h1` | 36 to 56 px | The home headline, quotes |
| `--size-display` | 48 to 88 px, leading 1.02 | Page titles on inner pages |

Line length: running text at most 66 characters, narrow blocks 44.

Headlines in sentence case. Labels are the only capitals. No decorative italics; italic only for a title inside running text. Headlines use balanced line breaks so no word sits alone on the last line.

## Grid

| | Value |
|---|---|
| Columns | 4 below 600 px, 8 from 600, 12 from 960 |
| Gutter | 24 px |
| Margin | 24 px, 40 from 600, 64 from 1280 |
| Max width | 1240 px |

Breakpoints are 600, 960 and 1280 px. They are the only literal pixel values allowed outside `tokens.css`, because CSS cannot read variables inside media queries.

Standard column spans from 960 px: section label 1 to 3, section headline and main column 4 to 10, hero text 1 to 6, hero photo 7 to 12, prose 3 to 9. Mobile first: below 960 everything spans the full width in reading order, which is decided per section (text before photo in the hero, labels before content).

Nothing is centred by default. Centre only by decision.

## Spacing

One scale on a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 px (`--space-1` to `--space-10`). Sections sit `--space-section` apart: 128 px, or 64 px below 600 px.

## Rules

| Rule | Spec | Where |
|---|---|---|
| Ink rule | 1 px, ink | Opens every section; frames the nav and footer; tops each framework card |
| Hairline | 1 px, rule colour | Separates items inside a section; sits above captions, proof numbers and section-end links |
| Accent rule | 4 by 64 px, accent | Once per page, above the first label |

Rules are horizontal. No boxes around content except form fields. Notes and quotes take a 1 px ink rule on the left.

## Photographs

- Placed as a block inside the grid, never full-bleed, never behind text.
- Always a caption and a credit at `--size-small` in ink muted, under a hairline. Caption left, credit right.
- Crops: 3:2 (default), 16:9 (wide), 4:5 (portrait, once a portrait exists). Nothing else.
- The photo does not set the palette. Its colours stay inside the frame; no tints, overlays or matching backgrounds.
- Logos and watermarks are cropped out, not covered.
- Serve webp with a jpg fallback, an 800 px version for phones, and fixed width and height to prevent layout shift.

Current photograph: Meet Magento UK 2026, file 268, cropped above the event logos.
Caption: "Maris Skujins, second from left, on a panel at Meet Magento UK 2026."
Credit: "Photo: Owen Billcliffe" (from the file's metadata).
Files: `assets/meet-magento-uk-2026-panel-3x2.*` (3:2) and `assets/meet-magento-uk-2026-panel.*` (16:9).

## Components

**Nav.** Wordmark left in the serif. Links on the right at `--size-small`. Ink rule underneath, sticky at the top. On the home page the "Get Early Access" text link stays hidden while the hero form is on screen, so the two never compete. Below 600 px: wordmark and a plain "Menu" control that opens a ruled list.

**Primary button.** Accent ground, ink label at the strong weight, 1 px ink border, 16 by 24 px padding, 2 px corners. Hover turns it ink with a paper label. Disabled: 45% opacity.

**Secondary button.** Transparent with a 1 px ink border; hover fills ink. Used in the specimen only so far.

**Links.** Ink, underlined at 1 px with a 4 px offset; 2 px on hover. Links that lead to another page can carry an arrow.

**Signup form.** Fields on paper with the field border; focus is a 2 px ink outline; error turns the border and message the error colour; success replaces the form with a serif "You're in" under an ink rule. The offer line above the form is body size, strong, in full ink: the loudest line before the button. Behaviour lives in `signup.js` and does not change with the styling.

**Contents strip.** Four numbered links under the hero, between ink rules. Each section on the page opens with the same number in its label.

**Section.** Ink rule on top, label in columns 1 to 3, serif headline in 4 to 10, content in the main column. Each section ends with a hairline and a text link to the form.

**Framework card.** No box. Ink rule on top, "07 Framework" as a label with the book's own number, the name in the serif, the description at `--size-small` in ink soft. Three across from 600 px.

**Quote.** Left-aligned, 1 px ink rule on the left, the serif at h1 (or h2 inside prose), attribution as a muted label. No quotation-mark graphics.

**Proof number.** The number in the serif at h2 with its label, a hairline above.

**Note.** A ruled aside with a label, for asides such as the deciding-reader note on the excerpt.

**Footer.** Ink rule above. Wordmark and copyright in columns 1 to 4, links from column 7.

**Focus.** Every interactive element shows a 2 px ink outline with a 3 px offset from the keyboard. A skip link leads to the main content.

**Motion.** Colour transitions of 150 ms only; none when reduced motion is requested. No scroll-in reveals.

## Wordmark

`wordmark.svg`: "The Trust Sequence" in Source Serif 4 at 600, converted to outlines with the font's kerning, so it renders anywhere without the font installed.

- **Clear space:** on every side, at least the height of the capital T.
- **Minimum size:** 20 px tall on screen, 6 mm in print.
- **Colour:** ink on paper. Paper on ink is allowed in print only. Never on the photograph, never in the accent.
- **Don't** stretch, outline, add effects, or set the title in another font to stand in for it.

The site's nav and footer set the wordmark as live text in the same font and weight, so it stays readable to screen readers and search.

## Favicon

`favicon.svg` plus `favicon-32.png` and `apple-touch-icon.png` (180 px): the serif T in ink on paper with a short yellow bar, the accent rule in miniature.

## Audience templates

`templates/` holds the weekly assets: LinkedIn carousel page (1080 by 1350), quote card (1080 by 1080), podcast promo (1920 by 1080), and the site's OG image (1200 by 630). Each carries the wordmark, the system type and the one accent rule. Render them all with `design/templates/render.sh`; see `README.md` for custom copy.

## Email

`email-template.html`: one layout for MailerLite. Masthead with the wordmark and an ink rule, the accent rule, a serif headline, body in the grotesk, the yellow button with its ink border, and a muted footer with unsubscribe and privacy links. Values are copied inline from the tokens because email clients ignore CSS variables.

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

## Cover and interior

Later. The cover and interior will use this system: one flat colour, one object, the serif title, legible at 80 px wide. This section is a placeholder until that work starts.

# design/

The Trust Sequence design system: warm paper, Monocle, one yellow accent.

| File | What it is | Published on the site? |
|---|---|---|
| `tokens.css` | The single source of every colour, size, font and spacing value | Yes, the site loads it |
| `assets/` | The cropped Meet Magento UK 2026 photo (3:2 and 16:9, jpg and webp, full and 800 px). Photo: Owen Billcliffe. The book cover at 600 and 1200 px, rendered from `templates/cover.html` | Yes |
| `wordmark.svg` | "The Trust Sequence" outlined in Source Serif 4 at 600 | Yes |
| `specimen.html` | Every token and component, rendered with the site's own stylesheets | No |
| `brandbook.md` | The rules: what each token is for, and what is forbidden | No |
| `email-template.html` | The email layout for MailerLite | No |
| `templates/` | The book cover, its LinkedIn post, carousel page, quote card, podcast promo, OG image, and the render script | No |
| `stamp.sh` | Versions the CSS, JS and image URLs in every page | No |

The unpublished files are listed under `exclude` in `/_config.yml`.

## How the site uses the tokens

Every page loads, in this order:

```html
<link rel="preload" href="/fonts/source-serif-4-600-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/schibsted-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/design/tokens.css?v=7b2bc71d">
<link rel="stylesheet" href="/site.css?v=a9815df6">
<link rel="stylesheet" href="/signup.css?v=7df0f5f0">
```

Each `?v=` is the first 8 characters of the file's SHA-1, so the values above change whenever the file does. Cloudflare tells browsers to keep CSS, JS and images for 4 hours but pages for only 10 minutes, so without it a returning visitor gets the new page with the old stylesheet after a deploy. After editing `tokens.css`, `site.css`, `signup.css`, `site.js` or `signup.js`, run:

```bash
design/stamp.sh
```

It rewrites the URLs in all five pages and changes nothing when no file has changed. `render.sh` runs it after rendering the cover.

Fonts are self-hosted in `/fonts` (Latin subset, SIL Open Font License, licences alongside) and declared in `tokens.css`, together with metric-matched Georgia and Arial fallbacks so the page does not shift when the fonts arrive. No request goes to Google.

`site.css` holds the components and `signup.css` the form. Neither contains a colour or a size: everything is `var(--token)`. The only literal pixel values are the breakpoints (600, 960, 1280 px), because media queries cannot read variables. To check after an edit:

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b|[0-9.]+(px|rem|em)\b" site.css signup.css | grep -v "@media"
```

It should print nothing.

## Adding or changing a token

1. Edit `tokens.css`. Name tokens by role, not by value: `--color-ink-muted`, not `--grey-600`.
2. Add or update the row in `brandbook.md`.
3. For a text colour, check contrast on paper and paper-alt (AA, 4.5:1) and put the ratio in the brandbook.
4. Open `specimen.html` to see the change everywhere at once.
5. If it is a colour, copy it into `email-template.html` too; email clients cannot read variables.
6. Run `design/stamp.sh` so returning visitors get the new file.

## Rendering the audience templates

```bash
design/templates/render.sh
```

This renders every template to `design/templates/out/` with headless Chrome, copies the OG image to `/og-image.png` and the site's cover images to `design/assets/`. Fonts come from `/fonts`, so it works offline.

## Changing the cover

The cover is `templates/cover.html`, one HTML file on a 600 by 900 canvas. The flat cover (1800 by 2700), the site's cover images, the OG image and the LinkedIn post are all rendered from it, so a change to the cover is an edit to that file and one command:

```bash
design/templates/render.sh cover
```

Then commit `design/assets/the-trust-sequence-cover-*.png`, `og-image.png` and the five pages, whose image URLs the render has re-versioned. The 3D cover on the site is the flat image turned with CSS, so it needs no render of its own.

The cover comes in two variants, b (with the door, the chosen cover) and a (type only, the fallback), and two grounds, paper and ink. `data-variant` and `data-ground` on the `<html>` tag of `cover.html` set what the site shows; the render also writes all four to `out/` (`cover-a.png`, `cover-b-ink.png` and so on) for comparing. To see one in a browser, open `cover.html?variant=a&ground=ink`.

When the real cover arrives, replace the contents of `cover.html` with it (an `<img>` of the designer's file is enough) and render again.

To render one template with your own copy, pass its name and a query string:

```bash
design/templates/render.sh quote "?quote=%22Too%20small%20costs%20you%20too%20much.%22&cite=Maris%20Skujins"
```

Fields per template:

| Template | Size | Fields |
|---|---|---|
| `carousel` | 1080 by 1350 | `page`, `label`, `title`, `body`, `footer` |
| `quote` | 1080 by 1080 | `quote`, `cite` |
| `podcast` | 1920 by 1080 | `date`, `show`, `title`, `body`, `caption`, `footer` |
| `og` | 1200 by 630 | none; edit `og.html`. Rendered with the cover, since it shows it |
| `cover` | 600 by 900, rendered at 1800 by 2700 | `variant` (a or b), `ground` (paper or ink); see Changing the cover |
| `cover-linkedin` | 1080 by 1350 | none; edit `cover-linkedin.html`. Rendered with the cover |

Write any new copy in the write-like-maris voice. No em dashes.

## Applying the email template

Open `email-template.html`, copy everything, and paste it into a MailerLite custom HTML email. Replace the part between `CONTENT START` and `CONTENT END` for each email. The merge tags `{$name|default('there')}` and `{$unsubscribe}` follow MailerLite's syntax; send yourself a test before using it.

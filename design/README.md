# design/

The Trust Sequence design system.

| File | What it is |
|---|---|
| `specimen.html` | Open this in a browser. Both directions, every token and component, a grid overlay, and the home hero mocked with the panel photograph. |
| `tokens.css` | The single source of every colour, size, font and spacing value. |
| `brandbook.md` | The written rules: what each token is for, and what is forbidden. |
| `assets/` | The cropped Meet Magento UK 2026 photograph (16:9 and 3:2). Photo: Owen Billcliffe. |

This folder is excluded from the public site build (`_config.yml`), so none of it is served at thetrustsequence.com.

## Viewing the specimen

Open `specimen.html` directly (double-click), or serve the repo folder and open `/design/specimen.html`. Use the A / B switch at the top. The address ends in `#a` or `#b`, so a link opens straight on one direction. Tick "Grid overlay" to see the columns.

The only network requests are the fonts from Google Fonts.

## Switching direction

One attribute on `<html>`:

```html
<html lang="en" data-direction="a">   <!-- warm paper, Monocle -->
<html lang="en" data-direction="b">   <!-- cool paper, Danish -->
```

With no attribute, direction A applies.

## Adding a token

1. Add it in `tokens.css`: shared values go in the first `:root` block; values that differ go in both the A block and the B block.
2. Name it by role, not by value: `--color-ink-muted`, not `--grey-600`.
3. Add a row to the matching table in `brandbook.md`.
4. If it is a colour used for text, check contrast on paper and paper-alt (AA, 4.5:1) and put the ratio in the brandbook.

Breakpoints cannot be custom properties inside media queries, so they are fixed numbers: 600, 960 and 1280 px. `--grid-columns` changes with them inside `tokens.css`.

## How the site will use the tokens (step 2)

- Each page links `/design/tokens.css` (served from that path once step 2 moves it into the build) before its own styles.
- Page and component styles use only `var(--token)` values. No hex codes and no pixel sizes outside `tokens.css`, apart from 1 px borders that already read `--rule-width`.
- The chosen direction is fixed on `<html>`, and the losing direction is removed from `tokens.css` and the brandbook.
- Fonts load with one Google Fonts `<link>` per page for the chosen families and weights only.
- `signup.js` keeps its contract; only `signup.css` is restyled from the tokens.

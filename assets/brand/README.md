# MusiStash brand package — "Rise" mark

The mark is an M whose last leg rises into an up-arrow. Ink strokes, one blue accent on the arrowhead.

## Colors
- Ink `#16192A` — mark, wordmark, dark tile
- Signal blue `#4F6EF2` — arrowhead accent only
- Paper `#F4F6FD` — reversed mark, light tile

## Type
Wordmark: **Sora SemiBold (600)**, letter-spacing −0.03em, text "MusiStash" (capital M and S).
Google Fonts: `https://fonts.googleapis.com/css2?family=Sora:wght@600&display=swap`

## Files

### svg/ — source of truth, scale to any size
- `mark.svg` — ink + blue, for light backgrounds
- `mark-reversed.svg` — paper + blue, for dark backgrounds
- `mark-mono-ink.svg`, `mark-mono-white.svg` — single color
- `app-icon.svg`, `app-icon-light.svg` — 1024 tile, 229px radius

### app-icon/
- `app-icon-1024-square.png` — **submit this to App Store Connect / Play Console** (stores apply their own corner mask)
- `app-icon-512-square.png` — Play Console hi-res icon
- `app-icon-light-1024-square.png` — alternate light face (iOS 18 light/tinted variants)
- `rounded/app-icon-{size}.png` — pre-rounded, for web, marketing, in-app "download" badges. Sizes: 1024 512 256 192 180 167 152 120 96 80 76 64 60 58 48 40 29 20

### favicon/
`favicon-16/32/48/64/128/180/192/512.png` — ink tile with paper mark.
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180.png">
<link rel="manifest" href="/site.webmanifest">   <!-- 192 + 512 -->
```

### mark/ — transparent PNG, mark only
`mark-{64,128,256,512,1024}.png` plus `-reversed`, `-mono-ink`, `-mono-white` variants.

### lockup/ — transparent PNG at 2×
- `lockup.png` — mark + wordmark, light backgrounds (site header, emails)
- `lockup-reversed.png` — dark backgrounds
- `lockup-stacked.png` — mark above wordmark (splash, about)
- `wordmark.png`, `wordmark-reversed.png` — text only

## Replacement map (for Claude Code)
| Where | Use |
|---|---|
| iOS `AppIcon.appiconset` | `app-icon/app-icon-1024-square.png` (single-size asset) |
| Android `ic_launcher` | `app-icon/app-icon-512-square.png` as foreground source; background `#16192A` |
| Web `<head>` favicons | `favicon/*` per snippet above |
| Site header / nav | `svg/mark.svg` + live text "MusiStash" in Sora 600, or `lockup/lockup.png` |
| Dark nav / footer | `svg/mark-reversed.svg` or `lockup/lockup-reversed.png` |
| In-app splash | `lockup/lockup-stacked.png` on `#F4F6FD`, or reversed on `#16192A` |
| Social / OG image | `lockup/lockup.png` centered on `#F4F6FD` |
| Email | `lockup/lockup.png` at 2× |

## Rules
- Never recolor the arrowhead anything but `#4F6EF2` (or the mark's own color in mono use).
- Keep clear space of 0.5 × mark height on all sides.
- Below 24px use the tile icons, not the bare mark.
- Don't outline, rotate, or add gradients/shadows.

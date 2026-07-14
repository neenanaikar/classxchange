# classxchange — visual design system

"Laser Neon Pink" identity: immersive dark mode, condensed heavy display type, neon pink used sparingly. Mirrors the premium/high-energy feel of boutique fitness brands (Barry's, [solidcore]) without literal copy-paste — this is a peer-to-peer class-credit marketplace, not a studio, so CTAs say "Get started" / "Browse classes" / "List a class" rather than "Book a class."

Separate from [DESIGN.md](DESIGN.md), which is the product/architecture doc (escrow contract, verification flow, build order). This file is styling only.

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `--color-bg` | `#000000` | Page background, primary |
| `--color-bg-alt` | `#08080A` | Secondary section background (hero) |
| `--color-surface` | `#121215` | Nav bar, raised surfaces |
| `--color-border` | `#1A1A22` | Hairline dividers — 1px only, never thicker |
| `--color-accent` | `#FF007F` | Laser Neon Pink — CTA buttons, prices, active states. Sparing use only |
| `--color-accent-alt` | `#FF1493` | Secondary hot pink — eyebrow/label text |
| `--color-accent-muted` | `#3A001C` | Deep berry — backdrop glow, hover shadows only, never flat fill |
| `--color-text` | `#F5F5F7` | Primary text on dark |
| `--color-text-dim` | `#9A9AA5` | Secondary/meta text |

Zero pure white backgrounds anywhere. No purple, no gradients as a design device (glow effects use blurred `--color-accent-muted`, not gradients).

## Typography

Three-tier condensed/display hierarchy, no Inter:

- **Hero headlines** — Big Shoulders Display, weight 900, uppercase, `letter-spacing: -0.01em`. Reserved for the single largest headline per page (hero section).
- **Nav logo / wordmark** — Bebas Neue, uppercase, `letter-spacing: 0.01em`.
- **Section/listing headings** — Oswald, weight 700, uppercase, `letter-spacing: -0.02em`. Used for card/row titles, section headers — anywhere a heading isn't the page's single hero moment.
- **Body copy, nav links, meta text** — Manrope. Nav links and small labels get `text-transform: uppercase; letter-spacing: 0.15em; font-size: 11px`. Body paragraphs stay sentence case, regular weight, generous line-height (1.6).

Rule of thumb: tight tracking on anything large and uppercase (headings), wide tracking on anything small and uppercase (nav links, eyebrow labels).

## Components

- **Buttons** — sharp square corners (`border-radius: 0`), no pill shapes anywhere. Primary CTA = solid `--color-accent` fill with dark text (`#1a0010`, not white — keeps it from looking like a generic bright-pink button).
- **Nav bar** — sticky, glassmorphic: translucent `--color-surface` background + `backdrop-filter: blur(12px)`, 1px `--color-border` bottom hairline. Logo left, links + CTA right.
- **Sections** — full-bleed, no boxed container-within-container look. Generous vertical padding (80px+ top/bottom on hero).
- **Listings** — stacked editorial rows with hairline dividers, not a uniform card grid. Title in Oswald, price in Oswald + `--color-accent`, meta line in Manrope/dim text.
- **Glow effects** — `--color-accent-muted` as a blurred backdrop behind hero content or button hover states, never as a flat/solid fill.

## Coverage

All pages are restyled on these tokens: homepage/nav/listing rows, `/listings/new`, `/orders`, `/orders/[id]`, and `/admin/disputes`. The shared `.input` class in `globals.css` carries the dark form-field styling (transparent bg, hairline border, pink focus ring) so new form fields stay consistent automatically.

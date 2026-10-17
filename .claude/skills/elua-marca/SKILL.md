---
name: elua-marca
description: Elúa brand and UI rules for Elúa Kitchen — color tokens, contrast, logo and pattern usage, typography, Spanish copy, mobile one-handed layout. Load before creating or restyling any screen, component, icon, email template or image in this project.
---

# Elúa brand in the app

Sources: `brand/BRAND.md`, `docs/Elua-Kitchen-Fase-1.pdf` §03 and §08. Tokens live in `src/app/globals.css` (`@theme`); use the Tailwind classes, never raw hex in components.

## Color tokens

| Class suffix | Hex | Use |
|---|---|---|
| `cafe` | #D8854C | Logo, decoration, large headings (≥ 24 px) only |
| `cafe-oscuro` | #9A5426 | Buttons, links, active tab — anything interactive or small |
| `crema` | #FAE5D6 | Cards, table headers, selected states |
| `crema-claro` | #FDF4EE | Page background |
| `coral` | #F4917A | Warnings / attention (pair with tinta text, not white) |
| `celeste` | #8FC7C9 | Info, status badges, success (pair with tinta text) |
| `tinta` | #3A2A20 | Body text |
| `tinta-suave` | #6B5446 | Secondary text |
| `borde` | #EFD9C8 | Hairlines and card borders |

Never put small text in `cafe` on crema or white — it fails contrast (2.3:1). Use `cafe-oscuro` or `tinta`.

## Logo and imagery

- Header: `public/brand/logo-horizontal-cafe.png`. App icon: emblem with café fill (`src/app/icon.png`).
- "ELÚA" is always the logo image — never type the wordmark in a font.
- Patterns and the emblem only as quiet decoration (login, empty states). Never behind numbers or tables.
- Originals are in `brand/`; regenerate derived files rather than editing them.

## Type

Montserrat via `next/font` (`font-sans`). Numbers in tables: `tabular-nums`, right-aligned.

## Copy and layout

- All UI text is Spanish (Mexico). Use the kitchen's words: masa madre, pliegue, lote, harina.
- Mobile first, used one-handed with floury hands: primary actions near the bottom, tap targets ≥ 44 px, large numbers for quantities.
- Phone: bottom tabs Inicio · Recetas · Calcular · Lotes. md and up: side menu. An active process shows a banner on every screen.
- Bright-kitchen readability beats decoration. Light theme only in Phase 1.

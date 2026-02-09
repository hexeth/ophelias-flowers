# AGENTS.md — Ophelia's Flowers

## Project Overview

**Ophelia's Flowers** is a micro-scale ecommerce storefront selling dahlia tubers to local hobbyists and gardeners. The site is seasonal by nature — dahlias are ordered in late winter/spring for spring planting. The product catalog is small (tens of varieties, not thousands) and changes infrequently.

The goal is a **high-performance, lightweight** storefront — fast to load, simple to maintain, and cheap to operate.

---

## Architecture

### Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | Astro (SSG + SSR)                       |
| Language     | TypeScript (strict mode)                |
| Styling      | Tailwind CSS                            |
| Deployment   | Cloudflare Pages (with CI/CD pipeline)  |
| Testing      | Vitest (unit), Playwright (e2e)         |
| Images       | Astro `<Image>` / `<Picture>` + sharp   |

### No Client Framework

There is no React, Vue, Svelte, or other UI framework. Interactive elements use:

- Native HTML elements (`<dialog>`, `<details>`, `<form>`)
- Vanilla JS via Astro `<script>` tags (scoped, minimal)
- Semantic HTML + ARIA attributes for accessibility

This is a deliberate constraint. The interactive surface (cart drawer, quantity inputs, checkout form) does not justify a framework dependency.

### SSG / SSR Split

| Concern               | Rendering | Why                                              |
| ---------------------- | --------- | ------------------------------------------------ |
| Product catalog pages  | SSG       | Small, slowly-changing catalog. Rebuild on push.  |
| Static pages (about, etc.) | SSG  | No dynamic content.                               |
| Cart mutations         | SSR       | Astro Actions. Server-side, no client JS needed.  |
| Checkout sessions      | SSR       | Astro Actions. Communicates with payment provider. |

### Deployment Model

Cloudflare Pages with CI/CD. A push to the main branch triggers a rebuild and deploy. Product catalog changes (Markdown updates, stock status changes) follow this same path — edit, commit, deploy.

---

## Design Direction

**Elegant Brutalist.** Defined concretely as:

- **Minimal UI chrome.** No rounded cards, drop shadows, or gradient fills. Borders are structural, not decorative.
- **Bold typography.** High-contrast type hierarchy. Large headings, generous line-height. System fonts or a single loaded typeface.
- **Generous whitespace.** Content breathes. Dense layouts are avoided.
- **Limited color palette.** Monochrome base (black, white, grays) with one or two accent colors derived from dahlia hues.
- **No gratuitous animation.** Motion is functional only (e.g., cart drawer open/close). No hover effects, parallax, or scroll-triggered transitions.
- **Raw, exposed structure.** The grid and layout are visible and intentional. The design looks like it was built, not decorated.

The product photography (high-resolution images of bloomed dahlias) provides all the visual richness. The UI stays out of the way.

---

## Data Model

### Product Catalog — Astro Content Collections

Products are stored as **Markdown files** in the repository, managed via Astro Content Collections with Zod-typed frontmatter schemas. There is no database or CMS.

#### Variety Schema (frontmatter)

```yaml
---
name: "Café au Lait"
slug: "cafe-au-lait"
sku: "DAH-CAL-001"
price: 8.50
stock: "available"        # available | low | sold-out
category: "dinnerplate"    # dinnerplate | ball | pompon | cactus | etc.
color: ["blush", "cream"]
bloomSize: "8-10 inches"
height: "3-4 feet"
image: "./cafe-au-lait.jpg"
---

A classic dinnerplate dahlia with enormous creamy blush blooms...
```

- **`stock`** is manually managed. Update the frontmatter, push, and the site rebuilds with the correct label.
- **`price`** is in USD, stored as a number (not a string).
- **`sku`** follows a consistent pattern: `DAH-{ABBREV}-{SEQ}`.
- The Markdown body is the product description, rendered on the product detail page.

### Commerce Entities

Use **industry-standard terminology** throughout the codebase:

| Term          | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| **Variety**   | A dahlia variety (the product). Corresponds to a Markdown file. |
| **SKU**       | Stock Keeping Unit. Unique identifier for a purchasable item. |
| **Line Item** | A SKU + quantity in a cart or order.                        |
| **Cart**      | A collection of Line Items before checkout.                |
| **Order**     | A finalized cart with payment and fulfillment details.     |
| **Stock-out** | A variety with `stock: "sold-out"`. Cannot be added to cart. |
| **Fulfillment** | The shipping/delivery of an order.                       |

Do **not** invent proprietary abstractions. If there is a standard commerce term for it, use it.

---

## Commerce Logic

### Lean-First Approach

The commerce layer is intentionally minimal:

1. **Cart** — Client-side state (localStorage or cookie). No server-side cart persistence for v1.
2. **Checkout** — An Astro Action creates a checkout session with the payment provider, passing line items and amounts.
3. **Payment** — Handled entirely by the third-party provider's hosted checkout. We do not handle card details.
4. **Order confirmation** — Webhook or redirect callback from the payment provider.

### Vendor-Agnostic Design

Business logic must be **decoupled from the payment provider**. Concretely:

- Define a `PaymentProvider` interface (TypeScript) for operations like `createCheckoutSession`, `verifyWebhookSignature`, etc.
- The initial implementation targets a specific provider (e.g., Stripe), but the interface boundary allows future migration.
- Payment provider details (API keys, webhook secrets) live in environment variables, never in source code.
- No payment provider SDK types should leak into domain types. Map to/from domain types at the adapter boundary.

---

## Image Strategy

Dahlia photography is the primary visual asset. Images must be optimized aggressively:

- Use Astro's built-in `<Image>` and `<Picture>` components for all product images.
- Output formats: **WebP** and **AVIF** with JPEG fallback.
- Generate responsive `srcset` for multiple viewport sizes.
- Lazy-load all images below the fold.
- Store source images at high resolution in the repository (or a referenced asset path). Let the build pipeline handle optimization.

---

## Quality & Accessibility

### Accessibility

**WCAG 2.1 AA compliance is the baseline.** This means:

- Semantic HTML elements used correctly (`<nav>`, `<main>`, `<article>`, `<button>`, `<label>`, etc.).
- All interactive elements are keyboard-navigable.
- Focus management is handled for dynamic UI (e.g., cart drawer traps focus when open).
- Color contrast meets AA ratios (4.5:1 for normal text, 3:1 for large text).
- All images have meaningful `alt` text.
- Forms have associated labels and error messages are announced to screen readers.

No component library is used. Accessibility is achieved through correct HTML and ARIA attributes, tested manually and in CI.

### Testing

| Type       | Tool        | Scope                                              |
| ---------- | ----------- | -------------------------------------------------- |
| Unit       | Vitest      | Commerce logic, cart calculations, price formatting, payment adapter mapping. |
| E2E        | Playwright  | Checkout flow smoke tests, add-to-cart, stock-out states. |
| A11y       | Playwright + axe-core | Automated accessibility checks in CI.  |

Tests run in CI on every pull request. The main branch must always be green.

---

## Conventions

### File Structure (planned)

```
src/
  actions/          # Astro Actions (cart, checkout)
  components/       # Astro components (.astro)
  content/
    varieties/      # Markdown files for each dahlia variety
  layouts/          # Page layouts
  lib/              # Shared utilities, types, commerce logic
    commerce/       # Cart, line item, pricing logic
    payment/        # Payment provider interface + adapter
  pages/            # Astro pages (file-based routing)
  styles/           # Global styles, Tailwind config
public/
  images/           # Optimized source images
```

### Naming

- **Files**: `kebab-case` for all files and directories.
- **Types/Interfaces**: `PascalCase` (e.g., `LineItem`, `PaymentProvider`).
- **Functions/variables**: `camelCase`.
- **Constants**: `SCREAMING_SNAKE_CASE` for true constants, `camelCase` for derived values.
- **CSS**: Tailwind utility classes. No custom CSS unless Tailwind cannot express the style. No CSS-in-JS.

### Code Style

- TypeScript **strict mode** enabled. No `any` types without explicit justification.
- Prefer named exports over default exports.
- Keep components small. A component that exceeds ~100 lines likely needs decomposition.
- No unused imports, variables, or dead code. Configure linting to enforce this.

### Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `style:`, `test:`, `refactor:`.
- Main branch is protected. All changes via pull request.
- Keep commits atomic — one logical change per commit.

---

## Out of Scope (v1)

The following are explicitly deferred:

- **Blog / content marketing** — Not needed for initial launch.
- **User accounts / authentication** — Checkout is guest-only.
- **Server-side cart persistence** — Cart lives client-side.
- **Advanced inventory management** — Stock is a manual frontmatter field, not a real-time decrement system.
- **Multi-currency / i18n** — USD only, English only.
- **Search** — Catalog is small enough to browse. Filter by category/color is sufficient.

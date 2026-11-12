# RMgX Design Studio — homepage · v2

v2 applies the **RMgX Brand Guidelines 2026**. v1 is untouched in the parent folder.

    perl tools/serve.pl 4174 v2     # from the parent folder, then open http://localhost:4174

## What changed from v1
- **Logo.** The hero and contact particles now resolve into the real Design Studio symbol (gradient chevron + four dot fragments) and hand over to the crisp vector mark. Header and footer use the exact logo artwork (`assets/brand/rds-logo.png`); white versions on navy/purple follow the brand colour combos.
- **Typeface.** Open Sauce One only (self-hosted in `assets/fonts`), 400–700. Kerning 0; headlines 1.10–1.25 line height, body ~1.55. No italics, no second font.
- **Colour.** Background #F5F5F5, Neutral Black #191F27, Dark Blue #051119 for dark sections, Light Blue #DAE7F0, Neutral Grey #5E6A71, Design Studio Purple #543EFA as the primary accent, RMgX Blue #099FFA as the signal accent. The logo's blue→purple gradient is the page's story: signal → clarity.
- **Supporting visuals.** Calm, low-contrast grid patterns and the navy background with a soft blue glow, as in the guidelines.

## Files
- `index.html` — includes the inline SVG sprite (`#rds-symbol`), the single source for the symbol geometry used by the particles, menu and overlays
- `css/styles.css` — brand tokens at the top
- `js/cells.js` — particle engine; samples target points from the sprite's paths
- `js/main.js`, `js/data.js` — interactions and content (every figure has a source)

## To replace when official assets are available
- `assets/brand/rds-logo.png` → the official SVG lockup from the RMgX SharePoint (same proportions).
- The symbol in the sprite is traced from the supplied logo; swap its paths for the official SVG paths if they differ.

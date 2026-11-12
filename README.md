# RMgX Design Studio — homepage

Static site, no build step and no dependencies.

    perl tools/serve.pl 4173 .     # then open http://localhost:4173

Any static server works (the page uses classic scripts, no modules).

## Structure
- `index.html` — page structure, in story order: hero → approach → work → capabilities → design × engineering → why → contact
- `css/styles.css` — tokens at the top (paper / ink / violet = clarity / vermillion = noise), then one block per section
- `js/data.js` — projects, archive, capability stages. Every figure has a `source`; don't add outcomes without one
- `js/cells.js` — "The Resolve": the cell motif (hero, capabilities specimen, contact)
- `js/main.js` — menu, project sheets, scroll-linked effects, lab seam, contact starter
- `assets/img` — project imagery from rmgx.design and the RMgX Company Deck 2025–26; `assets/raw` holds the original downloads

## Content notes
- Studio figures (IBDA 2024, 30+ clients, $7M+ raised) come from rmgx.design; company figures (10+ yrs, 1M+ users, 50+ people) from the 2025–26 deck, and are labelled as such on the page.
- VeteranX, Decimal Factor, Just Organik and Flood Response images are cropped from deck slides. Replace them with clean exports when available (same filenames).
- The shipment card in section 04 is an illustrative specimen, not client work.

# RMgX Design Studio — AI Builders landing page · v3

v3 builds on v2 (brand guidelines, typography, logo). v1 and v2 are untouched.

    perl tools/serve.pl 4175 v3     # from the parent folder, then open http://localhost:4175

## The particle field
One fixed canvas (`.field`) and one particle pool (950 desktop / 560 mobile) run the whole page. Nothing is recreated on scroll.

- **Hero (from v1/v2):** square cells, some hollow, scattered over the warm white page as knots and strays, with the reading column kept mostly clear. They drift slightly while idle.
  - The pointer lens snaps nearby cells to the grid and highlights the fragments of mess (violet box, white text).
  - The hero stage is sticky. Scrolling resolves the scatter into the RMgX symbol while the jumbled word straightens.
- **Formations** are point sets sampled from SVG silhouettes (`SHAPES` in `js/cells.js`). The symbol is read from the inline sprite.
  - Points are ordered along a Hilbert curve, so particle *i* sits in the same region of every shape.
  - A morph is therefore a short, coordinated move, never a burst.
- **Choreography:** neighbouring formations morph A → B with a light stagger (leading edge first) and one shared, gentle arc.
  - The outgoing shape waits in the upper third and the incoming one appears from the lower third, so the morph stays on screen beside the content.
  - Far-apart formations hand over quietly: How we build fades out with its section, and the Contact symbol resolves from a small local scatter.
- **Chapters:** the canvas also paints the page's grounds:
  - Order: warm white hero → dark services and process → warm white work and technology → dark Why RMgX → warm white contact → dark footer.
  - Each change runs through a `.tone-shift` gradient band.
  - Sections declare `data-tone="light|dark"`, and all text colours come from tone tokens.
  - Without the canvas, sections fall back to solid colours.
- **No starfield or trails:** the canvas is fully redrawn every frame. After settling, formations keep only a slow, slight sway.
- **Reduced motion:** no intro, no drift, no sway and no easing. Everything follows the scroll directly.

Order: scatter → RMgX symbol (hero) → AI Product Design → AI Audit → AI Strategy → AI Business Upgrade → How we build (line) → quiet (Work, Technology, Why) → RMgX symbol again at Contact.

To add a formation: add a shape to `SHAPES`, put `<div class="form-slot" data-form="name">` in the page, and map it in `shapeOf` in `js/main.js`.

## Content
- **Dummy copy for review:** hero, services, process, technology, Why RMgX and contact. Engagement lengths and deliverables are placeholders too.
- **Selected work:** three illustrative case studies (career transition, lending and risk, logistics), defined in `P` in `js/main.js`. They describe an approach and what we'd measure, never results, and are labelled "Placeholder · Illustrative" on the card and in the drawer. Replace them with approved client case studies before launch.
- **Technology:** tool names in each `.tools` list in `index.html` are examples; edit freely.
- **Verified content:** the ledger figures, the IBDA award and the testimonials (sources noted on the page).
- **Calls to action:** the primary conversion is the discovery call (Calendly link on every `data-call` link). Service CTAs (`data-pick`) jump to Contact with that topic pre-selected, and the email fallback includes the selected topics.

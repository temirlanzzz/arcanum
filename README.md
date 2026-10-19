# Arcanum — the Endless Emporium

Online shopping as a fantasy library, built with three.js. You fly through a vaulted
reading hall where every wing is a shop category, and every product on the shelves has
a red price tag hanging from a little string. Click a product and it floats up to you so
you can turn it in your hands, read the card and drop it into your satchel.

Everything is procedural: geometry, textures, the stained glass and the star-painted
vault are made in code at startup. There are no image or model downloads.

## What's inside

- **A nave and ten wings.** Kitchen, Electronics, Furniture, Books, Beauty, Garden,
  Fashion, Toys & Games, Sports and Tools. Each wing has its own wood, accent light,
  rune circle, banner and sign.
- **730 listings and 34,000 books.** Listings are often stocked two or three deep.
  There are 98 procedural product builders: copper pots, a teapot, laptops with glowing
  screens, headphones, potions, monsteras, sneakers, drills, a Rubik-style rune cube
  and more. Products are merged per wing and per material, so the shop draws in a few
  dozen calls and whole wings are frustum-culled. Books use one `InstancedMesh` per wing.
- **Furniture that comes in sets.** The Furniture wing stages four rooms (lounge,
  study, dining, bedroom) whose pieces are sized and placed to stand together. Each
  piece is still its own listing.
- **Red price tags on everything.** Every tag is one instance of an `InstancedMesh`,
  printed from a single 4096 px canvas atlas. Tags sway on thin strings, which are one
  `LineSegments` buffer.
- **Inspect and buy.** Hovering a product makes it glow (a per-vertex product id read by
  the shader). Clicking it lifts it into a separate inspection scene, drawn on top of
  the library, which dims and desaturates behind it. You can drag to turn it and scroll
  to zoom. Adding it to the satchel sends gold sparks flying.
- **Game layer.** XP and levels, four quests (for example "find a kettle under $40"),
  wing-discovery achievements and a running satchel total.
- **Atmosphere.** 520 floating candles that bob and flicker on the GPU, 6,000 dust
  motes, light shafts from the rose window, orbiting orbs over the nave, ACES tone
  mapping, bloom, and a library-coloured environment map for reflections.

## Controls

| Input | Action |
| --- | --- |
| Drag | Look around |
| `W` `A` `S` `D` / arrows | Fly |
| `Space` / `E`, `Shift` / `Q` | Up / down |
| `Ctrl` | Fly faster |
| `F` | Flight mode (pointer lock, aim with the crosshair) |
| Wheel | Surge forward or back (zoom while inspecting) |
| Click a product | Inspect it |
| `Enter` / `Esc` | Add to satchel / put it back |
| Bottom bar | Glide to a wing |

On touch screens, drag to look and use the on-screen buttons to fly.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/, works from any sub-path (base: './')
```

Requires Node 20 or newer.

## Capture and smoke test

`?capture` stops the animation loop. It exposes `window.__step(dt)`, which advances a
scripted camera path one frame at a time, so the demo video renders deterministically
even on a software GPU.

```bash
npm run build
node scripts/capture.mjs    # out/preview.webp and out/arcanum-demo.mp4 (needs ffmpeg + Playwright)
# both scripts default to the Playwright and Chromium paths of the machine they were
# written on; set PLAYWRIGHT_PATH and CHROMIUM to point at yours
node scripts/smoke.mjs      # loads, flies, opens a product, adds it to the satchel
```

## Layout

- `src/main.js`: renderer, post-processing, inspection, game rules, capture mode
- `src/world.js`: architecture, bookcases, vault, windows, candles, dust, orbs
- `src/shop.js`: listings, shelf and table placement, merged meshes, tags, picking
- `src/products.js`: product builders and the catalogue
- `src/controls.js`: flight controls and glides
- `src/textures.js`: canvas-painted textures and the tag atlas
- `src/ui.js`: HUD, quests, XP, satchel

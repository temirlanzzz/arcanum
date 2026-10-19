# Arcanum — Library Department Store

A department store set inside a daylit library, built with three.js. You walk the
aisles in first person, step into eight departments, click any product to open it
on a real product page, turn it around in 3D, choose a colourway and add it to your
bag. Every book on the walls is for sale too.

**Live:** https://temirlan.work/arcanum/ · https://temirlanzzz.github.io/arcanum/

## What changed in v2

The first version was a fantasy "magic library" with procedural products, glowing
runes and a game HUD. It looked like a game. v2 is meant to read as a real shop:

- **Real products.** 25 scanned or hand-modelled glTF assets from the Khronos
  sample collection: velvet and leather sofas, tufted chairs, a pleated silk pouf,
  sconces, an iridescent lamp, porcelain, glassware, a beverage cooler, a field
  camera, knit runners, a corset form, aviators, a chronograph, a die-cast car, a
  chess set, plants, lantern posts and an amber specimen. Their materials are
  physically based: sheen velvet, clearcoat, transmission glass, iridescence and
  anisotropic copper.
- **Real colourways.** Products that ship `KHR_materials_variants` (the sofa,
  chair, runner and watch) switch their real material variants when you pick a
  swatch.
- **Physically plausible light.** Light comes from laylights, a shadowed sun that
  follows you, a small pool of warm pendant lights, and an environment map baked
  from the hall itself, so varnish and glass reflect the room. Neutral tone
  mapping keeps product colours true, and there is no bloom.
- **Store fixtures.** Oak tables, painted plinths, glass vitrines, a marble-topped
  counter, wall shelves and rugs. About 33,000 instanced books fill the walnut
  bookcases.
- **Printed swing tags.** Every product has a red card tag on a cotton string,
  printed with its price, name and SKU and with a barcode on the back. Tags sway
  slightly; tags on small items rest beside them.
- **E-commerce UI.** A top bar with search and a bag, department tabs, a hover
  card, a product page (rating, price, colour swatches, quantity, delivery and
  returns) and a bag drawer with line items and totals.

## Controls

| | |
|---|---|
| W A S D / arrows | walk |
| drag, or F for pointer lock | look |
| E / Q | rise / sink |
| department tabs, search | glide there |
| click a product or book | open its product page |
| on the product page | drag to turn, scroll or pinch to zoom, Esc to go back |
| touch | drag to look, ↑ ↓ buttons to walk, tap to open |

## Run

```bash
npm install
npm run dev
npm run build      # static site in dist/ (relative base: works under any path)
```

`npm run build && node scripts/capture.mjs` renders `out/preview.webp` and
`out/arcanum-demo.mp4` deterministically through `?capture`, in a software GPU.
`node scripts/smoke.mjs` runs an interactive smoke test: walking, the department
glide, opening a product, adding it to the bag, search and the mobile layout.

## Credits

The 3D products are CC0 and CC-BY-4.0 assets by Wayfair, Shopify, Darmstadt
Graphics Group, Microsoft, UX3D, Sketchfab and others. See
[CREDITS.md](CREDITS.md) for the per-model attribution.

// Products, departments and where every piece stands. Every hero product is a real
// scanned glTF model (see CREDITS.md); prices and names are fictional.

// size: target size in metres along `fit` (h = height, w = largest horizontal extent).
export const ASSETS = {
  glamSofa:   { file: 'GlamVelvetSofa', fit: 'w', size: 2.19 },
  leatherSofa:{ file: 'SheenWoodLeatherSofa', fit: 'w', size: 2.3 },
  sheenChair: { file: 'SheenChair', fit: 'w', size: 0.83 },
  damask:     { file: 'ChairDamaskPurplegold', fit: 'w', size: 0.83 },
  pouf:       { file: 'SpecularSilkPouf', fit: 'w', size: 0.6 },
  barnLamp:   { file: 'AnisotropyBarnLamp', fit: 'h', size: 0.27 },
  irisLamp:   { file: 'IridescenceLamp', fit: 'h', size: 0.5 },
  teacup:     { file: 'DiffuseTransmissionTeacup', fit: 'w', size: 0.15 },
  dish:       { file: 'IridescentDishWithOlives', fit: 'w', size: 0.34 },
  bottle:     { file: 'WaterBottle', fit: 'h', size: 0.26 },
  avocado:    { file: 'Avocado', fit: 'h', size: 0.1 },
  fridge:     { file: 'CommercialRefrigerator', fit: 'h', size: 2.0 },
  boombox:    { file: 'BoomBox', fit: 'w', size: 0.44 },
  camera:     { file: 'AntiqueCamera', fit: 'h', size: 1.6 },
  shoe:       { file: 'MaterialsVariantsShoe', fit: 'w', size: 0.29 },
  corset:     { file: 'Corset', fit: 'h', size: 1.05 },
  sunglasses: { file: 'SunglassesKhronos', fit: 'w', size: 0.145 },
  watch:      { file: 'ChronographWatch', fit: 'h', size: 0.07 },
  toycar:     { file: 'ToyCar', fit: 'w', size: 0.36 },
  chess:      { file: 'ABeautifulGame', fit: 'w', size: 0.5 },
  plant:      { file: 'DiffuseTransmissionPlant', fit: 'h', size: 0.84 },
  vases:      { file: 'GlassVaseFlowers', fit: 'w', size: 0.24 },
  lantern:    { file: 'Lantern', fit: 'h', size: 2.6 },
  wicker:     { file: 'ClearcoatWicker', fit: 'w', size: 0.32 },
  amber:      { file: 'MosquitoInAmber', fit: 'w', size: 0.1 }
};

export const DEPTS = [
  { id: 'furniture', name: 'Furniture', blurb: 'Sofas, accent chairs and poufs' },
  { id: 'fashion', name: 'Shoes & Fashion', blurb: 'Footwear, corsetry, everyday wear' },
  { id: 'kitchen', name: 'Kitchen & Dining', blurb: 'Porcelain, glass and fresh produce' },
  { id: 'watches', name: 'Watches & Eyewear', blurb: 'Chronographs and sunglasses' },
  { id: 'lighting', name: 'Lighting & Decor', blurb: 'Lamps, sconces and curiosities' },
  { id: 'electronics', name: 'Electronics', blurb: 'Audio, cameras and appliances' },
  { id: 'garden', name: 'Garden & Outdoor', blurb: 'Plants, vases and lantern posts' },
  { id: 'toys', name: 'Toys & Games', blurb: 'Chess sets and die-cast models' },
  { id: 'books', name: 'Books', blurb: 'Forty thousand volumes, all for sale' }
];

// SKUs. variants: [label, glTF variant name or null, swatch colour]
export const SKUS = {
  'lune-sofa': { asset: 'glamSofa', dept: 'furniture', name: 'Lune Curved Velvet Sofa', price: 1890, rating: 4.7, reviews: 214,
    variants: [['Navy', 'Navy', '#1f2b4d'], ['Champagne', 'Champagne', '#d9c7a3'], ['Gray', 'Gray', '#8d8f93'], ['Black', 'Black', '#1b1b1d'], ['Pale Pink', 'Pale Pink', '#e7c3c0']],
    desc: 'A low, curved three-seater in performance velvet with tapered brass-tipped legs. Kiln-dried hardwood frame, high-resilience foam seat.' },
  'hartwell-sofa': { asset: 'leatherSofa', dept: 'furniture', name: 'Hartwell Rolled-Arm Leather Sofa', price: 3290, rating: 4.8, reviews: 96,
    desc: 'Full-grain aniline leather with hand-applied patina, rolled arms and a carved wood base. Scatter cushions in woven linen.' },
  'marlo-chair': { asset: 'sheenChair', dept: 'furniture', name: 'Marlo Tufted Accent Chair', price: 640, rating: 4.6, reviews: 388,
    variants: [['Mango Velvet', 'Mango Velvet', '#d8572a'], ['Peacock Velvet', 'Peacock Velvet', '#1d5f6b']],
    desc: 'Button-tufted back and seat on solid walnut legs. A compact accent chair for reading corners and bedrooms.' },
  'aurelia-chair': { asset: 'damask', dept: 'furniture', name: 'Aurelia Damask Slipper Chair', price: 520, rating: 4.5, reviews: 71,
    desc: 'Purple and gold jacquard damask over a sprung seat, raised on splayed beech legs.' },
  'silk-pouf': { asset: 'pouf', dept: 'furniture', name: 'Pleated Silk Floor Pouf', price: 289, rating: 4.4, reviews: 152,
    desc: 'Hand-pleated dupioni silk over a firm foam core. Doubles as a footstool or extra seat.' },
  'foundry-sconce': { asset: 'barnLamp', dept: 'lighting', name: 'Foundry Copper Wall Sconce', price: 159, rating: 4.7, reviews: 530,
    desc: 'Spun copper shade with a brushed finish and a clear glass globe. Hardwired, E26 bulb included.' },
  'prism-lamp': { asset: 'irisLamp', dept: 'lighting', name: 'Prism Glass Table Lamp', price: 249, rating: 4.6, reviews: 187,
    desc: 'An iridescent blown-glass base under a linen drum shade. Inline dimmer on a braided cord.' },
  'amber-specimen': { asset: 'amber', dept: 'lighting', name: 'Baltic Amber Specimen', price: 1200, rating: 5.0, reviews: 9,
    desc: 'Polished Baltic amber with a mosquito inclusion, around 40 million years old. Includes a certificate of authenticity.' },
  'rattan-sphere': { asset: 'wicker', dept: 'lighting', name: 'Woven Rattan Sphere', price: 45, rating: 4.3, reviews: 64,
    desc: 'Hand-woven rattan sphere with a lacquered finish. Sold individually.' },
  'peony-cup': { asset: 'teacup', dept: 'kitchen', name: 'Peony Porcelain Teacup & Saucer', price: 38, rating: 4.8, reviews: 1203,
    desc: 'Fine bone china, hand-decorated with a peony transfer and a gilded rim. Dishwasher safe.' },
  'olive-dish': { asset: 'dish', dept: 'kitchen', name: 'Iridescent Glass Serving Dish', price: 74, rating: 4.5, reviews: 98,
    desc: 'A cloche-style serving dish in mouth-blown iridescent glass. Olives not included.' },
  'summit-bottle': { asset: 'bottle', dept: 'kitchen', name: 'Summit Insulated Bottle 0.5 L', price: 32, rating: 4.6, reviews: 2741,
    desc: 'Double-wall vacuum steel that keeps drinks cold for 24 hours. Leak-proof cap, powder-coated sleeve.' },
  'hass-avocado': { asset: 'avocado', dept: 'kitchen', name: 'Organic Hass Avocado', price: 1.49, rating: 4.2, reviews: 318,
    desc: 'Ripe and ready to eat. Sold each, from our fresh produce counter.' },
  'glassfront-cooler': { asset: 'fridge', dept: 'electronics', name: 'Glassfront Beverage Cooler', price: 1450, rating: 4.4, reviews: 57,
    desc: 'Commercial-grade single-door cooler with anti-fog double glazing and LED interior lighting. 380 L.' },
  'retro-boombox': { asset: 'boombox', dept: 'electronics', name: 'Retro CD Boombox', price: 129, rating: 4.3, reviews: 402,
    desc: 'CD, FM and Bluetooth in a glossy shell with a backlit display and a telescopic antenna.' },
  'field-camera': { asset: 'camera', dept: 'electronics', name: 'Restored Field Camera & Tripod', price: 890, rating: 4.9, reviews: 23,
    desc: 'A restored bellows field camera on an oak and brass tripod. A working collector\'s piece.' },
  'stride-runner': { asset: 'shoe', dept: 'fashion', name: 'Stride Knit Runner', price: 120, rating: 4.6, reviews: 3120,
    variants: [['Midnight', 'midnight', '#24305e'], ['Beach', 'beach', '#d8c39a'], ['Street', 'street', '#8c2f2f']],
    desc: 'Breathable engineered knit upper, a cushioned foam midsole and a recycled rubber outsole.' },
  'brocade-corset': { asset: 'corset', dept: 'fashion', name: 'Brocade Corset, Display Form', price: 210, rating: 4.5, reviews: 44,
    desc: 'Steel-boned brocade corset with lace-up back, shown on its tailor\'s form with a velvet choker.' },
  'iris-aviator': { asset: 'sunglasses', dept: 'watches', name: 'Iris Aviator Sunglasses', price: 165, rating: 4.7, reviews: 642,
    desc: 'Polarised iridescent lenses in a lightweight metal frame. 100% UV400 protection.' },
  'chrono-gt': { asset: 'watch', dept: 'watches', name: 'Chrono GT Diver', price: 420, rating: 4.8, reviews: 286,
    variants: [['Midnight Gold', 'Midnight Gold', '#1d2333'], ['Surgical White', 'Surgical White', '#e9e9e6'], ['Commerce Green', 'Commerce Green', '#2e6b4a'], ['Khronos Red', 'Khronos Red', '#b1232b']],
    desc: '200 m water-resistant chronograph with a sapphire crystal and a quilted strap.' },
  'classic-coupe': { asset: 'toycar', dept: 'toys', name: 'Die-cast Classic Coupé 1:18', price: 59, rating: 4.7, reviews: 175,
    desc: 'Opening doors, rubber tyres and a clear-coated finish, presented on a velvet display stand.' },
  'walnut-chess': { asset: 'chess', dept: 'toys', name: 'Glass & Walnut Chess Set', price: 340, rating: 4.9, reviews: 132,
    desc: 'Weighted resin pieces with glass inlays on a 50 cm board. Felted bases, storage box included.' },
  'caladium': { asset: 'plant', dept: 'garden', name: 'Caladium in Terracotta Pot', price: 46, rating: 4.5, reviews: 211,
    desc: 'Variegated caladium in a 25 cm hand-thrown terracotta pot. Prefers bright, indirect light.' },
  'sorrel-vases': { asset: 'vases', dept: 'garden', name: 'Bud Vases with Wood Sorrel, Pair', price: 54, rating: 4.4, reviews: 87,
    desc: 'Two footed glass bud vases with live wood sorrel. Each vase stands 20 cm tall.' },
  'wharf-lantern': { asset: 'lantern', dept: 'garden', name: 'Wharf Lantern Post', price: 780, rating: 4.6, reviews: 31,
    desc: 'A timber lamp post with a forged bracket and a hanging lantern. LED retrofit, 2.6 m tall.' }
};

// A neat grid of the same product on one surface (u/v step in metres).
const grid = (sku, vi, u0, v0, cols, rows, du, dv, surf, deg = 0) => {
  const out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([sku, vi, u0 + r * du, v0 + c * dv, deg + ((r * 3 + c * 5) % 7 - 3) * 4, surf]);
  return out;
};

/* Arrangements per department bay: [sku, variantIndex, u, v, yawDeg (relative to facing the nave), surface]
   surface: 'floor' or the id of a fixture; fixtures: [id, type, u, v, w, d, h, yawDeg] */
export const BAYS_LAYOUT = [
  { dept: 'furniture',
    fixtures: [['rug1', 'rug', 3.9, 0, 4.6, 3.4], ['ct', 'coffee', 3.95, 0, 1.1, 0.6, 0.42], ['st', 'sideRound', 5.75, 2.25, 0.5, 0.5, 0.56],
      ['rug2', 'rug', 3.8, -4.6, 3.2, 2.1, 0, 90]],
    items: [['lune-sofa', 0, 5.75, 0, 0], ['marlo-chair', 0, 2.55, 1.5, 200], ['marlo-chair', 1, 2.55, -1.5, 160], ['silk-pouf', 0, 3.95, -2.3, 0],
      ['prism-lamp', 0, 5.75, 2.25, 0, 'st'], ['hartwell-sofa', 0, 3.8, -5.15, 90], ['aurelia-chair', 0, 1.4, 4.4, -20], ['lune-sofa', 1, 3.9, 5.1, -90],
      ['foundry-sconce', 0, 6.93, -1.25, 0, 'wall@2.0'], ['foundry-sconce', 0, 6.93, 1.25, 0, 'wall@2.0'], ['olive-dish', 0, 3.95, 0, 0, 'ct']] },
  { dept: 'fashion',
    fixtures: [['t1', 'table', 3.2, 0, 2.4, 0.9, 0.82], ['p1', 'plinth', 1.6, 3.6, 0.5, 0.5, 0.45], ['p2', 'plinth', 1.6, -3.6, 0.5, 0.5, 0.7],
      ['wallshoes', 'wallShelf', 6.82, 0, 3.0, 0.32, 0, 0, 4]],
    items: [['stride-runner', 0, 3.2, -0.8, -20, 't1'], ['stride-runner', 1, 3.2, 0.1, 15, 't1'], ['stride-runner', 2, 3.35, 0.9, -10, 't1'],
      ['brocade-corset', 0, 5.3, -3.3, 15], ['brocade-corset', 0, 5.3, 3.3, -15], ...grid('stride-runner', 2, 2.98, -1.0, 2, 1, 0, 0.42, 't1', 160), ['silk-pouf', 0, 2.2, 2.0, 0], ['silk-pouf', 0, 2.2, -2.0, 0],
      ['stride-runner', 1, 1.6, 3.6, 30, 'p1'], ['stride-runner', 2, 1.6, -3.6, -30, 'p2'], ['iris-aviator', 0, 3.0, 0.5, 0, 't1'],
      ['shelf:stride-runner', 0, 6.82, 0, 0, 'wallshoes']] },
  { dept: 'kitchen',
    fixtures: [['t1', 'table', 3.0, -2.2, 2.0, 1.0, 0.76], ['t2', 'table', 3.0, 2.4, 1.6, 0.8, 0.9], ['board', 'board', 3.25, 2.75, 0.42, 0.26, 0.02, 0, 't2'],
      ['wallL', 'wallShelf', 3.6, -5.82, 4.2, 0.32, 0, 90, 4], ['wallR', 'wallShelf', 3.6, 5.82, 4.2, 0.32, 0, -90, 4]],
    items: [['olive-dish', 0, 3.05, -2.2, 0, 't1'], ...grid('peony-cup', 0, 2.68, -3.0, 3, 2, 0.5, 0.26, 't1', 15), ...grid('peony-cup', 0, 3.42, -1.75, 2, 1, 0, 0.3, 't1', -20),
      ...grid('summit-bottle', 0, 2.78, 1.85, 4, 2, 0.17, 0.15, 't2'),
      ['hass-avocado', 0, 3.2, 2.7, 30, 'board'], ['hass-avocado', 0, 3.32, 2.8, -40, 'board'],
      ['glassfront-cooler', 0, 6.35, -0.5, 0], ['glassfront-cooler', 0, 6.35, 0.5, 0],
      ['shelf:peony-cup', 0, 3.6, -5.82, 0, 'wallL'], ['shelf:summit-bottle', 0, 3.6, 5.82, 0, 'wallR']] },
  { dept: 'watches',
    fixtures: [['v1', 'vitrine', 2.8, -3.0, 0.55, 0.55, 1.0], ['v2', 'vitrine', 2.8, 0, 0.55, 0.55, 1.0], ['v3', 'vitrine', 2.8, 3.0, 0.55, 0.55, 1.0],
      ['counter', 'counter', 5.7, 0, 3.4, 0.7, 0.95]],
    items: [['chrono-gt', 0, 2.8, -3.0, 10, 'v1'], ['chrono-gt', 2, 2.8, 0, -10, 'v2'], ['iris-aviator', 0, 2.8, 3.0, 15, 'v3'],
      ['chrono-gt', 1, 5.6, -1.3, 0, 'counter'], ['chrono-gt', 3, 5.6, -0.6, 10, 'counter'], ['iris-aviator', 0, 5.6, 0.3, -10, 'counter'],
      ['iris-aviator', 0, 5.6, 1.1, 20, 'counter'], ['chrono-gt', 0, 5.6, 1.6, -15, 'counter']] },
  { dept: 'lighting',
    fixtures: [['wall', 'panel', 6.9, 0, 5.0, 3.0, 0.9], ['p1', 'plinth', 3.0, -3.0, 0.45, 0.45, 0.8], ['p2', 'plinth', 3.0, 0, 0.45, 0.45, 1.0], ['p3', 'plinth', 3.0, 3.0, 0.45, 0.45, 0.65],
      ['p4', 'plinth', 1.4, 4.6, 0.36, 0.36, 1.1], ['bowl', 'table', 5.0, -4.3, 1.2, 0.7, 0.45]],
    items: [['foundry-sconce', 0, 6.88, -1.6, 0, 'wall@1.6'], ['foundry-sconce', 0, 6.88, 0, 0, 'wall@1.6'], ['foundry-sconce', 0, 6.88, 1.6, 0, 'wall@1.6'],
      ['foundry-sconce', 0, 6.88, -1.6, 0, 'wall@2.9'], ['foundry-sconce', 0, 6.88, 0, 0, 'wall@2.9'], ['foundry-sconce', 0, 6.88, 1.6, 0, 'wall@2.9'],
      ['prism-lamp', 0, 3.0, -3.0, 0, 'p1'], ['prism-lamp', 0, 3.0, 0, 30, 'p2'], ['prism-lamp', 0, 3.0, 3.0, -20, 'p3'],
      ['amber-specimen', 0, 1.4, 4.6, 30, 'p4'], ['rattan-sphere', 0, 4.8, -4.45, 0, 'bowl'], ['rattan-sphere', 0, 5.2, -4.2, 40, 'bowl'], ['rattan-sphere', 0, 5.6, -4.4, 80, 'bowl']] },
  { dept: 'electronics',
    fixtures: [['t1', 'table', 3.2, 0, 2.2, 0.85, 0.82], ['wallL', 'wallShelf', 3.6, -5.82, 4.2, 0.36, 0, 90, 4]],
    items: [['glassfront-cooler', 0, 6.35, -1.0, 0], ['glassfront-cooler', 0, 6.35, 0.0, 0], ['field-camera', 0, 3.0, 3.8, -30], ['field-camera', 0, 5.2, 4.3, -45],
      ...grid('retro-boombox', 0, 3.05, -0.75, 3, 1, 0, 0.62, 't1', 10), ['summit-bottle', 0, 3.4, 0.9, 0, 't1'], ['shelf:retro-boombox', 0, 3.6, -5.82, 0, 'wallL']] },
  { dept: 'garden',
    fixtures: [['p1', 'plinth', 3.0, -1.0, 0.5, 0.5, 0.4], ['p2', 'plinth', 3.6, 1.6, 0.5, 0.5, 0.6], ['t1', 'table', 5.6, 3.6, 1.4, 0.7, 0.76]],
    items: [['wharf-lantern', 0, 1.2, -4.9, 0], ['wharf-lantern', 0, 1.2, 4.9, 180], ['caladium', 0, 3.0, -1.0, 0, 'p1'], ['caladium', 0, 3.6, 1.6, 40, 'p2'],
      ['caladium', 0, 5.6, -2.0, 80], ['caladium', 0, 6.2, -0.6, 20], ['caladium', 0, 5.0, -3.6, 120], ['sorrel-vases', 0, 5.6, 3.6, 0, 't1'],
      ['rattan-sphere', 0, 2.3, 3.2, 0], ['rattan-sphere', 0, 2.6, 3.5, 70]] },
  { dept: 'toys',
    fixtures: [['t1', 'table', 3.0, -1.6, 1.1, 1.1, 0.74], ['t2', 'table', 5.6, 2.6, 1.0, 1.0, 0.74], ['p1', 'plinth', 2.3, 3.0, 0.5, 0.5, 0.9], ['p2', 'plinth', 3.3, 4.2, 0.5, 0.5, 0.7],
      ['wallR', 'wallShelf', 3.6, -5.82, 4.2, 0.36, 0, 90, 4]],
    items: [['walnut-chess', 0, 3.0, -1.6, 10, 't1'], ['walnut-chess', 0, 5.6, 2.6, -25, 't2'], ['classic-coupe', 0, 2.3, 3.0, 30, 'p1'], ['classic-coupe', 0, 3.3, 4.2, -20, 'p2'],
      ['shelf:classic-coupe', 0, 3.6, -5.82, 0, 'wallR']] }
];

// Featured tables down the middle of the nave (world coordinates).
export const NAVE_TABLES = [
  { x: 0, z: -12, items: [['peony-cup', 0, -0.62, 0.15, 20], ['peony-cup', 0, -0.35, -0.2, -10], ['iris-aviator', 0, 0.05, 0.12, -15], ['chrono-gt', 1, 0.35, -0.18, 10], ['sorrel-vases', 0, 0.7, 0.05, 0]] },
  { x: 0, z: -26, items: [['stride-runner', 0, -0.6, 0.05, -25], ['stride-runner', 1, -0.2, -0.15, 15], ['summit-bottle', 0, 0.25, 0.15, 0], ['classic-coupe', 0, 0.68, -0.08, 30]] },
  { x: 0, z: -40, items: [['olive-dish', 0, -0.45, 0, 0], ['walnut-chess', 0, 0.45, 0, 20]] },
  { x: -5.0, z: -19, plant: true, items: [['caladium', 0, 0, 0, 0]] },
  { x: 5.0, z: -33, plant: true, items: [['caladium', 0, 0, 0, 60]] }
];

// Deterministic book titles and prices for the shelves.
const A1 = ['The Quiet', 'A Short History of', 'The Lost', 'Letters from', 'The Art of', 'On', 'The Last', 'Notes on', 'Atlas of', 'The Secret', 'Under the', 'Field Guide to'];
const A2 = ['Lighthouse', 'Cartography', 'Orchard', 'Winter Gardens', 'Glass', 'Clockmakers', 'River Delta', 'Salt Roads', 'Small Rooms', 'Northern Birds', 'Paper Boats', 'Copper Age', 'Tidewater', 'Moth Hours', 'Library'];
const AUTH = ['E. Marlowe', 'J. Okafor', 'L. Haddad', 'M. Varga', 'R. Lindqvist', 'S. Moreau', 'T. Adeyemi', 'A. Sato', 'C. Brennan', 'N. Kowalski', 'H. Ilić', 'P. Castellanos'];
const FORMAT = [['Hardcover', 28], ['Cloth-bound', 34], ['Leather edition', 58], ['First edition', 140], ['Paperback', 16]];
export function bookAt(seed) {
  let h = (seed * 2654435761) >>> 0;
  const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296);
  const f = FORMAT[Math.floor(r() * r() * FORMAT.length)];
  return {
    id: 'book-' + seed, asset: null, dept: 'books', book: seed,
    name: `${A1[Math.floor(r() * A1.length)]} ${A2[Math.floor(r() * A2.length)]}`,
    author: AUTH[Math.floor(r() * AUTH.length)], format: f[0],
    price: Math.round(f[1] * (0.8 + r() * 0.6)) - 0.01, rating: Math.round((3.9 + r() * 1.1) * 10) / 10, reviews: Math.floor(r() * 900) + 4,
    desc: `${f[0]}, ${180 + Math.floor(r() * 420)} pages. Printed on acid-free paper with a sewn binding. Ships in protective packaging.`
  };
}

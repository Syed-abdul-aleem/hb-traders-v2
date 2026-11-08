# HB Traders — Pharmacy Website v2 (hb-traders-v2.vercel.app)

New theme built on the store's own logo: bright green + navy, solid icons
throughout, dense real-pharmacy layout. **No prices anywhere on the site** —
customers order on WhatsApp and the store confirms current prices, availability
and delivery charges in the chat before anything is paid.

Upload all files to the hosting root and the site works. No backend needed.

## Pages
- `index.html` — home: store panel hero + search, service facts, category index,
  featured products, everyday essentials list, how ordering works, store details, FAQ
- `shop.html` — full shop with left sidebar: categories, brand filter,
  in-stock / no-prescription filters, search (name, brand, product code), sorting
- `about.html` / `contact.html` — store story, address, WhatsApp, socials, map
- `404.html` — custom 404 (point the hosting 404 handler to this file)
- `admin.html` — admin panel (see below)

## Ordering flow
Add to cart → name / phone / address → "Place Order on WhatsApp" opens
wa.me/923433009226 with the order written out: product names, pack sizes,
product codes (HB-001…) and quantities — **no prices**. The store replies
with the bill. Cart is saved in the visitor's browser.

## Admin panel — admin.html
- The panel password is set by the site owner in `assets/js/admin.js` (constant at the top). It is not written anywhere else.
  (constant `ADMIN_PASSWORD`) before real use.
- Manage products: add, edit, delete; stock status (In / Low / Out),
  prescription flag, featured flag, image upload, full details
  (brand, form, strength, pack, uses, directions, storage, caution).
- Store settings: WhatsApp number, phone display, address, social links.
- Export / Import the catalog as JSON; Reset restores the 30 demo products.
- How it works: this is a static site, so admin changes are stored in the
  browser (localStorage) and apply immediately on that device. To make a
  change permanent for all visitors, Export the JSON and replace
  `DEFAULT_PRODUCTS` in `assets/js/products.js` with it (or send the export
  to your developer).

## Products & images
- Demo catalog lives in `assets/js/products.js` (`DEFAULT_PRODUCTS`).
  Fields: sku, slug, name, brand, category, form, strength, pack, rx,
  stock, featured, desc, uses, directions, storage, caution. No price fields.
- Product images: `assets/images/products/<slug>.webp` (real product photos,
  converted to WebP). Image sources are listed in
  `assets/images/real-raw/SOURCES.md`.
- Branding: `logo-full.png` (footer/about), `logo-icon-transparent.png`
  (header/loader/favicon source), favicon.ico + PNG sizes — all made from
  the store's supplied logo.

## Store details (defaults, editable in Admin → Settings)
- WhatsApp: 0343 3009226 (international 923433009226)
- Address: Inside Gulistan Society, Near MMC Laghari Gate, Dera Ismail Khan
- Facebook: facebook.com/hbtraders628 · Instagram: @hb_traders7 · TikTok: @hbtraders7

Note: the supplied logo reads "HBTraders.pk" — the logo artwork is used exactly as supplied.

## Feature round (added later on 2026-11-07)

**Homepage**
- Announcement bar — text + on/off switch in Admin → Store settings
- Live "Open now / Closed" badge in the top strip, from the opening hours set in admin
- Shop by Need — 8 plain-language shortcuts (fever & pain, acidity, baby…) that open the right shop category
- Order by Prescription — name + number form with a private on-device photo preview; opens WhatsApp ready to attach the photo
- Quick health tools — BMI calculator and daily water-needs calculator (nothing is saved)
- Your Last Order — after an order, the homepage offers one-tap reorder of the same items
- Recently Viewed — products you opened, kept on your device for quick refinding

**Product popup**
- Share this product button (phone share sheet / WhatsApp)
- "Customers also ask for" — related products from the same shelf

**Admin panel**
- Dashboard now also shows Low Stock count and Orders count
- Stock Alerts card — every low/out product with one-click "Mark In Stock"
- Orders inbox — orders placed from the same browser, with New / Preparing / Done status
- Product table: category filter, tick-box selection with bulk actions (Set In / Low / Out, Delete selected), and click-the-stock-label quick change
- Settings: announcement bar, opening & closing hours, and an accent colour (Green / Navy / Teal / Maroon) applied across the site
- Export now includes settings as well as products; Import accepts both the new file and the old products-only file

# Koeltekaart — Quick Start

An interactive heat relief map for Amsterdam, built for GGD Amsterdam.

---

## Running the app

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Mac / Linux
pip install flask flask-cors
flask --app wsgi run
```

Then open **http://localhost:5000** in your browser.

No database, no environment variables, no additional setup required.

---

## What's on the map

**Drinking water** (blue dots) — all 554 public water taps in Amsterdam, open 24/7.

**Parks** (green polygons) — park boundaries. Click a park to see its area and district.

**Community spaces** (orange dots) — 298 indoor spaces including libraries, neighbourhood centres, and youth centres. These show real-time open/closed status based on their simulated weekly schedules, plus attributes like wheelchair accessibility, A/C, and whether food or water is available on-site.

**Intervention priority overlay** (off by default) — colours Amsterdam's 498 neighbourhoods by a composite score combining heat exposure, demographic vulnerability (elderly share, benefit recipients), and cool-spot access gap. Click any neighbourhood to see a breakdown and a radar chart comparing it against the city average.

---

## Controls

**Search bar** — type any address, street name, or postcode to pan the map there.

**Near me** — uses your browser's geolocation to find the closest water taps, parks, and community spaces to your current position. Respects any active filters.

**Layers** — opens the layer panel. Toggle each layer on or off, and use the filter chips under Community spaces to narrow results by: Open now / Free / Accessible / A/C / Seating / Water.

**i button** — opens the heat safety tips panel.

---

## Regenerating the processed data

The `data/processed/` files are pre-built and committed, so you don't need to run the scripts to use the app. If you want to rebuild them from raw source data:

```bash
# Requires: geopandas, pyogrio, shapely, pandas, numpy
python scripts/enrich_community.py       # community_enriched.geojson
python scripts/analyse_klimaatrisico.py  # heat_risk_buurt.geojson
python scripts/build_hvi.py              # hvi_pc4.geojson (unused by frontend)
```

These scripts require the raw `.gpkg` and `.gdb` source files which are excluded from the repository due to size (up to 544 MB). Contact the project owner if you need them.

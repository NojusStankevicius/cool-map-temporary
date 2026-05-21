"""
Enrich social service community spots with simulated attributes.

Uses a seeded RNG per MVZN_ID so results are stable across runs.
Outputs: data/processed/community_enriched.geojson
"""

from __future__ import annotations
import hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC  = ROOT / "data/raw/social_services.geojson"
OUT  = ROOT / "data/processed/community_enriched.geojson"

INDOOR_CATS = {"Buurtkamer", "Huis van de wijk", "Jongerencentrum", "Bibliotheek", "Overig BV"}

# Per-category simulation profiles
# schedule: (open, close) tuples indexed mon–sun (None = closed)
CROWD_LEVELS = ["quiet", "moderate", "busy"]

PROFILES = {
    "Bibliotheek": {
        "free": 1.0,
        "wheelchair": 0.92,
        "has_ac": 0.82,
        "seating": 0.97,
        "crowd_weights": [0.20, 0.45, 0.35],   # quiet / moderate / busy
        "food": 0.28, "water": 0.92, "toilets": 0.96,
        # Typically Mon-Fri 10–20, Sat 10–17, Sun 12–17
        "schedules": [
            {"mo":[10,20],"tu":[10,20],"we":[10,20],"th":[10,20],"fr":[10,20],"sa":[10,17],"su":[12,17]},
            {"mo":None,   "tu":[10,20],"we":[10,20],"th":[10,20],"fr":[10,20],"sa":[10,17],"su":None},
            {"mo":[10,18],"tu":[10,18],"we":[10,18],"th":[10,18],"fr":[10,18],"sa":[10,15],"su":None},
        ],
    },
    "Huis van de wijk": {
        "free": 1.0,
        "wheelchair": 0.78,
        "has_ac": 0.48,
        "seating": 0.88,
        "crowd_weights": [0.40, 0.45, 0.15],
        "food": 0.42, "water": 0.80, "toilets": 0.88,
        "schedules": [
            {"mo":[9,17],"tu":[9,17],"we":[9,17],"th":[9,17],"fr":[9,17],"sa":None,    "su":None},
            {"mo":[9,17],"tu":[9,17],"we":[9,17],"th":[9,17],"fr":[9,17],"sa":[10,13],"su":None},
            {"mo":[9,21],"tu":[9,21],"we":[9,21],"th":[9,21],"fr":[9,17],"sa":[10,14],"su":None},
        ],
    },
    "Buurtkamer": {
        "free": 0.93,
        "wheelchair": 0.55,
        "has_ac": 0.22,
        "seating": 0.82,
        "crowd_weights": [0.60, 0.32, 0.08],
        "food": 0.38, "water": 0.55, "toilets": 0.68,
        "schedules": [
            {"mo":[10,12],"tu":[10,12],"we":[10,12],"th":[10,12],"fr":[10,12],"sa":None,"su":None},
            {"mo":[14,17],"tu":[14,17],"we":[14,17],"th":[14,17],"fr":[14,17],"sa":None,"su":None},
            {"mo":[10,16],"tu":[10,16],"we":[10,16],"th":[10,16],"fr":[10,16],"sa":None,"su":None},
            {"mo":[9,12], "tu":[9,12], "we":[9,12], "th":[9,12], "fr":[9,12], "sa":None,"su":None},
        ],
    },
    "Jongerencentrum": {
        "free": 0.82,
        "wheelchair": 0.62,
        "has_ac": 0.33,
        "seating": 0.72,
        "crowd_weights": [0.25, 0.45, 0.30],
        "food": 0.50, "water": 0.72, "toilets": 0.85,
        "schedules": [
            {"mo":[14,20],"tu":[14,20],"we":[14,20],"th":[14,20],"fr":[14,22],"sa":[14,22],"su":None},
            {"mo":[15,21],"tu":[15,21],"we":[15,21],"th":[15,21],"fr":[15,22],"sa":[15,22],"su":None},
            {"mo":None,   "tu":[14,20],"we":[14,20],"th":[14,20],"fr":[14,22],"sa":[14,22],"su":None},
        ],
    },
    "Overig BV": {
        "free": 0.85,
        "wheelchair": 0.60,
        "has_ac": 0.30,
        "seating": 0.75,
        "crowd_weights": [0.45, 0.40, 0.15],
        "food": 0.32, "water": 0.65, "toilets": 0.75,
        "schedules": [
            {"mo":[9,17],"tu":[9,17],"we":[9,17],"th":[9,17],"fr":[9,17],"sa":None,    "su":None},
            {"mo":[10,16],"tu":[10,16],"we":[10,16],"th":[10,16],"fr":[10,16],"sa":None,"su":None},
            {"mo":[9,17],"tu":[9,17],"we":[9,17],"th":[9,17],"fr":[9,17],"sa":[10,14],"su":None},
        ],
    },
}

DAYS = ["mo","tu","we","th","fr","sa","su"]


def seed_float(mvzn_id: str, salt: str) -> float:
    h = hashlib.md5(f"{mvzn_id}:{salt}".encode()).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF


def weighted_pick(mvzn: str, salt: str, weights: list) -> int:
    """Pick index proportional to weights using seeded float."""
    r = seed_float(mvzn, salt)
    total = sum(weights)
    cumulative = 0.0
    for i, w in enumerate(weights):
        cumulative += w / total
        if r < cumulative:
            return i
    return len(weights) - 1


def simulate(props: dict) -> dict:
    cat   = props.get("Categorie") or props.get("Soort", "")
    mvzn  = props.get("MVZN_ID", props.get("Naam", ""))
    prof  = PROFILES.get(cat, PROFILES["Overig BV"])

    free        = seed_float(mvzn, "free")        < prof["free"]
    wheelchair  = seed_float(mvzn, "wheelchair")  < prof["wheelchair"]
    has_ac      = seed_float(mvzn, "has_ac")       < prof["has_ac"]
    seating     = seed_float(mvzn, "seating")      < prof["seating"]
    food        = seed_float(mvzn, "food")         < prof["food"]
    water       = seed_float(mvzn, "water")        < prof["water"]
    toilets     = seed_float(mvzn, "toilets")      < prof["toilets"]

    crowd_idx   = weighted_pick(mvzn, "crowd", prof["crowd_weights"])
    crowd_level = CROWD_LEVELS[crowd_idx]

    sched_idx   = int(seed_float(mvzn, "sched") * len(prof["schedules"]))
    schedule    = prof["schedules"][sched_idx]

    # Human-readable hours summary
    open_days = [d for d in DAYS if schedule[d]]
    if not open_days:
        hours_display = "Hours vary"
    elif open_days == DAYS[:5]:
        s = schedule["mo"]
        hours_display = f"Mon–Fri {s[0]:02d}:00–{s[1]:02d}:00"
    elif open_days == DAYS[:6]:
        s = schedule["mo"]
        sa = schedule["sa"]
        hours_display = f"Mon–Fri {s[0]:02d}:00–{s[1]:02d}:00 · Sat {sa[0]:02d}:00–{sa[1]:02d}:00"
    elif set(open_days) == set(DAYS):
        s = schedule["mo"]
        hours_display = f"Daily {s[0]:02d}:00–{s[1]:02d}:00"
    else:
        parts = []
        s = schedule[open_days[0]]
        parts.append(f"{', '.join(d.capitalize() for d in open_days)} {s[0]:02d}:00–{s[1]:02d}:00")
        hours_display = " · ".join(parts)

    return {
        "free":          free,
        "wheelchair":    wheelchair,
        "has_ac":        has_ac,
        "seating":       seating,
        "crowd_level":   crowd_level,
        "amenities":     {"food": food, "water": water, "toilets": toilets},
        "schedule":      schedule,
        "hours_display": hours_display,
    }


def main():
    with SRC.open(encoding="utf-8") as f:
        fc = json.load(f)

    enriched = []
    skipped  = 0
    for feat in fc["features"]:
        p   = feat["properties"] or {}
        cat = p.get("Categorie") or p.get("Soort", "")
        if cat not in INDOOR_CATS:
            skipped += 1
            continue
        new_feat = {
            "type":       "Feature",
            "geometry":   feat["geometry"],
            "properties": {**p, **simulate(p)},
        }
        enriched.append(new_feat)

    out_fc = {"type": "FeatureCollection", "features": enriched}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(out_fc, f, separators=(",", ":"), ensure_ascii=False)

    print(f"Enriched {len(enriched)} spots, skipped {skipped}")
    print(f"Written: {OUT}")

    # Quick stats
    n = len(enriched)
    def c(key): return sum(1 for e in enriched if e["properties"].get(key))
    def ca(key): return sum(1 for e in enriched if e["properties"].get("amenities", {}).get(key))
    from collections import Counter
    crowds = Counter(e["properties"]["crowd_level"] for e in enriched)
    print(f"  free={c('free')} wheelchair={c('wheelchair')} has_ac={c('has_ac')} seating={c('seating')} (of {n})")
    print(f"  amenities: food={ca('food')} water={ca('water')} toilets={ca('toilets')}")
    print(f"  crowd: {dict(crowds)}")


if __name__ == "__main__":
    main()

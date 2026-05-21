"""
Klimaatrisicokaarten analysis pipeline.

Outputs:
  data/processed/heat_risk_buurt.geojson   — buurt heat risk scores for the map overlay
  data/processed/analysis_report.txt        — printed analysis: demographics × risk, coverage gaps

Analysis:
  1. Export HI_TOTAAL_S + sub-scores per buurt → map layer
  2. Spatially join CBS PC6 → buurten, aggregate demographics
  3. Correlate CBS demographics with professional heat sensitivity scores
  4. Cool spot coverage: count cool spots within 500 m and 1 km of each buurt centroid
  5. Identify priority buurten: high heat risk + low cool spot access
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
GDB  = ROOT / "data/raw/Klimaatrisicokaarten/Risicokaarten definitief.gdb"
CBS_GPKG = ROOT / "data/raw/2025-cbs_pc6_2024_v1/cbs_pc6_2024_v1.gpkg"
OUT_RISK = ROOT / "data/processed/heat_risk_buurt.geojson"
OUT_REPORT = ROOT / "data/processed/analysis_report.txt"

SENTINEL = -99990
AMS_PC4 = {str(i) for i in range(1000, 1110)}

COOL_SOURCES = [
    ROOT / "data/raw/water_taps.geojson",
    ROOT / "data/raw/social_services.geojson",
]

INDOOR_CATS = {"Buurtkamer", "Huis van de wijk", "Jongerencentrum", "Bibliotheek", "Overig BV"}


# ── Helpers ────────────────────────────────────────────────────────────────

def haversine(lat1, lon1, lat2, lon2):
    R = 6371000  # metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def lines(text, width=80):
    return "\n".join(text[i:i+width] for i in range(0, len(text), width))


def section(title, out):
    bar = "=" * 70
    out.append(f"\n{bar}\n  {title}\n{bar}")


# ── 1. Load risicokaarten ──────────────────────────────────────────────────

def load_risk():
    print("Loading risicokaarten …")
    gdf = gpd.read_file(GDB, layer="Risico_per_buurt_20231009")

    keep = [
        "NAME",
        "HI_TOTAAL_S",
        "HI_BLOOTSTELLING_S",
        "HI_GEVOELIGHEID_S",
        "HI_AANPASSINGSVERMOGEN_S",
        "HI_KLIMAATOMSTANDIGHEID_S",
        # heat sub-indicators
        "HI_GV_AANTAL_65PLUS_S",
        "HI_GV_INWONERS_ONDER_SOCIAAL_MINIMUM_S",
        "HI_GV_PANDEN_MET_KWETSBARE_GROEPEN_S",
        "HI_GV_INWONERS_BEPERKT_MOBIEL_S",
        "HI_BS_SCHADUW_OP_LOOPGEBIEDEN_S",
        "HI_AV_TOEGANG_TOT_TUIN_S",
        "HI_KO_PET_S",
        # other hazard totals
        "WO_TOTAAL_S",
        "DR_TOTAAL_S",
        "WV_TOTAAL_S",
        "AA_KRA_TOTAAL_S",
        # population
        "WO_BS_AANTAL_INWONERS_V",
        "geometry",
    ]
    available = [c for c in keep if c in gdf.columns]
    gdf = gdf[available].copy()
    gdf["buurt_naam"] = gdf["NAME"].str.replace("RK_", "", regex=False).str.strip()
    print(f"  {len(gdf)} buurten loaded")
    return gdf


# ── 2. Load and aggregate CBS PC6 to buurten ──────────────────────────────

def load_cbs_to_buurten(risk_gdf):
    print("Loading CBS PC6 and spatially joining to buurten …")
    raw = gpd.read_file(CBS_GPKG)
    raw["pc4"] = raw["postcode6"].str[:4]
    ams = raw[raw["pc4"].isin(AMS_PC4)].copy()

    int_cols = [c for c in ams.columns if ams[c].dtype in (np.int32, np.int64) and c not in ("pc4",)]
    for col in int_cols:
        ams.loc[ams[col] < SENTINEL, col] = np.nan

    # Use centroids for the join (faster than polygon-in-polygon)
    ams_wgs = ams.to_crs(epsg=4326)
    risk_wgs = risk_gdf.to_crs(epsg=4326)

    centroids = ams_wgs.copy()
    centroids.geometry = ams_wgs.geometry.centroid

    joined = gpd.sjoin(centroids, risk_wgs[["buurt_naam", "geometry"]], how="left", predicate="within")

    agg_cols = {
        "aantal_inwoners": "sum",
        "aantal_inwoners_65_jaar_en_ouder": "sum",
        "aantal_inwoners_0_tot_15_jaar": "sum",
        "aantal_eenpersoonshuishoudens": "sum",
        "aantal_part_huishoudens": "sum",
        "aantal_personen_met_uitkering_onder_aowlft": "sum",
        "aantal_woningen_bouwjaar_voor_1945": "sum",
        "aantal_woningen": "sum",
        "percentage_huurwoningen": "mean",
    }
    agg_cols = {k: v for k, v in agg_cols.items() if k in joined.columns}

    buurt_cbs = joined.groupby("buurt_naam").agg(agg_cols).reset_index()

    pop = buurt_cbs["aantal_inwoners"].replace(0, np.nan)
    buurt_cbs["pct_elderly_cbs"]   = buurt_cbs["aantal_inwoners_65_jaar_en_ouder"] / pop
    buurt_cbs["pct_single_cbs"]    = buurt_cbs["aantal_eenpersoonshuishoudens"] / buurt_cbs["aantal_part_huishoudens"].replace(0, np.nan)
    buurt_cbs["pct_benefits_cbs"]  = buurt_cbs["aantal_personen_met_uitkering_onder_aowlft"] / pop
    buurt_cbs["pct_pre1945_cbs"]   = buurt_cbs["aantal_woningen_bouwjaar_voor_1945"] / buurt_cbs["aantal_woningen"].replace(0, np.nan)
    buurt_cbs["pct_rental_cbs"]    = buurt_cbs["percentage_huurwoningen"] / 100

    print(f"  CBS aggregated to {len(buurt_cbs)} buurten")
    return buurt_cbs


# ── 3. Load cool spots ─────────────────────────────────────────────────────

def load_cool_spots():
    spots = []
    for path in COOL_SOURCES:
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            fc = json.load(f)
        for feat in fc.get("features", []):
            geom = feat.get("geometry", {})
            props = feat.get("properties", {}) or {}
            if geom.get("type") != "Point":
                continue
            cat = props.get("Categorie") or props.get("Soort", "")
            if "social" in str(path) and cat not in INDOOR_CATS:
                continue
            lon, lat = geom["coordinates"][:2]
            spots.append({"lat": lat, "lon": lon, "type": "tap" if "water" in str(path) else "community"})

    print(f"  {len(spots)} cool spots loaded (taps + community)")
    return spots


def count_nearby(buurt_lat, buurt_lon, spots, radius_m):
    return sum(1 for s in spots if haversine(buurt_lat, buurt_lon, s["lat"], s["lon"]) <= radius_m)


# ── 4. Main analysis ───────────────────────────────────────────────────────

def main():
    out_lines = []

    risk_gdf  = load_risk()
    buurt_cbs = load_cbs_to_buurten(risk_gdf)
    cool_spots = load_cool_spots()

    # Merge demographics into risk GDF
    merged = risk_gdf.merge(buurt_cbs, on="buurt_naam", how="left")

    # Buurt centroids in WGS84 for distance calculations
    merged_wgs = merged.to_crs(epsg=4326)
    centroids  = merged_wgs.geometry.centroid

    # Cool spot counts
    print("Computing cool spot coverage per buurt …")
    merged["cool_500m"] = [
        count_nearby(c.y, c.x, cool_spots, 500) for c in centroids
    ]
    merged["cool_1km"] = [
        count_nearby(c.y, c.x, cool_spots, 1000) for c in centroids
    ]

    # ── Composite priority score ───────────────────────────────────────────
    # Three components, each normalised 0–1 across Amsterdam:
    #   heat_norm    – HI_TOTAAL_S (professional heat risk)
    #   vuln_norm    – weighted blend of elderly share + benefits share
    #   gap_norm     – inverse cool-spot access (fewer spots → higher gap)
    # Geometric mean: a buurt must score high on ALL three to rank as priority.
    def norm01(series: pd.Series) -> pd.Series:
        mn, mx = series.min(), series.max()
        return (series - mn) / (mx - mn) if mx > mn else pd.Series(0.5, index=series.index)

    merged["_heat_n"] = norm01(merged["HI_TOTAAL_S"].fillna(merged["HI_TOTAAL_S"].median()))
    vuln_raw = (
        merged["pct_elderly_cbs"].fillna(0) * 0.6 +
        merged["pct_benefits_cbs"].fillna(0) * 0.4
    )
    merged["_vuln_n"] = norm01(vuln_raw)
    gap_raw = 1.0 / (merged["cool_500m"] + 1.0)
    merged["_gap_n"]  = norm01(gap_raw)

    # Geometric mean — requires all three to be elevated
    merged["priority_score"] = (
        merged["_heat_n"] * merged["_vuln_n"] * merged["_gap_n"]
    ) ** (1 / 3)
    merged["priority_score"] = merged["priority_score"].round(4)

    # Per-axis values normalised 0–1 for the radar chart (stored as JSON metadata)
    radar_axes = {
        "heat_exposure":  norm01(merged["HI_BLOOTSTELLING_S"].fillna(merged["HI_BLOOTSTELLING_S"].median())),
        "heat_sensitivity": norm01(merged["HI_GEVOELIGHEID_S"].fillna(merged["HI_GEVOELIGHEID_S"].median())),
        "elderly_share":  norm01(merged["pct_elderly_cbs"].fillna(0)),
        "benefits_share": norm01(merged["pct_benefits_cbs"].fillna(0)),
        "cool_spot_gap":  norm01(gap_raw),
    }
    for ax, vals in radar_axes.items():
        merged[f"r_{ax}"] = vals.round(4)

    # Amsterdam averages for each radar axis (for comparison ring in chart)
    ams_avg = {ax: round(float(vals.mean()), 4) for ax, vals in radar_axes.items()}

    print(f"  Priority scores computed. Range: {merged['priority_score'].min():.3f}–{merged['priority_score'].max():.3f}")
    merged.drop(columns=["_heat_n", "_vuln_n", "_gap_n"], inplace=True)

    # ── Report ─────────────────────────────────────────────────────────────

    section("TOP 15 HIGHEST HEAT RISK BUURTEN  (HI_TOTAAL_S, scale 1–5)", out_lines)
    top_heat = merged.nlargest(15, "HI_TOTAAL_S")[
        ["buurt_naam", "HI_TOTAAL_S", "HI_BLOOTSTELLING_S", "HI_GEVOELIGHEID_S",
         "HI_AANPASSINGSVERMOGEN_S", "cool_500m", "cool_1km"]
    ]
    out_lines.append(top_heat.to_string(index=False))

    section("TOP 15 COMBINED CLIMATE RISK  (AA_KRA_TOTAAL_S — heat + drought + flood + water safety)", out_lines)
    top_all = merged.nlargest(15, "AA_KRA_TOTAAL_S")[
        ["buurt_naam", "AA_KRA_TOTAAL_S", "HI_TOTAAL_S", "WO_TOTAAL_S", "DR_TOTAAL_S", "WV_TOTAAL_S"]
    ]
    out_lines.append(top_all.to_string(index=False))

    section("DEMOGRAPHIC CORRELATIONS WITH HEAT SENSITIVITY  (HI_GEVOELIGHEID_S)", out_lines)
    corr_pairs = [
        ("pct_elderly_cbs",   "% elderly (65+)"),
        ("pct_single_cbs",    "% single-person households"),
        ("pct_benefits_cbs",  "% on social benefits"),
        ("pct_pre1945_cbs",   "% pre-1945 housing"),
        ("pct_rental_cbs",    "% rental housing"),
    ]
    out_lines.append(f"  {'Indicator':<32}  {'Pearson r':>10}  {'n buurten':>10}")
    out_lines.append("  " + "-" * 55)
    target = merged["HI_GEVOELIGHEID_S"].dropna()
    for col, label in corr_pairs:
        if col not in merged.columns:
            continue
        both = merged[[col, "HI_GEVOELIGHEID_S"]].dropna()
        if len(both) < 10:
            out_lines.append(f"  {label:<32}  {'n/a':>10}  {len(both):>10}")
            continue
        r = both[col].corr(both["HI_GEVOELIGHEID_S"])
        out_lines.append(f"  {label:<32}  {r:>10.3f}  {len(both):>10}")

    section("PRIORITY GAPS: HIGH HEAT RISK + FEW COOL SPOTS WITHIN 500 m", out_lines)
    hi_threshold = merged["HI_TOTAAL_S"].quantile(0.75)
    high_risk = merged[merged["HI_TOTAAL_S"] >= hi_threshold].copy()
    gaps = high_risk.nsmallest(15, "cool_500m")[
        ["buurt_naam", "HI_TOTAAL_S", "HI_GEVOELIGHEID_S", "cool_500m", "cool_1km",
         "pct_elderly_cbs", "pct_benefits_cbs"]
    ]
    out_lines.append(f"  (threshold: HI_TOTAAL_S >= {hi_threshold:.2f}, top quartile)\n")
    out_lines.append(gaps.round(3).to_string(index=False))

    section("BUURTEN WITH HIGH HEAT RISK AND HIGH ELDERLY SHARE", out_lines)
    if "pct_elderly_cbs" in merged.columns:
        elderly_q3 = merged["pct_elderly_cbs"].quantile(0.75)
        hi_elderly = merged[
            (merged["HI_TOTAAL_S"] >= hi_threshold) &
            (merged["pct_elderly_cbs"] >= elderly_q3)
        ].sort_values("HI_TOTAAL_S", ascending=False)[
            ["buurt_naam", "HI_TOTAAL_S", "pct_elderly_cbs", "pct_single_cbs", "cool_500m"]
        ]
        out_lines.append(f"  ({len(hi_elderly)} buurten match: heat top quartile AND elderly top quartile)\n")
        out_lines.append(hi_elderly.head(15).round(3).to_string(index=False))

    # ── Export map GeoJSON ─────────────────────────────────────────────────
    print("Exporting heat_risk_buurt.geojson …")
    export_cols = [
        "buurt_naam", "priority_score",
        "HI_TOTAAL_S", "HI_BLOOTSTELLING_S", "HI_GEVOELIGHEID_S",
        "HI_AANPASSINGSVERMOGEN_S", "HI_KLIMAATOMSTANDIGHEID_S",
        "AA_KRA_TOTAAL_S",
        "pct_elderly_cbs", "pct_single_cbs", "pct_benefits_cbs",
        "cool_500m", "cool_1km",
        # radar axes (normalised 0–1)
        "r_heat_exposure", "r_heat_sensitivity",
        "r_elderly_share", "r_benefits_share", "r_cool_spot_gap",
        "geometry",
    ]
    export_cols = [c for c in export_cols if c in merged.columns]
    export_gdf = merged[export_cols].to_crs(epsg=4326)

    # Simplify geometry
    export_gdf["geometry"] = export_gdf.geometry.simplify(0.0002, preserve_topology=True)

    features = []
    for _, row in export_gdf.iterrows():
        if row.geometry is None or row.geometry.is_empty:
            continue
        props = {k: row[k] for k in export_cols if k != "geometry"}
        props = {k: (None if isinstance(v, float) and np.isnan(v) else
                     round(float(v), 4) if isinstance(v, float) else
                     int(v) if isinstance(v, (np.integer,)) else v)
                 for k, v in props.items()}
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": row.geometry.__geo_interface__,
        })

    fc = {"type": "FeatureCollection", "amsterdam_avg": ams_avg, "features": features}
    OUT_RISK.parent.mkdir(parents=True, exist_ok=True)
    with OUT_RISK.open("w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"))
    print(f"  Written: {OUT_RISK}  ({OUT_RISK.stat().st_size // 1024} KB)")

    # ── Write report ───────────────────────────────────────────────────────
    report = "\n".join(out_lines)
    with OUT_REPORT.open("w", encoding="utf-8") as f:
        f.write(report)
    print(f"  Report: {OUT_REPORT}")

    # Print to console too
    print("\n" + report)


if __name__ == "__main__":
    main()

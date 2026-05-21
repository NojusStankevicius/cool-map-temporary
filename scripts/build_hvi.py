"""
Build Heat Vulnerability Index (HVI) at PC4 level from CBS PC6 data.

Outputs: data/processed/hvi_pc4.geojson

HVI components (equal weight after 0-1 normalisation):
  1. pct_elderly       – % residents aged 65+
  2. pct_single        – % single-person households (social isolation proxy)
  3. pct_benefits      – % residents on social benefits (income proxy)
  4. pct_pre1945       – % housing built before 1945 (insulation proxy)
  5. pct_rental        – % rental housing (lower agency over home conditions)
"""

from __future__ import annotations

import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CBS_GPKG = ROOT / "data/raw/2025-cbs_pc6_2024_v1/cbs_pc6_2024_v1.gpkg"
OUT_PATH = ROOT / "data/processed/hvi_pc4.geojson"

SENTINEL = -99990  # CBS uses -99997 / -99995 for suppressed values

# Amsterdam postcodes: 1000AA–1109ZZ (first 4 digits 1000–1109)
AMS_PC4 = {str(i) for i in range(1000, 1110)}


def main() -> None:
    print("Loading CBS PC6 …")
    gdf = gpd.read_file(CBS_GPKG)

    # Filter to Amsterdam
    gdf["pc4"] = gdf["postcode6"].str[:4]
    ams = gdf[gdf["pc4"].isin(AMS_PC4)].copy()
    print(f"  Amsterdam PC6 rows: {len(ams)}")

    # Replace sentinels with NaN
    int_cols = [c for c in ams.columns if ams[c].dtype in (np.int32, np.int64, np.float64) and c != "pc4"]
    for col in int_cols:
        ams.loc[ams[col] < SENTINEL, col] = np.nan

    # ── Compute per-PC6 component scores ──────────────────────────────────────

    def safe_pct(num: str, denom: str) -> pd.Series:
        n = ams[num].where(ams[num] >= 0)
        d = ams[denom].where(ams[denom] > 0)
        return (n / d).clip(0, 1)

    ams["pct_elderly"]  = safe_pct("aantal_inwoners_65_jaar_en_ouder", "aantal_inwoners")
    ams["pct_single"]   = safe_pct("aantal_eenpersoonshuishoudens", "aantal_part_huishoudens")
    ams["pct_benefits"] = safe_pct("aantal_personen_met_uitkering_onder_aowlft", "aantal_inwoners")
    ams["pct_pre1945"]  = safe_pct("aantal_woningen_bouwjaar_voor_1945", "aantal_woningen")

    # percentage_huurwoningen is already a percentage (0-100); normalise to 0-1
    ams["pct_rental"] = ams["percentage_huurwoningen"].where(ams["percentage_huurwoningen"] >= 0) / 100

    # ── Aggregate to PC4 ──────────────────────────────────────────────────────
    print("Dissolving to PC4 …")

    component_cols = ["pct_elderly", "pct_single", "pct_benefits", "pct_pre1945", "pct_rental"]
    pop_col = "aantal_inwoners"

    # Population-weighted mean per PC4
    def weighted_mean(group: gpd.GeoDataFrame, col: str) -> float:
        mask = group[col].notna() & group[pop_col].notna() & (group[pop_col] > 0)
        sub = group[mask]
        if sub.empty:
            return np.nan
        weights = sub[pop_col].astype(float)
        return float((sub[col] * weights).sum() / weights.sum())

    rows = []
    geoms = []
    for pc4, group in ams.groupby("pc4"):
        row: dict = {"pc4": pc4}
        # Sum population for the PC4
        pop = group[pop_col].where(group[pop_col] >= 0).sum()
        row["population"] = int(pop) if not np.isnan(pop) else 0
        for col in component_cols:
            row[col] = round(weighted_mean(group, col), 4) if weighted_mean(group, col) is not np.nan else None
        rows.append(row)
        geoms.append(group.geometry.union_all())

    pc4_gdf = gpd.GeoDataFrame(rows, geometry=geoms, crs=ams.crs)

    # ── Normalise each component 0-1 across PC4s ─────────────────────────────
    for col in component_cols:
        mn = pc4_gdf[col].min()
        mx = pc4_gdf[col].max()
        span = mx - mn if mx != mn else 1.0
        pc4_gdf[col + "_norm"] = ((pc4_gdf[col] - mn) / span).round(4)

    norm_cols = [c + "_norm" for c in component_cols]
    pc4_gdf["hvi"] = pc4_gdf[norm_cols].mean(axis=1).round(4)

    print(f"  PC4 zones produced: {len(pc4_gdf)}")
    print(f"  HVI range: {pc4_gdf['hvi'].min():.3f} – {pc4_gdf['hvi'].max():.3f}")

    # ── Reproject to WGS84 and export ────────────────────────────────────────
    pc4_wgs = pc4_gdf.to_crs(epsg=4326)

    # Build GeoJSON manually to keep column order tidy
    features = []
    for _, row in pc4_wgs.iterrows():
        if row.geometry is None or row.geometry.is_empty:
            continue
        props = {
            "pc4": row["pc4"],
            "population": row["population"],
            "hvi": row["hvi"],
            "pct_elderly":  row["pct_elderly"],
            "pct_single":   row["pct_single"],
            "pct_benefits": row["pct_benefits"],
            "pct_pre1945":  row["pct_pre1945"],
            "pct_rental":   row["pct_rental"],
        }
        # Replace NaN with None for JSON serialisation
        props = {k: (None if isinstance(v, float) and np.isnan(v) else v) for k, v in props.items()}
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": row.geometry.__geo_interface__,
        })

    fc = {"type": "FeatureCollection", "features": features}
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(fc, f, separators=(",", ":"))

    print(f"Written: {OUT_PATH}  ({OUT_PATH.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

from __future__ import annotations

import csv
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request


from functools import lru_cache
from pathlib import Path
from typing import Any

from flask import Blueprint, jsonify, request

from coolmap.config import RAW_DIR, DATA_DIR
from coolmap.geo import filter_feature_collection, geometry_bounds, haversine_distance, parse_bbox, point_in_bbox

bp = Blueprint("api", __name__, url_prefix="/api")

_WEATHER_CACHE: dict[str, dict[str, Any]] = {}
WEATHER_CACHE_SECONDS = 600


def _load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=8)
def _cached_raw(name: str) -> Any:
    return _load_json(RAW_DIR / name)


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def _to_bool(value: Any) -> bool | None:
    text = str(value or "").strip().lower()

    if text in {"", "unknown", "onbekend", "n/a", "na", "null", "none", "-"}:
        return None

    if text in {"yes", "y", "true", "1", "ja", "j"}:
        return True

    if text in {"no", "n", "false", "0", "nee"}:
        return False

    # Useful for values like "4", "available", "yes - during summer", etc.
    return True


def _to_float(value: Any) -> float | None:
    text = str(value or "").strip().replace(",", ".")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)

        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel

        return list(csv.DictReader(f, dialect=dialect))


def _load_koelteplekken() -> Any:
    """
    Reads the client-editable CSV and returns GeoJSON for the website.

    Fallback: if the CSV is missing, use the old JSON file so the website
    does not immediately break.
    """
    csv_path = DATA_DIR / "koelteplekken.csv"
    json_path = DATA_DIR / "koelteplekken.json"

    if not csv_path.exists():
        return _load_json(json_path)

    features = []

    for row in _read_csv(csv_path):
        name = _clean(row.get("name"))
        if not name:
            continue

        lat = _to_float(row.get("latitude") or row.get("lat"))
        lon = _to_float(row.get("longitude") or row.get("lon") or row.get("lng"))

        # A map pin cannot be shown without coordinates.
        if lat is None or lon is None:
            continue

        properties = {
            "id": _clean(row.get("id")) or _slugify(name),
            "name": name,
            "type": _clean(row.get("type")),
            "municipality": _clean(row.get("municipality")) or "Amsterdam",
            "district": _clean(row.get("district") or row.get("stadsdeel")),
            "neighborhood": _clean(row.get("neighborhood") or row.get("wijk")),
            "address": _clean(row.get("address")),
            "website_url": _clean(row.get("website_url")),
            "hours_note": _clean(row.get("hours_note") or row.get("note")),
            "notes": _clean(row.get("notes") or row.get("description")),

            # active: false = greyed out on map (temporarily unavailable). Defaults to true if omitted.
            "active": _to_bool(row.get("active")) if row.get("active", "").strip() else True,

            # These names match the existing app.js filters and detail chips.
            "ac": _to_bool(row.get("ac") or row.get("airco")),
            "seating": _to_bool(row.get("seating")),
            "toilets": _to_bool(row.get("toilets")),
            "free_water": _to_bool(row.get("free_water")),
            "free_fruit": _to_bool(row.get("free_fruit")),
            "food_to_buy": _to_bool(row.get("food_to_buy")),
            "own_food_allowed": _to_bool(row.get("own_food_allowed") or row.get("own_food_ok")),
            "supervisor": _to_bool(row.get("supervisor")),
            "wheelchair": _to_bool(row.get("wheelchair") or row.get("accessible")),
            "games": _to_bool(row.get("games")),
            "pets_allowed": _to_bool(row.get("pets_allowed") or row.get("pets_ok")),
        }

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat],
            },
            "properties": properties,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }



@bp.route("/health")
def health():
    return jsonify({"status": "ok", "service": "cool-map-amsterdam"})

@bp.get("/weather")
def weather():
    locatie = (request.args.get("locatie") or "Amsterdam").strip() or "Amsterdam"

    # The frontend currently only asks for Amsterdam.
    # Open-Meteo needs coordinates, not city names.
    latitude = 52.3676
    longitude = 4.9041

    cache_key = f"openmeteo:{locatie.lower()}"
    now = time.time()

    cached = _WEATHER_CACHE.get(cache_key)
    if cached and now - cached["timestamp"] < WEATHER_CACHE_SECONDS:
        return jsonify(cached["data"])

    params = urllib.parse.urlencode({
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code",
        "timezone": "Europe/Amsterdam",
    })

    url = f"https://api.open-meteo.com/v1/forecast?{params}"

    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        return jsonify({
            "error": "weather_provider_unreachable",
            "message": str(exc),
        }), 502

    if request.args.get("debug") == "1":
        return jsonify(payload)

    current = payload.get("current") or {}

    data = {
        "place": locatie,
        "temperature": current.get("temperature_2m"),
        "feels_like": current.get("apparent_temperature"),
        "humidity": current.get("relative_humidity_2m"),
        "summary": "Actueel weer",
        "observed_at": current.get("time"),
        "source": "Open-Meteo",
    }

    _WEATHER_CACHE[cache_key] = {
        "timestamp": now,
        "data": data,
    }

    return jsonify(data)

    locatie = (request.args.get("locatie") or "Amsterdam").strip() or "Amsterdam"
    cache_key = locatie.lower()
    now = time.time()

    cached = _WEATHER_CACHE.get(cache_key)
    if cached and now - cached["timestamp"] < WEATHER_CACHE_SECONDS:
        return jsonify(cached["data"])

    api_key = os.environ.get("WEERLIVE_KEY")
    if not api_key:
        return jsonify({
            "error": "missing_api_key",
            "message": "Missing WEERLIVE_KEY environment variable",
        }), 500

    params = urllib.parse.urlencode({
        "key": api_key,
        "locatie": locatie,
    })

    url = f"https://weerlive.nl/api/weerlive_api_v2.php?{params}"

    try:
        with urllib.request.urlopen(url, timeout=8) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        return jsonify({
            "error": "weather_provider_unreachable",
            "message": str(exc),
        }), 502
    if request.args.get("debug") == "1":
        return jsonify(payload)


    live_items = payload.get("liveweer") or []
    if not live_items:
        return jsonify({
            "error": "no_weather_data",
            "message": "No live weather data returned",
            "raw": payload,
        }), 502

    live = live_items[0]

    data = {
        "place": live.get("plaats"),
        "temperature": live.get("temp"),
        "feels_like": live.get("gtemp"),
        "humidity": live.get("lv"),
        "summary": live.get("samenv"),
        "observed_at": live.get("time"),
        "source": "KNMI Weergegevens via Weerlive.nl",
    }

    _WEATHER_CACHE[cache_key] = {
        "timestamp": now,
        "data": data,
    }

    return jsonify(data)

@bp.route("/v1/meta/layers")
def meta_layers():
    koelte = _load_koelteplekken()
    parks  = _cached_raw("parks.json")
    water  = _cached_raw("water_taps.geojson")
    return jsonify({
        "version": "1",
        "layers": [
            {
                "id": "koelteplekken",
                "title": "Koelteplekken (cooling shelters)",
                "geometry_type": "Point",
                "endpoint": "/api/v1/geojson/koelteplekken",
                "feature_count": len(koelte.get("features", [])),
                "source": "GGD Amsterdam partner data",
                "filters": ["ac", "wheelchair", "free_water", "games", "pets_allowed"],
            },
            {
                "id": "parks",
                "title": "Parks & green spaces",
                "geometry_type": "Polygon",
                "endpoint": "/api/v1/geojson/parks",
                "feature_count_approx": len(parks.get("features", [])),
            },
            {
                "id": "water_taps",
                "title": "Drinking water taps",
                "geometry_type": "Point",
                "endpoint": "/api/v1/geojson/water-taps",
                "feature_count_approx": len(water.get("features", [])),
                "source": "Waternet open data",
            },
        ],
        "nearest": "/api/v1/nearest",
    })


def _bbox_or_400():
    raw = request.args.get("bbox")
    if not raw:
        return None, None
    try:
        return parse_bbox(raw), None
    except ValueError as e:
        return None, (jsonify({"error": "bad_request", "message": str(e)}), 400)


@bp.route("/v1/geojson/koelteplekken")
def geojson_koelteplekken():
    bbox, err = _bbox_or_400()
    if err:
        return err
    fc = _load_koelteplekken()

    # Optional boolean filters
    filter_keys = ["ac", "wheelchair", "free_water", "games", "pets_allowed"]
    active = {k: True for k in filter_keys if request.args.get(k) == "true"}
    if active:
        def passes(f: dict) -> bool:
            p = f.get("properties") or {}
            return all(p.get(k) is True for k in active)
        fc = {**fc, "features": [f for f in fc.get("features", []) if passes(f)]}

    if bbox:
        fc = filter_feature_collection(fc, bbox)
    return jsonify(fc)


@bp.route("/v1/geojson/parks")
def geojson_parks():
    bbox, err = _bbox_or_400()
    if err:
        return err
    fc = _cached_raw("parks.json")
    if bbox:
        fc = filter_feature_collection(fc, bbox)
    return jsonify(fc)


@bp.route("/v1/geojson/water-taps")
def geojson_water_taps():
    bbox, err = _bbox_or_400()
    if err:
        return err
    fc = _cached_raw("water_taps.geojson")
    if bbox:
        fc = filter_feature_collection(fc, bbox)
    return jsonify(fc)


@bp.route("/v1/nearest")
def nearest_resources():
    """Find nearest resources to a point.

    Query params: lat, lon (required); layers=koelteplekken,water_taps,parks; limit=3
    """
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "bad_request", "message": "lat and lon required"}), 400

    limit = min(max(request.args.get("limit", 3, type=int), 1), 50)
    layers_param = request.args.get("layers", "koelteplekken,water_taps")
    layers = {l.strip() for l in layers_param.split(",")}

    results: list[dict] = []

    if "koelteplekken" in layers:
        for f in _load_koelteplekken().get("features", []):
            coords = (f.get("geometry") or {}).get("coordinates") or []
            if len(coords) >= 2:
                results.append({
                    "type": "koelteplaats",
                    "distance_km": round(haversine_distance(lat, lon, coords[1], coords[0]), 2),
                    "feature": f,
                })

    if "water_taps" in layers:
        for f in _cached_raw("water_taps.geojson").get("features", []):
            coords = (f.get("geometry") or {}).get("coordinates") or []
            if len(coords) >= 2:
                results.append({
                    "type": "water_tap",
                    "distance_km": round(haversine_distance(lat, lon, coords[1], coords[0]), 2),
                    "feature": f,
                })

    if "parks" in layers:
        for f in _cached_raw("parks.json").get("features", []):
            geom = f.get("geometry") or {}
            if geom.get("type") in ("Polygon", "MultiPolygon"):
                try:
                    min_lon, min_lat, max_lon, max_lat = geometry_bounds(geom)
                    results.append({
                        "type": "park",
                        "distance_km": round(haversine_distance(lat, lon, (min_lat + max_lat) / 2, (min_lon + max_lon) / 2), 2),
                        "feature": f,
                    })
                except (ValueError, TypeError):
                    continue

    results.sort(key=lambda x: x["distance_km"])

    by_type: dict[str, list] = {}
    for r in results:
        bucket = by_type.setdefault(r["type"], [])
        if len(bucket) < limit:
            bucket.append(r)

    final = sorted([r for bucket in by_type.values() for r in bucket], key=lambda x: x["distance_km"])
    return jsonify({"query": {"lat": lat, "lon": lon}, "count": len(final), "results": final})

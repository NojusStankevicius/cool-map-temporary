from pathlib import Path
import csv
import re

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS


from coolmap.blueprints.api import bp as api_bp

def make_id(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean_bool(value):
    """
    Turns client-friendly spreadsheet values into true / false / null.

    yes, ja, true, 1  -> True
    no, nee, false, 0 -> False
    blank             -> None
    """
    if value is None:
        return None

    text = str(value).strip().lower()

    if text == "":
        return None

    if text in ["yes", "ja", "true", "1", "y", "j"]:
        return True

    if text in ["no", "nee", "false", "0", "n"]:
        return False

    return None


def read_koelteplekken_csv(csv_path: Path):
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(2048)
        f.seek(0)

        try:
            dialect = csv.Sniffer().sniff(sample, delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel

        reader = csv.DictReader(f, dialect=dialect)

        features = []

        for row in reader:
            name = (row.get("name") or "").strip()
            if not name:
                continue

            lat_raw = (row.get("latitude") or "").strip()
            lon_raw = (row.get("longitude") or "").strip()

            if not lat_raw or not lon_raw:
                continue

            lat = float(lat_raw.replace(",", "."))
            lon = float(lon_raw.replace(",", "."))

            properties = {
                "id": make_id(row.get("id") or name),
                "name": name,
                "type": (row.get("type") or "").strip(),
                "municipality": "Amsterdam",
                "district": (row.get("stadsdeel") or "").strip(),
                "neighborhood": (row.get("wijk") or "").strip(),
                "address": (row.get("address") or "").strip(),
                "website_url": (row.get("website_url") or "").strip(),
                "hours_note": (row.get("hours_note") or row.get("note") or "").strip(),
                "notes": (row.get("notes") or "").strip(),

                # active: false = greyed out on map (temporarily unavailable). Defaults to true if omitted.
                "active": clean_bool(row.get("active")) if (row.get("active") or "").strip() else True,

                # These names match the existing app.js amenity keys
                "ac": clean_bool(row.get("airco")),
                "seating": clean_bool(row.get("seating")),
                "toilets": clean_bool(row.get("toilets")),
                "free_water": clean_bool(row.get("free_water")),
                "free_fruit": clean_bool(row.get("free_fruit")),
                "food_to_buy": clean_bool(row.get("food_to_buy")),
                "own_food_allowed": clean_bool(row.get("own_food_allowed")),
                "supervisor": clean_bool(row.get("supervisor")),
                "wheelchair": clean_bool(row.get("accessible")),
                "games": clean_bool(row.get("games")),
                "pets_allowed": clean_bool(row.get("pets_ok")),
            }

            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [lon, lat],
                },
                "properties": properties,
            }

            features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def create_app() -> Flask:
    root = Path(__file__).resolve().parents[2]
    frontend_dir = root / "frontend"

    app = Flask(
        __name__,
        static_folder=str(frontend_dir),
        static_url_path="",
    )
    app.config["JSON_SORT_KEYS"] = False
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.route("/policy")
    @app.route("/policy/")
    def policy():
        return send_from_directory(app.static_folder, "policy/index.html")

    data_dir = root / "data"

    @app.route("/data/<path:filename>")
    def serve_data(filename):
        return send_from_directory(str(data_dir), filename)
    
    @app.get("/api/koelteplekken")
    def api_koelteplekken():
        import json
        json_path = root / "data" / "koelteplekken.json"
        if json_path.exists():
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        csv_path = root / "data" / "seed" / "koelteplekken.csv"
        return jsonify(read_koelteplekken_csv(csv_path))


    return app

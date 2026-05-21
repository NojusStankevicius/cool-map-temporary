# Cool Map Amsterdam - API Reference

## Overview

The Cool Map API provides geospatial data for cooling locations and related resources in Amsterdam. All responses are in GeoJSON or JSON format.

Base URL: `http://localhost:5000/api`

---

## Core Endpoints

### Health Check
**GET `/v1/health`**

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "service": "cool-map-amsterdam"
}
```

---

### Metadata
**GET `/v1/meta/layers`**

Get information about available data layers and API capabilities.

**Response:**
```json
{
  "version": "1",
  "layers": [
    {
      "id": "trees",
      "title": "Trees (shade)",
      "geometry_type": "Point",
      "endpoint": "/api/v1/geojson/trees",
      "feature_count_approx": 62000,
      "bbox_required": true,
      "notes": "Large dataset; always send a map bbox."
    },
    {
      "id": "parks",
      "title": "Parks & green spaces",
      "geometry_type": "Polygon",
      "endpoint": "/api/v1/geojson/parks",
      "feature_count_approx": 450,
      "bbox_optional": true
    },
    {
      "id": "social_services",
      "title": "Social services (cool spaces context)",
      "geometry_type": "Point",
      "endpoint": "/api/v1/geojson/social-services",
      "feature_count_approx": 1200,
      "bbox_optional": true,
      "filters": ["domein"]
    },
    {
      "id": "water_taps",
      "title": "Water taps (drinking water)",
      "geometry_type": "Point",
      "endpoint": "/api/v1/geojson/water-taps",
      "feature_count_approx": 554,
      "bbox_optional": true
    },
    {
      "id": "cool_locations",
      "title": "Curated cool locations (decision-ready)",
      "geometry_type": "Point",
      "endpoint": "/api/v1/locations",
      "feature_count_approx": 30,
      "bbox_optional": true,
      "filters": ["category"]
    }
  ],
  "guidance": "/api/v1/guidance/heat-safety",
  "tools": {
    "nearest": "/api/v1/nearest"
  }
}
```

---

## Data Endpoints

### GeoJSON Layers

#### Trees
**GET `/v1/geojson/trees`**

Get tree locations with shade information.

**Query Parameters:**
- `bbox` (optional): "minLon,minLat,maxLon,maxLat" - Filter to bounding box
- `limit` (optional): Sample top N trees (1-2000)

**Note:** Either bbox or limit required due to large dataset size (62k+ features)

**Response:** GeoJSON FeatureCollection

**Example:**
```
GET /v1/geojson/trees?bbox=4.8,52.3,4.9,52.4
```

---

#### Parks
**GET `/v1/geojson/parks`**

Get park and green space boundaries.

**Query Parameters:**
- `bbox` (optional): "minLon,minLat,maxLon,maxLat" - Filter to bounding box

**Response:** GeoJSON FeatureCollection with Polygon geometries

**Example:**
```
GET /v1/geojson/parks?bbox=4.8,52.3,4.9,52.4
```

---

#### Social Services
**GET `/v1/geojson/social-services`**

Get community centers, care facilities, and social services.

**Query Parameters:**
- `bbox` (optional): "minLon,minLat,maxLon,maxLat" - Filter to bounding box
- `domein` (optional): Filter by service type
  - "Jeugd en Zorg"
  - "Sport en Spelen"
  - "Onderwijs"
  - "Kunst en Cultuur"
  - "Basisvoorzieningen"

**Response:** GeoJSON FeatureCollection

**Examples:**
```
GET /v1/geojson/social-services
GET /v1/geojson/social-services?domein=Sport%20en%20Spelen
GET /v1/geojson/social-services?bbox=4.8,52.3,4.9,52.4
```

---

#### Water Taps
**GET `/v1/geojson/water-taps`**

Get drinking water tap locations.

**Query Parameters:**
- `bbox` (optional): "minLon,minLat,maxLon,maxLat" - Filter to bounding box

**Response:** GeoJSON FeatureCollection

**Properties include:**
- `Dichtstbijzijnde adres binnen 100 meter` - Nearest street address
- `Status` - Operational status
- `Type afnamepunt` - Type of tap
- `District` - Amsterdam district
- `Eigenaar` - Owner

**Example:**
```
GET /v1/geojson/water-taps?bbox=4.8,52.3,4.9,52.4
```

---

### Location Data

#### All Cool Locations
**GET `/v1/locations`**

Get curated cool locations (indoor and outdoor).

**Query Parameters:**
- `bbox` (optional): "minLon,minLat,maxLon,maxLat" - Filter to bounding box
- `category` (optional): Filter by category
  - "indoor_library"
  - "indoor_museum"
  - "indoor_swimming"
  - "outdoor_park"
  - etc.

**Response:**
```json
{
  "type": "LocationList",
  "count": 5,
  "locations": [
    {
      "id": "unique-id",
      "name": "Location Name",
      "category": "indoor_library",
      "geometry": {
        "type": "Point",
        "coordinates": [4.912, 52.384]
      },
      "address": {
        "street": "Street Name",
        "postcode": "1018 AW",
        "city": "Amsterdam"
      },
      "opening_hours": {
        "timezone": "Europe/Amsterdam",
        "summary": "Description",
        "url": "https://..."
      },
      "accessibility": {
        "wheelchair": true,
        "elevator": true,
        "quiet_zone": true,
        "stroller_friendly": true
      },
      "price": {
        "type": "free",
        "detail": "Public library services"
      },
      "tags": ["quiet", "family_friendly"],
      "notes": "Additional information"
    }
  ]
}
```

---

#### Specific Cool Location
**GET `/v1/locations/<loc_id>`**

Get details for a specific location.

**Response:** Single location object (see above)

**Example:**
```
GET /v1/locations/centrale-bibliotheek-oba-oba
```

---

## Tools

### Nearest Resources
**GET `/v1/nearest`**

Find nearest resources to a given location.

**Query Parameters (required):**
- `lat` (float): Latitude
- `lon` (float): Longitude
- `layers` (string, optional, default: "water_taps,cool_locations"): 
  Comma-separated list: water_taps, cool_locations, parks, trees, social_services
- `limit` (integer, optional, default: 3, max: 50): Maximum results per layer type

**Response:**
```json
{
  "query": {
    "lat": 52.37,
    "lon": 4.895
  },
  "results": [
    {
      "type": "water_tap",
      "distance_km": 0.15,
      "feature": {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [...]},
        "properties": {...}
      }
    },
    {
      "type": "cool_location",
      "distance_km": 0.32,
      "feature": {...}
    }
  ],
  "count": 2
}
```

**Examples:**
```
GET /v1/nearest?lat=52.37&lon=4.895
GET /v1/nearest?lat=52.37&lon=4.895&layers=water_taps,parks&limit=5
GET /v1/nearest?lat=52.37&lon=4.895&layers=cool_locations&limit=10
```

---

### Guidance
**GET `/v1/guidance/heat-safety`**

Get heat-safety guidance and information.

**Response:**
```json
{
  "title": "Heat Safety Guidance",
  "recommendations": [...],
  "resources": [...],
  ...
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | Status | Meaning |
|------|--------|---------|
| `bad_request` | 400 | Invalid query parameters |
| `not_found` | 404 | Resource not found |
| `not_implemented` | 501 | Feature not yet implemented |

### Examples

**Invalid bbox format:**
```
GET /v1/geojson/parks?bbox=invalid
→ 400 {"error": "bad_request", "message": "bbox values must be numbers"}
```

**Missing required parameter:**
```
GET /v1/nearest?lat=52.37
→ 400 {"error": "bad_request", "message": "lat and lon required"}
```

---

## Bounding Box Format

The `bbox` parameter format is: `minLon,minLat,maxLon,maxLat`

Example for Amsterdam city center:
```
bbox=4.85,52.35,4.95,52.40
```

Bounds must satisfy: `minLon < maxLon` and `minLat < maxLat`

---

## Distance Calculation

The API uses the Haversine formula for distance calculations:
- Accurate to ~0.5%
- Returns distances in kilometers
- Earth radius: 6,371 km

---

## Rate Limiting

Currently no rate limiting. Recommended client behavior:
- Cache responses where possible
- Use bounding boxes to limit data transfer
- Batch requests when practical

---

## CORS

All endpoints are enabled for CORS (Cross-Origin Resource Sharing) via flask-cors.

---

## Examples

### JavaScript / Fetch

```javascript
// Get nearby resources
async function findNearby(lat, lon) {
  const url = `/api/v1/nearest?lat=${lat}&lon=${lon}&limit=3`;
  const response = await fetch(url);
  const data = await response.json();
  console.log(data.results);
}

// Get parks in area
async function getParks() {
  const bbox = "4.85,52.35,4.95,52.40";
  const url = `/api/v1/geojson/parks?bbox=${bbox}`;
  const response = await fetch(url);
  const geojson = await response.json();
  // Use with Leaflet.js: L.geoJSON(geojson).addTo(map);
}
```

### cURL

```bash
# Health check
curl http://localhost:5000/api/v1/health

# Get metadata
curl http://localhost:5000/api/v1/meta/layers

# Get nearby water taps
curl "http://localhost:5000/api/v1/nearest?lat=52.37&lon=4.895&layers=water_taps&limit=3"

# Get parks in area
curl "http://localhost:5000/api/v1/geojson/parks?bbox=4.85,52.35,4.95,52.40"
```

---

## Future Enhancements

- [ ] Heat stress raster layer endpoint
- [ ] Real-time facility status
- [ ] Route planning endpoint
- [ ] User contribution endpoints
- [ ] Authentication for contributions
- [ ] Detailed accessibility scoring

---

*API Version: 1.0*
*Last Updated: April 2, 2026*

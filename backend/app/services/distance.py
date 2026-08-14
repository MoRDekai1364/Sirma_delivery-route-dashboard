import math
import requests

BULGARIA_BOUNDS = {"lon_min": 22.3, "lon_max": 28.6, "lat_min": 41.2, "lat_max": 44.2}
OSRM_BASE_URL = "http://router.project-osrm.org"
OSRM_TIMEOUT = 8


def euclidean_distance(x1, y1, x2, y2):
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)


def xy_to_lonlat(x, y):
    lon = BULGARIA_BOUNDS["lon_min"] + (x / 100) * (BULGARIA_BOUNDS["lon_max"] - BULGARIA_BOUNDS["lon_min"])
    lat = BULGARIA_BOUNDS["lat_min"] + (y / 100) * (BULGARIA_BOUNDS["lat_max"] - BULGARIA_BOUNDS["lat_min"])
    return lon, lat


def build_euclidean_matrix(points):
    n = len(points)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = euclidean_distance(
                    points[i][0], points[i][1],
                    points[j][0], points[j][1]
                )
    return matrix


def fetch_osrm_matrix(points):
    if len(points) < 2:
        return None

    try:
        lonlats = [xy_to_lonlat(x, y) for x, y in points]
        coords = ";".join(f"{lon:.6f},{lat:.6f}" for lon, lat in lonlats)
        url = f"{OSRM_BASE_URL}/table/v1/driving/{coords}?annotations=distance"

        response = requests.get(url, timeout=OSRM_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            return None

        raw_distances = data.get("distances")
        if raw_distances is None:
            return None

        n = len(points)
        matrix = [[0.0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                if i == j:
                    continue
                value = raw_distances[i][j]
                if value is None:
                    return None
                matrix[i][j] = value / 1000.0

        return matrix
    except Exception:
        return None


def build_distance_matrix(points):
    matrix = fetch_osrm_matrix(points)
    if matrix is not None:
        return matrix
    return build_euclidean_matrix(points)


def fetch_osrm_route_geometry(points):
    if len(points) < 2:
        return None

    try:
        lonlats = [xy_to_lonlat(x, y) for x, y in points]
        coords = ";".join(f"{lon:.6f},{lat:.6f}" for lon, lat in lonlats)
        url = f"{OSRM_BASE_URL}/route/v1/driving/{coords}?overview=full&geometries=geojson"

        response = requests.get(url, timeout=OSRM_TIMEOUT)
        response.raise_for_status()
        data = response.json()

        if data.get("code") != "Ok":
            return None

        routes = data.get("routes")
        if not routes:
            return None

        coordinates = routes[0]["geometry"]["coordinates"]
        return [[lat, lon] for lon, lat in coordinates]
    except Exception:
        return None


def real_distance(x1, y1, x2, y2):
    matrix = build_distance_matrix([(x1, y1), (x2, y2)])
    return matrix[0][1]

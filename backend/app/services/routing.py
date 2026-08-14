from services.distance import build_distance_matrix, fetch_osrm_route_geometry
from services.vehicle_types import VEHICLE_CHARACTERISTICS
import math


def _nearest_neighbor_indices(matrix, n):
    unvisited = list(range(1, n))
    route = []
    current = 0
    while unvisited:
        nearest = min(unvisited, key=lambda i: matrix[current][i])
        route.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    return route


def _route_distance_indices(matrix, route_indices):
    if not route_indices:
        return 0.0
    total = matrix[0][route_indices[0]]
    for i in range(len(route_indices) - 1):
        total += matrix[route_indices[i]][route_indices[i + 1]]
    total += matrix[route_indices[-1]][0]
    return total


def _turn_angle(p1, p2, p3):
    v1 = (p2[0] - p1[0], p2[1] - p1[1])
    v2 = (p3[0] - p2[0], p3[1] - p2[1])
    len1 = math.hypot(*v1)
    len2 = math.hypot(*v2)
    if len1 == 0 or len2 == 0:
        return 180.0
    dot = v1[0] * v2[0] + v1[1] * v2[1]
    cos_angle = max(-1.0, min(1.0, dot / (len1 * len2)))
    return math.degrees(math.acos(cos_angle))


def _turn_penalty(points, route_indices, turn_penalty_weight):
    if turn_penalty_weight == 0 or len(route_indices) < 2:
        return 0.0

    full_indices = [0] + route_indices + [0]
    penalty = 0.0

    for i in range(1, len(full_indices) - 1):
        p1 = points[full_indices[i - 1]]
        p2 = points[full_indices[i]]
        p3 = points[full_indices[i + 1]]
        turn_amount = 180.0 - _turn_angle(p1, p2, p3)
        if turn_amount > 45.0:
            penalty += (turn_amount - 45.0) * turn_penalty_weight

    return penalty


def _route_cost_indices(matrix, points, route_indices, turn_penalty_weight):
    return _route_distance_indices(matrix, route_indices) + _turn_penalty(points, route_indices, turn_penalty_weight)


def _two_opt_indices(matrix, points, route_indices, turn_penalty_weight):
    if len(route_indices) < 3:
        return route_indices

    best_route = route_indices[:]
    best_cost = _route_cost_indices(matrix, points, best_route, turn_penalty_weight)
    improved = True

    while improved:
        improved = False
        for i in range(len(best_route) - 1):
            for j in range(i + 1, len(best_route)):
                new_route = best_route[:i] + best_route[i:j + 1][::-1] + best_route[j + 1:]
                new_cost = _route_cost_indices(matrix, points, new_route, turn_penalty_weight)
                if new_cost < best_cost:
                    best_route = new_route
                    best_cost = new_cost
                    improved = True

    return best_route


def build_vehicle_route(depot, orders, vehicle_type="van"):
    if not orders:
        return [], 0.0

    characteristics = VEHICLE_CHARACTERISTICS.get(vehicle_type, VEHICLE_CHARACTERISTICS["van"])
    turn_penalty_weight = characteristics["turn_penalty_weight"]

    points = [depot] + [(o.x, o.y) for o in orders]
    matrix = build_distance_matrix(points)

    initial_indices = _nearest_neighbor_indices(matrix, len(points))
    optimized_indices = _two_opt_indices(matrix, points, initial_indices, turn_penalty_weight)

    ordered_stops = [orders[i - 1] for i in optimized_indices]
    total_distance = _route_distance_indices(matrix, optimized_indices)
    return ordered_stops, total_distance


def route_distance(depot, route):
    if not route:
        return 0.0

    points = [depot] + [(o.x, o.y) for o in route]
    matrix = build_distance_matrix(points)
    indices = list(range(1, len(points)))
    return _route_distance_indices(matrix, indices)


def get_route_geometry(depot, ordered_stops):
    if not ordered_stops:
        return None

    points = [depot] + [(o.x, o.y) for o in ordered_stops] + [depot]
    return fetch_osrm_route_geometry(points)
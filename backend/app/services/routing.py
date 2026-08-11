from services.distance import euclidean_distance


def nearest_neighbor_route(depot, orders):
    if not orders:
        return []

    unvisited = list(orders)
    route = []
    current_x, current_y = depot

    while unvisited:
        nearest = min(
            unvisited,
            key=lambda o: euclidean_distance(current_x, current_y, o.x, o.y)
        )
        route.append(nearest)
        unvisited.remove(nearest)
        current_x, current_y = nearest.x, nearest.y

    return route


def route_distance(depot, route):
    if not route:
        return 0.0

    total = euclidean_distance(depot[0], depot[1], route[0].x, route[0].y)
    for i in range(len(route) - 1):
        total += euclidean_distance(route[i].x, route[i].y, route[i + 1].x, route[i + 1].y)
    total += euclidean_distance(route[-1].x, route[-1].y, depot[0], depot[1])
    return total


def two_opt(depot, route):
    if len(route) < 3:
        return route

    best_route = route[:]
    best_distance = route_distance(depot, best_route)
    improved = True

    while improved:
        improved = False
        for i in range(len(best_route) - 1):
            for j in range(i + 1, len(best_route)):
                new_route = best_route[:i] + best_route[i:j + 1][::-1] + best_route[j + 1:]
                new_distance = route_distance(depot, new_route)
                if new_distance < best_distance:
                    best_route = new_route
                    best_distance = new_distance
                    improved = True

    return best_route


def build_vehicle_route(depot, orders):
    initial = nearest_neighbor_route(depot, orders)
    optimized = two_opt(depot, initial)
    return optimized, route_distance(depot, optimized)

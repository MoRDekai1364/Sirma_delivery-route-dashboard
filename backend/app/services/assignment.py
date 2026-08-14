from services.distance import build_distance_matrix


def assign_orders_to_vehicles(orders, vehicles):
    assignments = {vehicle.id: [] for vehicle in vehicles}
    remaining_capacity = {vehicle.id: vehicle.capacity for vehicle in vehicles}
    unserved = []

    if not orders or not vehicles:
        return assignments, list(orders)

    n_vehicles = len(vehicles)
    points = [(v.depot_x, v.depot_y) for v in vehicles] + [(o.x, o.y) for o in orders]
    matrix = build_distance_matrix(points)

    def vehicle_order_distance(v_idx, o_idx):
        return matrix[v_idx][n_vehicles + o_idx]

    sorted_order_indices = sorted(
        range(len(orders)),
        key=lambda oi: min(vehicle_order_distance(vi, oi) for vi in range(n_vehicles))
    )

    for oi in sorted_order_indices:
        order = orders[oi]
        best_vehicle = None
        best_distance = None

        for vi, vehicle in enumerate(vehicles):
            if not vehicle.active:
                continue
            if remaining_capacity[vehicle.id] < order.volume:
                continue

            dist = vehicle_order_distance(vi, oi)
            if best_distance is None or dist < best_distance:
                best_distance = dist
                best_vehicle = vehicle

        if best_vehicle is not None:
            assignments[best_vehicle.id].append(order)
            remaining_capacity[best_vehicle.id] -= order.volume
        else:
            unserved.append(order)

    return assignments, unserved

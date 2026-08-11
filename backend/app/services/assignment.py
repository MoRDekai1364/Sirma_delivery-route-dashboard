from services.distance import euclidean_distance


def assign_orders_to_vehicles(orders, vehicles):
    assignments = {vehicle.id: [] for vehicle in vehicles}
    remaining_capacity = {vehicle.id: vehicle.capacity for vehicle in vehicles}
    unserved = []

    sorted_orders = sorted(
        orders,
        key=lambda o: min(
            euclidean_distance(o.x, o.y, v.depot_x, v.depot_y) for v in vehicles
        ) if vehicles else 0
    )

    for order in sorted_orders:
        best_vehicle = None
        best_distance = None

        for vehicle in vehicles:
            if not vehicle.active:
                continue
            if remaining_capacity[vehicle.id] < order.volume:
                continue

            dist = euclidean_distance(order.x, order.y, vehicle.depot_x, vehicle.depot_y)
            if best_distance is None or dist < best_distance:
                best_distance = dist
                best_vehicle = vehicle

        if best_vehicle is not None:
            assignments[best_vehicle.id].append(order)
            remaining_capacity[best_vehicle.id] -= order.volume
        else:
            unserved.append(order)

    return assignments, unserved

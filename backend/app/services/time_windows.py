from datetime import datetime, date, timedelta
from services.distance import real_distance

VEHICLE_SPEED = 5.0


def travel_minutes(x1, y1, x2, y2, speed_multiplier=1.0):
    dist = real_distance(x1, y1, x2, y2)
    return dist / (VEHICLE_SPEED * speed_multiplier)


def enforce_time_windows(depot, ordered_stops, work_start, speed_multiplier=1.0):
    if not ordered_stops:
        return [], []

    reference_date = date.today()
    current_time = datetime.combine(reference_date, work_start) if work_start else datetime.combine(reference_date, datetime.min.time())
    current_x, current_y = depot

    feasible = []
    infeasible = []

    for order in ordered_stops:
        travel = travel_minutes(current_x, current_y, order.x, order.y, speed_multiplier)
        arrival = current_time + timedelta(minutes=travel)

        window_start = order.time_window_start
        window_end = order.time_window_end

        if window_start:
            window_start_dt = datetime.combine(reference_date, window_start)
            if arrival < window_start_dt:
                arrival = window_start_dt

        if window_end:
            window_end_dt = datetime.combine(reference_date, window_end)
            if arrival > window_end_dt:
                infeasible.append(order)
                continue

        feasible.append(order)
        current_time = arrival
        current_x, current_y = order.x, order.y

    return feasible, infeasible
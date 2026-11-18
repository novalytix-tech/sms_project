import uuid
from datetime import date, time, datetime
from decimal import Decimal
from flask import g, Blueprint, request, jsonify
from app.auth import ANY_MEMBER, role_required
from app.utils.tenant import ensure_same_tenant
from app.extensions import db
from app.models import (
    TransportRoute, TransportStop, TransportVehicle,
    TransportAllocation, TransportTrip, TransportTelemetryLog
)
from app.utils.tenant import get_current_tenant_id
from app.utils.errors import APIException

transport_bp = Blueprint("transport", __name__, url_prefix="/transport")


# -------------------------------------------------------------
# 1. Routes & Stops
# -------------------------------------------------------------

@transport_bp.route("/routes", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_routes():
    institution_id = get_current_tenant_id()
    query = TransportRoute.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    routes = query.order_by(TransportRoute.route_name.asc()).all()
    data = [
        {
            "id": str(r.id),
            "route_name": r.route_name,
            "route_code": r.route_code,
            "start_point": r.start_point,
            "end_point": r.end_point,
            "fare_amount": float(r.fare_amount),
            "stops": [
                {
                    "id": str(s.id),
                    "stop_name": s.stop_name,
                    "sequence_order": s.sequence_order,
                    "pickup_time": s.pickup_time.strftime("%H:%M"),
                    "drop_time": s.drop_time.strftime("%H:%M"),
                    "latitude": float(s.latitude),
                    "longitude": float(s.longitude),
                }
                for s in sorted(r.stops, key=lambda x: x.sequence_order)
            ]
        }
        for r in routes
    ]
    return jsonify({"success": True, "data": data}), 200


@transport_bp.route("/vehicles", methods=["GET"])
@role_required(*ANY_MEMBER)
def list_vehicles():
    institution_id = get_current_tenant_id()
    query = TransportVehicle.query
    if institution_id:
        query = query.filter_by(institution_id=institution_id)

    vehicles = query.all()
    data = [
        {
            "id": str(v.id),
            "vehicle_number": v.vehicle_number,
            "capacity": v.capacity,
            "insurance_number": v.insurance_number,
            "fitness_valid_until": v.fitness_valid_until.isoformat(),
            "driver_name": f"{v.driver.first_name} {v.driver.last_name}".strip() if v.driver else None,
            "driver_phone": v.driver.phone if v.driver else None,
            "gps_device_imei": v.gps_device_imei,
            "current_lat": float(v.current_lat) if v.current_lat is not None else None,
            "current_lng": float(v.current_lng) if v.current_lng is not None else None,
        }
        for v in vehicles
    ]
    return jsonify({"success": True, "data": data}), 200


@transport_bp.route("/trips/active", methods=["GET"])
@role_required(*ANY_MEMBER)
def get_active_trips():
    trips = TransportTrip.query.filter_by(status="IN_TRANSIT").all()
    data = [
        {
            "id": str(t.id),
            "trip_type": t.trip_type,
            "status": t.status,
            "start_time": t.start_time.isoformat() if t.start_time else None,
            "route_name": t.route.route_name if t.route else None,
            "vehicle_number": t.vehicle.vehicle_number if t.vehicle else None,
            "current_lat": float(t.vehicle.current_lat) if t.vehicle and t.vehicle.current_lat else None,
            "current_lng": float(t.vehicle.current_lng) if t.vehicle and t.vehicle.current_lng else None,
        }
        for t in trips
    ]
    return jsonify({"success": True, "data": data}), 200

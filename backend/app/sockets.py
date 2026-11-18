import logging
from flask import request
from flask_socketio import emit, join_room, leave_room
from app.extensions import socketio

logger = logging.getLogger("socketio")


@socketio.on("connect")
def handle_connect():
    logger.info(f"Client connected: {request.sid}")
    emit("connected", {"status": "connected", "sid": request.sid})


@socketio.on("disconnect")
def handle_disconnect():
    logger.info(f"Client disconnected: {request.sid}")


@socketio.on("join_institution")
def handle_join_institution(data):
    institution_id = data.get("institution_id")
    if institution_id:
        room = f"institution_{institution_id}"
        join_room(room)
        logger.info(f"Socket {request.sid} joined room {room}")
        emit("joined", {"room": room})


@socketio.on("gps_update")
def handle_gps_telemetry(data):
    """Broadcast real-time bus GPS coordinates to parent tracking views."""
    institution_id = data.get("institution_id")
    room = f"institution_{institution_id}" if institution_id else None
    if room:
        emit("bus_location_update", data, to=room)
    else:
        emit("bus_location_update", data, broadcast=True)


@socketio.on("attendance_update")
def handle_attendance_event(data):
    """Broadcast daily attendance events to dashboard metrics."""
    institution_id = data.get("institution_id")
    room = f"institution_{institution_id}" if institution_id else None
    if room:
        emit("attendance_recorded", data, to=room)
    else:
        emit("attendance_recorded", data, broadcast=True)


@socketio.on("notice_broadcast")
def handle_notice_event(data):
    """Broadcast high priority circulars and notice alerts."""
    institution_id = data.get("institution_id")
    room = f"institution_{institution_id}" if institution_id else None
    if room:
        emit("new_notice_published", data, to=room)
    else:
        emit("new_notice_published", data, broadcast=True)


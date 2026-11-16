from flask import Blueprint, g, jsonify, request

from ..models import ServiceRecord, Appointment
from ..utils.auth import login_required

bp = Blueprint("records", __name__, url_prefix="/api/service-records")


@bp.get("")
@login_required
def list_records():
    query = ServiceRecord.query.join(Appointment, ServiceRecord.appointment_id == Appointment.id)
    if g.user.role != "admin":
        query = query.filter(Appointment.user_id == g.user.id)
    vehicle_id = request.args.get("vehicle_id", type=int)
    if vehicle_id:
        query = query.filter(ServiceRecord.vehicle_id == vehicle_id)
    rows = query.order_by(ServiceRecord.service_date.desc()).all()
    return jsonify(records=[r.to_dict() for r in rows])

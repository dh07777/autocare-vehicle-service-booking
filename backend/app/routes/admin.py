from datetime import date

from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import (
    Appointment, Technician, TechnicianAssignment, User, Vehicle, Service,
    STATUSES, INACTIVE_STATUSES, BILLING_STATUSES,
)
from ..utils import stats
from ..utils.auth import admin_required
from ..utils.billing import sync_billing
from ..utils.helpers import ApiError, get_json, text, fail, parse_date, parse_number, check_phone, to_int

bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@bp.get("/dashboard")
@admin_required
def dashboard():
    recent = Appointment.query.order_by(Appointment.created_at.desc()).limit(6).all()
    return jsonify(
        totals={
            "customers": User.query.filter_by(role="customer").count(),
            "vehicles": Vehicle.query.count(),
            "appointments": Appointment.query.count(),
            "pending": Appointment.query.filter_by(status="Pending").count(),
            "completed": Appointment.query.filter(Appointment.status.in_(BILLING_STATUSES)).count(),
            "revenue": stats.total_revenue(),
        },
        appointment_statistics=stats.status_breakdown(),
        revenue_chart=stats.monthly_revenue(6),
        recent_bookings=[a.to_dict() for a in recent],
    )


@bp.get("/customers")
@admin_required
def customers():
    query = User.query.filter_by(role="customer")
    q = request.args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like), User.phone.ilike(like)))
    result = []
    for user in query.order_by(User.created_at.desc()).all():
        d = user.to_dict()
        d["vehicle_count"], d["booking_count"] = len(user.vehicles), len(user.appointments)
        result.append(d)
    return jsonify(customers=result)


@bp.get("/customers/<int:user_id>")
@admin_required
def customer_detail(user_id):
    user = db.session.get(User, user_id)
    if not user or user.role != "customer":
        raise ApiError("Customer not found.", 404)
    return jsonify(
        customer=user.to_dict(),
        vehicles=[v.to_dict() for v in user.vehicles],
        appointments=[a.to_dict() for a in sorted(user.appointments, key=lambda a: a.appointment_date, reverse=True)],
    )


@bp.put("/customers/<int:user_id>")
@admin_required
def update_customer(user_id):
    """Manage accounts: edit name/phone and activate or deactivate."""
    user = db.session.get(User, user_id)
    if not user or user.role != "customer":
        raise ApiError("Customer not found.", 404)
    data = get_json()
    errors = {}
    if "name" in data:
        if len(text(data, "name")) < 2:
            errors["name"] = "Enter a name."
        else:
            user.name = text(data, "name")
    if "phone" in data:
        check_phone(text(data, "phone"), errors)
        if "phone" not in errors:
            user.phone = text(data, "phone")
    fail(errors)
    if "is_active" in data:
        user.is_active_account = bool(data["is_active"])
    db.session.commit()
    return jsonify(customer=user.to_dict())


@bp.get("/vehicles")
@admin_required
def vehicles():
    query = Vehicle.query.join(User)
    q = request.args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(Vehicle.reg_number.ilike(like), Vehicle.brand.ilike(like), Vehicle.model.ilike(like), User.name.ilike(like)))
    return jsonify(vehicles=[v.to_dict(with_owner=True) for v in query.order_by(Vehicle.created_at.desc()).all()])


@bp.get("/appointments")
@admin_required
def appointments():
    query = Appointment.query
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)
    q = request.args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.join(User, Appointment.user_id == User.id).join(Vehicle, Appointment.vehicle_id == Vehicle.id).filter(
            db.or_(Appointment.booking_id.ilike(like), User.name.ilike(like), Vehicle.reg_number.ilike(like))
        )
    rows = query.order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc()).all()
    return jsonify(appointments=[a.to_dict() for a in rows])


def apply_update(appt):
    data = get_json()
    errors = {}
    if appt.status == "Cancelled":
        raise ApiError("Cancelled bookings cannot be changed.", 409)
    status = data.get("status")
    if status is not None and status not in STATUSES:
        errors["status"] = "Unknown status."
    if "completion_date" in data and data["completion_date"]:
        appt.completion_date = parse_date(data["completion_date"], "completion_date", errors) or appt.completion_date
    charges = parts = None
    if data.get("charges") not in (None, ""):
        charges = parse_number(data["charges"], "charges", errors, 0)
    if data.get("parts_charges") not in (None, ""):
        parts = parse_number(data["parts_charges"], "parts_charges", errors, 0)
    fail(errors)

    if status:
        appt.status = status
    if "admin_notes" in data:
        appt.admin_notes = text(data, "admin_notes")[:2000]
    if charges is not None:
        appt.charges = charges
    if parts is not None:
        appt.parts_charges = parts
    if appt.status in BILLING_STATUSES:
        sync_billing(appt)
    db.session.commit()
    return jsonify(appointment=appt.to_dict())


def load_appointment(appointment_id):
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        raise ApiError("Appointment not found.", 404)
    return appt


@bp.put("/appointments/<int:appointment_id>/status")
@admin_required
def update_status(appointment_id):
    return apply_update(load_appointment(appointment_id))


@bp.put("/appointments/<int:appointment_id>")
@admin_required
def update_details(appointment_id):
    return apply_update(load_appointment(appointment_id))


@bp.post("/appointments/<int:appointment_id>/assign-technician")
@admin_required
def assign_technician(appointment_id):
    appt = load_appointment(appointment_id)
    if appt.status in INACTIVE_STATUSES:
        raise ApiError("Cannot assign a technician to a cancelled or rejected booking.", 409)
    data = get_json()
    tech = db.session.get(Technician, to_int(data.get("technician_id")) or 0)
    if not tech or not tech.is_active:
        raise ApiError("Select an active technician.", 422, {"technician_id": "Select an active technician."})
    if appt.assignment:
        appt.assignment.technician_id = tech.id
    else:
        db.session.add(TechnicianAssignment(appointment_id=appt.id, technician_id=tech.id))
    if appt.service_record:
        appt.service_record.technician_id = tech.id
    db.session.commit()
    db.session.refresh(appt)
    return jsonify(appointment=appt.to_dict(), message=f"Assigned to {tech.name}.")

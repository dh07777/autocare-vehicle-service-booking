from datetime import date, datetime

from flask import Blueprint, current_app, g, jsonify, request

from ..extensions import db
from ..models import Appointment, Vehicle, Service, INACTIVE_STATUSES, CANCELLABLE_STATUSES
from ..utils.auth import login_required, customer_required
from ..utils.helpers import ApiError, get_json, text, fail, parse_date, random_code, to_int

bp = Blueprint("appointments", __name__, url_prefix="/api/appointments")


def slot_taken_count(day, slot, ignore_id=None):
    query = Appointment.query.filter(
        Appointment.appointment_date == day,
        Appointment.time_slot == slot,
        ~Appointment.status.in_(INACTIVE_STATUSES),
    )
    if ignore_id:
        query = query.filter(Appointment.id != ignore_id)
    return query.count()


def slot_in_past(day, slot):
    return datetime.combine(day, datetime.strptime(slot, "%H:%M").time()) <= datetime.now()


def validate_slot(day, slot, errors, ignore_id=None):
    if slot not in current_app.config["TIME_SLOTS"]:
        errors["time_slot"] = "Choose one of the available time slots."
    elif day and slot_in_past(day, slot):
        errors["appointment_date"] = "Choose a date and time in the future."
    elif day and slot_taken_count(day, slot, ignore_id) >= current_app.config["SLOT_CAPACITY"]:
        errors["time_slot"] = "That time slot is already booked. Please pick another."


def get_accessible_appointment(appointment_id):
    appt = db.session.get(Appointment, appointment_id)
    if not appt:
        raise ApiError("Appointment not found.", 404)
    if g.user.role != "admin" and appt.user_id != g.user.id:
        raise ApiError("You do not have access to this appointment.", 403)
    return appt


@bp.get("/slots")
@login_required
def available_slots():
    errors = {}
    day = parse_date(request.args.get("date"), "date", errors)
    fail(errors)
    capacity = current_app.config["SLOT_CAPACITY"]
    slots = []
    for slot in current_app.config["TIME_SLOTS"]:
        free = not slot_in_past(day, slot) and slot_taken_count(day, slot) < capacity
        slots.append({"time": slot, "available": free})
    return jsonify(date=day.isoformat(), slots=slots)


@bp.get("")
@login_required
def list_appointments():
    query = Appointment.query
    if g.user.role != "admin":
        query = query.filter_by(user_id=g.user.id)
    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)
    q = request.args.get("q", "").strip()
    if q:
        query = query.filter(Appointment.booking_id.ilike(f"%{q}%"))
    rows = query.order_by(Appointment.appointment_date.desc(), Appointment.time_slot.desc()).all()
    return jsonify(appointments=[a.to_dict() for a in rows])


@bp.post("")
@customer_required
def create_appointment():
    data = get_json()
    errors = {}
    vehicle = db.session.get(Vehicle, to_int(data.get("vehicle_id")) or 0)
    service = db.session.get(Service, to_int(data.get("service_id")) or 0)
    if not vehicle:
        errors["vehicle_id"] = "Select one of your vehicles."
    elif vehicle.user_id != g.user.id:
        raise ApiError("You can only book services for your own vehicles.", 403)
    if not service or not service.is_active:
        errors["service_id"] = "Select a service."
    day = parse_date(data.get("appointment_date"), "appointment_date", errors)
    if day and day < date.today():
        errors["appointment_date"] = "Choose today or a future date."
    slot = text(data, "time_slot")
    if "appointment_date" not in errors:
        validate_slot(day, slot, errors)
    if vehicle and day and "appointment_date" not in errors:
        same_day = Appointment.query.filter(
            Appointment.vehicle_id == vehicle.id,
            Appointment.appointment_date == day,
            ~Appointment.status.in_(INACTIVE_STATUSES),
        ).first()
        if same_day:
            errors["vehicle_id"] = "This vehicle already has a booking on that date."
    notes = text(data, "notes")
    if len(notes) > 1000:
        errors["notes"] = "Notes must be 1000 characters or fewer."
    fail(errors)

    booking_id = random_code("AC", 4)
    while Appointment.query.filter_by(booking_id=booking_id).first():
        booking_id = random_code("AC", 4)
    appt = Appointment(
        booking_id=booking_id,
        user_id=g.user.id,
        vehicle_id=vehicle.id,
        service_id=service.id,
        appointment_date=day,
        time_slot=slot,
        notes=notes,
        status="Pending",
        charges=service.price,
    )
    db.session.add(appt)
    db.session.commit()
    return jsonify(appointment=appt.to_dict()), 201


@bp.get("/<int:appointment_id>")
@login_required
def get_appointment(appointment_id):
    return jsonify(appointment=get_accessible_appointment(appointment_id).to_dict())


@bp.put("/<int:appointment_id>")
@customer_required
def update_appointment(appointment_id):
    """Customers may reschedule or edit notes while a booking is still Pending."""
    appt = get_accessible_appointment(appointment_id)
    if appt.status != "Pending":
        raise ApiError("Only pending bookings can be edited.", 409)
    data = get_json()
    errors = {}
    day = parse_date(data.get("appointment_date", appt.appointment_date.isoformat()), "appointment_date", errors)
    slot = text(data, "time_slot") or appt.time_slot
    if day and day < date.today():
        errors["appointment_date"] = "Choose today or a future date."
    if "appointment_date" not in errors:
        validate_slot(day, slot, errors, ignore_id=appt.id)
    fail(errors)
    appt.appointment_date, appt.time_slot = day, slot
    if "notes" in data:
        appt.notes = text(data, "notes")[:1000]
    db.session.commit()
    return jsonify(appointment=appt.to_dict())


@bp.delete("/<int:appointment_id>")
@login_required
def cancel_appointment(appointment_id):
    appt = get_accessible_appointment(appointment_id)
    if appt.status not in CANCELLABLE_STATUSES:
        raise ApiError("This booking can no longer be cancelled because work has started or it is closed.", 409)
    appt.status = "Cancelled"
    db.session.commit()
    return jsonify(appointment=appt.to_dict(), message="Booking cancelled.")

from datetime import date

from flask import Blueprint, g, jsonify, request

from ..extensions import db
from ..models import Vehicle, User, Appointment, INACTIVE_STATUSES
from ..utils.auth import login_required, customer_required
from ..utils.helpers import ApiError, get_json, text, fail, REG_RE

bp = Blueprint("vehicles", __name__, url_prefix="/api/vehicles")

FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"]
VEHICLE_TYPES = ["Hatchback", "Sedan", "SUV", "Truck", "Van", "Motorcycle", "Other"]


def validate_vehicle(data, existing_id=None):
    reg = text(data, "reg_number").upper()
    brand, model = text(data, "brand"), text(data, "model")
    fuel, vtype = text(data, "fuel_type"), text(data, "vehicle_type")
    errors = {}
    if not REG_RE.match(reg):
        errors["reg_number"] = "Enter a valid registration number (4-20 letters, numbers, spaces or dashes)."
    else:
        clash = Vehicle.query.filter(Vehicle.reg_number == reg, Vehicle.id != (existing_id or 0)).first()
        if clash:
            errors["reg_number"] = "This registration number is already registered."
    if not brand:
        errors["brand"] = "Brand is required."
    if not model:
        errors["model"] = "Model is required."
    try:
        year = int(data.get("year"))
        if year < 1980 or year > date.today().year + 1:
            raise ValueError
    except (TypeError, ValueError):
        year = None
        errors["year"] = f"Enter a year between 1980 and {date.today().year + 1}."
    if fuel not in FUEL_TYPES:
        errors["fuel_type"] = "Choose a fuel type."
    if vtype not in VEHICLE_TYPES:
        errors["vehicle_type"] = "Choose a vehicle type."
    fail(errors)
    return dict(reg_number=reg, brand=brand, model=model, year=year, fuel_type=fuel, vehicle_type=vtype)


def get_accessible_vehicle(vehicle_id):
    vehicle = db.session.get(Vehicle, vehicle_id)
    if not vehicle:
        raise ApiError("Vehicle not found.", 404)
    if g.user.role != "admin" and vehicle.user_id != g.user.id:
        raise ApiError("You do not have access to this vehicle.", 403)  # invalid vehicle ownership
    return vehicle


@bp.get("")
@login_required
def list_vehicles():
    query = Vehicle.query
    if g.user.role != "admin":
        query = query.filter_by(user_id=g.user.id)
    q = request.args.get("q", "").strip()
    if q:
        like = f"%{q}%"
        query = query.join(User).filter(db.or_(Vehicle.reg_number.ilike(like), Vehicle.brand.ilike(like), Vehicle.model.ilike(like), User.name.ilike(like)))
    vehicles = query.order_by(Vehicle.created_at.desc()).all()
    return jsonify(vehicles=[v.to_dict(with_owner=True) for v in vehicles])


@bp.post("")
@customer_required
def create_vehicle():
    values = validate_vehicle(get_json())
    vehicle = Vehicle(user_id=g.user.id, **values)
    db.session.add(vehicle)
    db.session.commit()
    return jsonify(vehicle=vehicle.to_dict()), 201


@bp.get("/<int:vehicle_id>")
@login_required
def get_vehicle(vehicle_id):
    vehicle = get_accessible_vehicle(vehicle_id)
    data = vehicle.to_dict(with_owner=True)
    data["appointment_count"] = len(vehicle.appointments)
    return jsonify(vehicle=data)


@bp.put("/<int:vehicle_id>")
@customer_required
def update_vehicle(vehicle_id):
    vehicle = get_accessible_vehicle(vehicle_id)
    for key, value in validate_vehicle(get_json(), vehicle.id).items():
        setattr(vehicle, key, value)
    db.session.commit()
    return jsonify(vehicle=vehicle.to_dict())


@bp.delete("/<int:vehicle_id>")
@customer_required
def delete_vehicle(vehicle_id):
    vehicle = get_accessible_vehicle(vehicle_id)
    live = [a for a in vehicle.appointments if a.status not in INACTIVE_STATUSES]
    if live:
        raise ApiError("This vehicle has bookings or service history, so it cannot be deleted.", 409)
    for appt in list(vehicle.appointments):  # only cancelled/rejected bookings remain
        db.session.delete(appt)
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify(message="Vehicle deleted.")


@bp.get("/options")
def options():
    return jsonify(fuel_types=FUEL_TYPES, vehicle_types=VEHICLE_TYPES)

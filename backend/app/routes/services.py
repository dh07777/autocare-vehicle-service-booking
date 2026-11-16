from flask import Blueprint, jsonify, request

from ..extensions import db
from ..models import Service
from ..utils.auth import admin_required, current_user
from ..utils.helpers import ApiError, get_json, text, fail, parse_number

bp = Blueprint("services", __name__, url_prefix="/api/services")


def validate_service(data, existing_id=None):
    name, description = text(data, "name"), text(data, "description")
    errors = {}
    if len(name) < 3:
        errors["name"] = "Service name must be at least 3 characters."
    elif Service.query.filter(Service.name.ilike(name), Service.id != (existing_id or 0)).first():
        errors["name"] = "A service with this name already exists."
    if len(description) < 5:
        errors["description"] = "Add a short description."
    price = parse_number(data.get("price"), "price", errors, 0)
    duration = parse_number(data.get("duration_minutes"), "duration_minutes", errors, 5, integer=True)
    fail(errors)
    return dict(name=name, description=description, price=price, duration_minutes=duration)


@bp.get("")
def list_services():
    query = Service.query
    user = current_user()
    show_all = request.args.get("all") == "1" and user and user.role == "admin"
    if not show_all:
        query = query.filter_by(is_active=True)
    return jsonify(services=[s.to_dict() for s in query.order_by(Service.name).all()])


@bp.post("")
@admin_required
def create_service():
    service = Service(**validate_service(get_json()))
    db.session.add(service)
    db.session.commit()
    return jsonify(service=service.to_dict()), 201


@bp.put("/<int:service_id>")
@admin_required
def update_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        raise ApiError("Service not found.", 404)
    data = get_json()
    for key, value in validate_service(data, service.id).items():
        setattr(service, key, value)
    if "is_active" in data:
        service.is_active = bool(data["is_active"])
    db.session.commit()
    return jsonify(service=service.to_dict())


@bp.delete("/<int:service_id>")
@admin_required
def delete_service(service_id):
    service = db.session.get(Service, service_id)
    if not service:
        raise ApiError("Service not found.", 404)
    if service.appointments:  # keep history intact: archive instead of deleting
        service.is_active = False
        db.session.commit()
        return jsonify(message="This service has bookings, so it was archived instead of deleted.", archived=True)
    db.session.delete(service)
    db.session.commit()
    return jsonify(message="Service deleted.", archived=False)

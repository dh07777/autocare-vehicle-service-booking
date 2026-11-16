from flask import Blueprint, jsonify

from ..extensions import db
from ..models import Technician, TechnicianAssignment
from ..utils.auth import admin_required
from ..utils.helpers import ApiError, get_json, text, fail, check_email, check_phone

bp = Blueprint("technicians", __name__, url_prefix="/api/technicians")


def validate_tech(data, existing_id=None):
    name, email, phone, spec = text(data, "name"), text(data, "email").lower(), text(data, "phone"), text(data, "specialization")
    errors = {}
    if len(name) < 2:
        errors["name"] = "Enter the technician's name."
    check_email(email, errors)
    check_phone(phone, errors)
    if not spec:
        errors["specialization"] = "Specialization is required."
    if "email" not in errors and Technician.query.filter(Technician.email == email, Technician.id != (existing_id or 0)).first():
        errors["email"] = "A technician with this email already exists."
    fail(errors)
    return dict(name=name, email=email, phone=phone, specialization=spec)


def get_tech(tech_id):
    tech = db.session.get(Technician, tech_id)
    if not tech:
        raise ApiError("Technician not found.", 404)
    return tech


@bp.get("")
@admin_required
def list_technicians():
    return jsonify(technicians=[t.to_dict() for t in Technician.query.order_by(Technician.name).all()])


@bp.post("")
@admin_required
def create_technician():
    tech = Technician(**validate_tech(get_json()))
    db.session.add(tech)
    db.session.commit()
    return jsonify(technician=tech.to_dict()), 201


@bp.put("/<int:tech_id>")
@admin_required
def update_technician(tech_id):
    tech = get_tech(tech_id)
    data = get_json()
    for key, value in validate_tech(data, tech.id).items():
        setattr(tech, key, value)
    if "is_active" in data:
        tech.is_active = bool(data["is_active"])
    db.session.commit()
    return jsonify(technician=tech.to_dict())


@bp.delete("/<int:tech_id>")
@admin_required
def delete_technician(tech_id):
    tech = get_tech(tech_id)
    if tech.assignments:
        tech.is_active = False
        db.session.commit()
        return jsonify(message="This technician has past assignments, so they were deactivated instead of deleted.", archived=True)
    db.session.delete(tech)
    db.session.commit()
    return jsonify(message="Technician deleted.", archived=False)


@bp.get("/<int:tech_id>/assignments")
@admin_required
def technician_assignments(tech_id):
    tech = get_tech(tech_id)
    rows = TechnicianAssignment.query.filter_by(technician_id=tech.id).order_by(TechnicianAssignment.assigned_at.desc()).all()
    return jsonify(technician=tech.to_dict(), assignments=[r.appointment.to_dict() for r in rows])

from flask import Blueprint, jsonify

from ..extensions import db
from ..models import ContactMessage
from ..utils.helpers import get_json, text, fail, check_email

bp = Blueprint("contact", __name__, url_prefix="/api/contact")


@bp.post("")
def send_message():
    data = get_json()
    name, email, subject, message = text(data, "name"), text(data, "email"), text(data, "subject"), text(data, "message")
    errors = {}
    if len(name) < 2:
        errors["name"] = "Enter your name."
    check_email(email, errors)
    if len(subject) < 3:
        errors["subject"] = "Add a subject."
    if len(message) < 10:
        errors["message"] = "Message must be at least 10 characters."
    fail(errors)
    db.session.add(ContactMessage(name=name, email=email, subject=subject, message=message))
    db.session.commit()
    return jsonify(message="Thanks. We will reply within one business day."), 201

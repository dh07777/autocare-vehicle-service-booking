from flask import Blueprint, g, jsonify, session

from ..extensions import db, bcrypt
from ..models import User
from ..utils.auth import current_user, login_required
from ..utils.helpers import ApiError, get_json, text, fail, check_email, check_phone, check_password

bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@bp.post("/register")
def register():
    data = get_json()
    name, email, phone = text(data, "name"), text(data, "email").lower(), text(data, "phone")
    password, confirm = data.get("password") or "", data.get("confirm_password") or ""
    errors = {}
    if len(name) < 2:
        errors["name"] = "Enter your full name."
    check_email(email, errors)
    check_phone(phone, errors)
    check_password(password, errors)
    if "password" not in errors and password != confirm:
        errors["confirm_password"] = "Passwords do not match."
    if "email" not in errors and User.query.filter_by(email=email).first():
        errors["email"] = "An account with this email already exists."
    fail(errors)

    user = User(
        name=name,
        email=email,
        phone=phone,
        role="customer",
        password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
    )
    db.session.add(user)
    db.session.commit()
    session.clear()
    session["user_id"] = user.id
    session.permanent = True
    return jsonify(user=user.to_dict()), 201


@bp.post("/login")
def login():
    data = get_json()
    email, password = text(data, "email").lower(), data.get("password") or ""
    portal = data.get("portal", "customer")
    if not email or not password:
        raise ApiError("Email and password are required.", 400)
    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.check_password_hash(user.password_hash, password):
        raise ApiError("Incorrect email or password.", 401)
    if not user.is_active_account:
        raise ApiError("This account has been deactivated. Contact the workshop.", 403)
    if portal == "admin" and user.role != "admin":
        raise ApiError("This account does not have administrator access.", 403)
    if portal != "admin" and user.role == "admin":
        raise ApiError("Administrators must sign in from the admin login page.", 403)
    session.clear()
    session["user_id"] = user.id
    session.permanent = True
    return jsonify(user=user.to_dict())


@bp.post("/logout")
def logout():
    session.clear()
    return jsonify(message="Logged out.")


@bp.get("/me")
def me():
    user = current_user()
    if not user:
        raise ApiError("Not authenticated.", 401)
    return jsonify(user=user.to_dict())


@bp.put("/profile")
@login_required
def update_profile():
    data = get_json()
    name, email, phone = text(data, "name"), text(data, "email").lower(), text(data, "phone")
    errors = {}
    if len(name) < 2:
        errors["name"] = "Enter your full name."
    check_email(email, errors)
    check_phone(phone, errors)
    other = User.query.filter(User.email == email, User.id != g.user.id).first()
    if other:
        errors["email"] = "That email is already used by another account."
    fail(errors)
    g.user.name, g.user.email, g.user.phone = name, email, phone
    db.session.commit()
    return jsonify(user=g.user.to_dict())


@bp.put("/password")
@login_required
def change_password():
    data = get_json()
    current, new, confirm = data.get("current_password") or "", data.get("new_password") or "", data.get("confirm_password") or ""
    errors = {}
    if not bcrypt.check_password_hash(g.user.password_hash, current):
        errors["current_password"] = "Current password is incorrect."
    check_password(new, errors, "new_password")
    if "new_password" not in errors and new != confirm:
        errors["confirm_password"] = "Passwords do not match."
    fail(errors)
    g.user.password_hash = bcrypt.generate_password_hash(new).decode("utf-8")
    db.session.commit()
    return jsonify(message="Password updated.")

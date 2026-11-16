from functools import wraps

from flask import g, session

from ..extensions import db
from ..models import User
from .helpers import ApiError


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    user = db.session.get(User, user_id)
    if not user or not user.is_active_account:
        session.clear()
        return None
    return user


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = current_user()
        if not user:
            raise ApiError("Please log in to continue.", 401)
        g.user = user
        return fn(*args, **kwargs)

    return wrapper


def admin_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if g.user.role != "admin":
            raise ApiError("Administrator access required.", 403)
        return fn(*args, **kwargs)

    return wrapper


def customer_required(fn):
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if g.user.role != "customer":
            raise ApiError("This action is for customer accounts.", 403)
        return fn(*args, **kwargs)

    return wrapper

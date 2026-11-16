import re
import secrets
import string
from datetime import date, datetime

from flask import request


class ApiError(Exception):
    """Raise anywhere in a route to return a clean JSON error."""

    def __init__(self, message, status=400, errors=None):
        super().__init__(message)
        self.message = message
        self.status = status
        self.errors = errors


def get_json():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ApiError("Request body must be valid JSON.", 400)
    return data


def text(data, key):
    value = data.get(key)
    return value.strip() if isinstance(value, str) else ""


def fail(errors):
    """errors is a dict {field: message}. Raises when it is not empty."""
    if errors:
        raise ApiError("Please fix the highlighted fields.", 422, errors)


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PHONE_RE = re.compile(r"^\+?[0-9\s\-()]{7,15}$")
REG_RE = re.compile(r"^[A-Z0-9][A-Z0-9\- ]{2,18}[A-Z0-9]$")


def check_email(value, errors, key="email"):
    if not EMAIL_RE.match(value or ""):
        errors[key] = "Enter a valid email address."


def check_phone(value, errors, key="phone"):
    if not PHONE_RE.match(value or ""):
        errors[key] = "Enter a valid phone number (7-15 digits)."


def check_password(value, errors, key="password"):
    if not value or len(value) < 8 or not re.search(r"[A-Za-z]", value) or not re.search(r"\d", value):
        errors[key] = "Password must be at least 8 characters and include a letter and a number."


def parse_date(value, key, errors):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        errors[key] = "Use the format YYYY-MM-DD."
        return None


def parse_number(value, key, errors, minimum=0, integer=False):
    try:
        number = int(value) if integer else float(value)
    except (TypeError, ValueError):
        errors[key] = "Enter a valid number."
        return None
    if number < minimum:
        errors[key] = f"Must be at least {minimum}."
        return None
    return number


def random_code(prefix, length=5):
    alphabet = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(length))
    return f"{prefix}-{date.today():%y%m%d}-{suffix}"


def to_int(value):
    """Return int(value) or None when it is not a whole number."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

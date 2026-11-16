"""Aggregations used by the admin dashboard and the reports endpoints."""
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta

from ..models import Appointment, Payment, User, Service, INACTIVE_STATUSES, BILLING_STATUSES


def month_keys(n):
    today = date.today()
    keys = []
    for i in range(n - 1, -1, -1):
        year, month = today.year, today.month - i
        while month <= 0:
            month += 12
            year -= 1
        keys.append((year, month))
    return keys


def month_label(key):
    return datetime(key[0], key[1], 1).strftime("%b %Y")


def counted_appointments():
    return Appointment.query.filter(~Appointment.status.in_(INACTIVE_STATUSES)).all()


def monthly_appointments(n=6):
    counts = Counter((a.appointment_date.year, a.appointment_date.month) for a in counted_appointments())
    keys = month_keys(n)
    return {"labels": [month_label(k) for k in keys], "values": [counts.get(k, 0) for k in keys]}


def daily_appointments(days=14):
    counts = Counter(a.appointment_date for a in counted_appointments())
    today = date.today()
    ds = [today - timedelta(days=i) for i in range(days - 1, -1, -1)]
    return {"labels": [d.strftime("%b %d") for d in ds], "values": [counts.get(d, 0) for d in ds]}


def monthly_revenue(n=6):
    totals = defaultdict(float)
    for p in Payment.query.filter_by(status="Success").all():
        totals[(p.paid_at.year, p.paid_at.month)] += p.amount
    keys = month_keys(n)
    return {"labels": [month_label(k) for k in keys], "values": [round(totals.get(k, 0), 2) for k in keys]}


def popular_services(limit=8):
    counts = Counter(a.service.name for a in counted_appointments())
    top = counts.most_common(limit)
    return {"labels": [t[0] for t in top], "values": [t[1] for t in top]}


def status_breakdown():
    counts = Counter(a.status for a in Appointment.query.all())
    return {"labels": list(counts.keys()), "values": list(counts.values())}


def completion_summary():
    appts = Appointment.query.all()
    completed = sum(1 for a in appts if a.status in BILLING_STATUSES)
    pending = sum(1 for a in appts if a.status not in BILLING_STATUSES and a.status not in INACTIVE_STATUSES)
    return {"completed": completed, "pending": pending, "cancelled_or_rejected": sum(1 for a in appts if a.status in INACTIVE_STATUSES)}


def customer_stats():
    customers = User.query.filter_by(role="customer").all()
    first = date.today().replace(day=1)
    booking_counts = Counter(a.user_id for a in Appointment.query.all())
    return {
        "total": len(customers),
        "active": sum(1 for c in customers if c.is_active_account),
        "new_this_month": sum(1 for c in customers if c.created_at.date() >= first),
        "with_bookings": sum(1 for c in customers if booking_counts.get(c.id)),
        "repeat_customers": sum(1 for c in customers if booking_counts.get(c.id, 0) > 1),
    }


def total_revenue():
    return round(sum(p.amount for p in Payment.query.filter_by(status="Success").all()), 2)

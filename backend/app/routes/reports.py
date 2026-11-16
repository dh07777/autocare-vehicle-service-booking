from flask import Blueprint, jsonify

from ..utils import stats
from ..utils.auth import admin_required

bp = Blueprint("reports", __name__, url_prefix="/api/admin/reports")


@bp.get("")
@admin_required
def all_reports():
    return jsonify(
        daily_appointments=stats.daily_appointments(14),
        monthly_appointments=stats.monthly_appointments(6),
        monthly_revenue=stats.monthly_revenue(6),
        popular_services=stats.popular_services(),
        status_breakdown=stats.status_breakdown(),
        completion=stats.completion_summary(),
        customers=stats.customer_stats(),
        total_revenue=stats.total_revenue(),
    )


@bp.get("/revenue")
@admin_required
def revenue():
    return jsonify(monthly_revenue=stats.monthly_revenue(12), total_revenue=stats.total_revenue())


@bp.get("/appointments")
@admin_required
def appointments():
    return jsonify(
        daily=stats.daily_appointments(14),
        monthly=stats.monthly_appointments(12),
        completion=stats.completion_summary(),
        popular_services=stats.popular_services(),
    )

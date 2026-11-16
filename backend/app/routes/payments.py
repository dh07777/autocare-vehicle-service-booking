from io import BytesIO

from flask import Blueprint, g, jsonify, send_file
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..extensions import db
from ..models import Invoice, Payment
from ..utils.auth import login_required
from ..utils.helpers import ApiError, get_json, text, fail, random_code, to_int

bp = Blueprint("payments", __name__, url_prefix="/api")

METHODS = ["card", "upi", "netbanking", "cash"]


def get_accessible_invoice(invoice_id):
    invoice = db.session.get(Invoice, invoice_id)
    if not invoice:
        raise ApiError("Invoice not found.", 404)
    if g.user.role != "admin" and invoice.user_id != g.user.id:
        raise ApiError("You do not have access to this invoice.", 403)
    return invoice


@bp.get("/invoices")
@login_required
def list_invoices():
    query = Invoice.query
    if g.user.role != "admin":
        query = query.filter_by(user_id=g.user.id)
    return jsonify(invoices=[i.to_dict() for i in query.order_by(Invoice.created_at.desc()).all()])


@bp.get("/invoices/<int:invoice_id>")
@login_required
def get_invoice(invoice_id):
    return jsonify(invoice=get_accessible_invoice(invoice_id).to_dict())


@bp.get("/invoices/<int:invoice_id>/pdf")
@login_required
def invoice_pdf(invoice_id):
    inv = get_accessible_invoice(invoice_id).to_dict()
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=18 * mm)
    styles = getSampleStyleSheet()
    v = inv["vehicle"]
    money = lambda x: f"${x:,.2f}"
    story = [
        Paragraph("AutoCare Service Centre", styles["Title"]),
        Paragraph(f"Invoice {inv['invoice_number']} &nbsp;|&nbsp; Booking {inv['booking_id']}", styles["Heading3"]),
        Paragraph(f"Status: <b>{inv['status']}</b> &nbsp;|&nbsp; Issued: {inv['created_at'][:10]}", styles["Normal"]),
        Spacer(1, 8 * mm),
        Paragraph(f"<b>Billed to:</b> {inv['customer']['name']} ({inv['customer']['email']}, {inv['customer']['phone']})", styles["Normal"]),
        Paragraph(f"<b>Vehicle:</b> {v['brand']} {v['model']} ({v['year']}) - {v['reg_number']}", styles["Normal"]),
        Paragraph(f"<b>Service date:</b> {inv['service_date']}", styles["Normal"]),
        Spacer(1, 8 * mm),
    ]
    rows = [["Description", "Qty", "Amount"]] + [[i["description"], i["quantity"], money(i["amount"])] for i in inv["items"]]
    rows += [["", "Subtotal", money(inv["subtotal"])], ["", "Tax", money(inv["tax"])], ["", "Total", money(inv["total"])]]
    table = Table(rows, colWidths=[100 * mm, 25 * mm, 35 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2a37")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, len(inv["items"])), 0.4, colors.HexColor("#cbd5e1")),
        ("FONTNAME", (1, -1), (-1, -1), "Helvetica-Bold"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story += [table, Spacer(1, 8 * mm)]
    for p in inv["payments"]:
        story.append(Paragraph(f"Paid {money(p['amount'])} via {p['method']} on {p['paid_at'][:10]} (ref {p['transaction_ref']})", styles["Normal"]))
    story.append(Paragraph("Payments in this demo are simulated.", styles["Italic"]))
    doc.build(story)
    buffer.seek(0)
    return send_file(buffer, mimetype="application/pdf", as_attachment=True, download_name=f"{inv['invoice_number']}.pdf")


@bp.get("/payments")
@login_required
def list_payments():
    query = Payment.query
    if g.user.role != "admin":
        query = query.filter_by(user_id=g.user.id)
    return jsonify(payments=[p.to_dict() for p in query.order_by(Payment.paid_at.desc()).all()])


@bp.post("/payments")
@login_required
def make_payment():
    """Simulated payment: no real gateway. Only the card's last four digits are kept."""
    data = get_json()
    invoice = db.session.get(Invoice, to_int(data.get("invoice_id")) or 0)
    if not invoice:
        raise ApiError("Invoice not found.", 404)
    if g.user.role != "admin" and invoice.user_id != g.user.id:
        raise ApiError("You do not have access to this invoice.", 403)
    if invoice.status == "Paid":
        raise ApiError("This invoice is already paid.", 409)
    method = text(data, "method")
    errors = {}
    if method not in METHODS:
        errors["method"] = "Choose a payment method."
    if method == "card":
        digits = "".join(c for c in str(data.get("card_number", "")) if c.isdigit())
        if len(digits) < 12:
            errors["card_number"] = "Enter a valid card number (demo only: any 12-19 digits)."
    if method == "cash" and g.user.role != "admin":
        errors["method"] = "Cash payments are recorded by the workshop."
    fail(errors)
    payment = Payment(
        invoice_id=invoice.id,
        user_id=invoice.user_id,
        amount=invoice.total,
        method=method,
        status="Success",
        transaction_ref=random_code("TXN", 8),
    )
    invoice.status = "Paid"
    db.session.add(payment)
    db.session.commit()
    return jsonify(payment=payment.to_dict(), invoice=invoice.to_dict()), 201

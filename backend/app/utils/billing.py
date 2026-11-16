"""Invoice + service-record generation. Called whenever an appointment is completed or re-priced."""
import json
from datetime import date

from flask import current_app

from ..extensions import db
from ..models import Appointment, Invoice, ServiceRecord, BILLING_STATUSES
from .helpers import random_code


def sync_billing(appt: Appointment):
    """Create or refresh the invoice and service record for a completed appointment.
    Paid invoices are locked so recorded payments always match the invoice."""
    if appt.completion_date is None:
        appt.completion_date = date.today()

    items = [{"description": f"{appt.service.name} - service charge", "quantity": 1, "amount": round(appt.charges or 0, 2)}]
    if (appt.parts_charges or 0) > 0:
        items.append({"description": "Parts and materials", "quantity": 1, "amount": round(appt.parts_charges, 2)})
    subtotal = round(sum(i["amount"] for i in items), 2)
    tax = round(subtotal * current_app.config["TAX_RATE"], 2)
    total = round(subtotal + tax, 2)

    invoice = appt.invoice
    if invoice is None:
        invoice = Invoice(invoice_number=random_code("INV"), appointment=appt, user_id=appt.user_id)
        db.session.add(invoice)
    if invoice.status != "Paid":
        invoice.items_json = json.dumps(items)
        invoice.subtotal, invoice.tax, invoice.total = subtotal, tax, total

    record = appt.service_record
    if record is None:
        record = ServiceRecord(appointment=appt, vehicle_id=appt.vehicle_id, service_date=appt.completion_date)
        db.session.add(record)
    record.service_date = appt.completion_date
    record.total_cost = invoice.total
    record.technician_id = appt.assignment.technician_id if appt.assignment else None
    record.description = (appt.admin_notes or "").strip() or f"{appt.service.name} completed."
    return invoice


def needs_billing(status):
    return status in BILLING_STATUSES

import json
from datetime import datetime, timezone

from .extensions import db


def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    return value.isoformat() if value else None


STATUSES = [
    "Pending",
    "Booking Confirmed",
    "Vehicle Received",
    "Inspection",
    "Service in Progress",
    "Service Completed",
    "Delivered",
    "Rejected",
    "Cancelled",
]
TRACK_STEPS = STATUSES[1:7]
INACTIVE_STATUSES = {"Rejected", "Cancelled"}
BILLING_STATUSES = {"Service Completed", "Delivered"}
CANCELLABLE_STATUSES = {"Pending", "Booking Confirmed"}


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(20), nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="customer")
    is_active_account = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    vehicles = db.relationship("Vehicle", backref="owner", cascade="all, delete-orphan")
    appointments = db.relationship("Appointment", backref="customer", cascade="all, delete-orphan")

    def to_dict(self):  # password hash is never exposed
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "is_active": self.is_active_account,
            "created_at": iso(self.created_at),
        }


class Vehicle(db.Model):
    __tablename__ = "vehicles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    reg_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    brand = db.Column(db.String(60), nullable=False)
    model = db.Column(db.String(60), nullable=False)
    year = db.Column(db.Integer, nullable=False)
    fuel_type = db.Column(db.String(20), nullable=False)
    vehicle_type = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    appointments = db.relationship("Appointment", backref="vehicle")

    def to_dict(self, with_owner=False):
        d = {
            "id": self.id,
            "user_id": self.user_id,
            "reg_number": self.reg_number,
            "brand": self.brand,
            "model": self.model,
            "year": self.year,
            "fuel_type": self.fuel_type,
            "vehicle_type": self.vehicle_type,
            "created_at": iso(self.created_at),
        }
        if with_owner:
            d["owner"] = {"id": self.owner.id, "name": self.owner.name, "email": self.owner.email, "phone": self.owner.phone}
        return d


class Service(db.Model):
    __tablename__ = "services"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    price = db.Column(db.Float, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    appointments = db.relationship("Appointment", backref="service")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "price": self.price,
            "duration_minutes": self.duration_minutes,
            "is_active": self.is_active,
        }


class Technician(db.Model):
    __tablename__ = "technicians"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    specialization = db.Column(db.String(100), nullable=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    assignments = db.relationship("TechnicianAssignment", backref="technician")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "specialization": self.specialization,
            "is_active": self.is_active,
            "assignment_count": len(self.assignments),
        }


class Appointment(db.Model):
    __tablename__ = "appointments"
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.String(30), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=False)
    appointment_date = db.Column(db.Date, nullable=False, index=True)
    time_slot = db.Column(db.String(5), nullable=False)
    notes = db.Column(db.Text, default="")
    status = db.Column(db.String(30), nullable=False, default="Pending", index=True)
    admin_notes = db.Column(db.Text, default="")
    completion_date = db.Column(db.Date)
    charges = db.Column(db.Float, nullable=False, default=0)
    parts_charges = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    assignment = db.relationship("TechnicianAssignment", backref="appointment", uselist=False, cascade="all, delete-orphan")
    service_record = db.relationship("ServiceRecord", backref="appointment", uselist=False, cascade="all, delete-orphan")
    invoice = db.relationship("Invoice", backref="appointment", uselist=False, cascade="all, delete-orphan")

    @property
    def technician(self):
        return self.assignment.technician if self.assignment else None

    def to_dict(self):
        tech = self.technician
        return {
            "id": self.id,
            "booking_id": self.booking_id,
            "user_id": self.user_id,
            "vehicle_id": self.vehicle_id,
            "service_id": self.service_id,
            "appointment_date": iso(self.appointment_date),
            "time_slot": self.time_slot,
            "notes": self.notes,
            "status": self.status,
            "admin_notes": self.admin_notes,
            "completion_date": iso(self.completion_date),
            "charges": self.charges,
            "parts_charges": self.parts_charges,
            "created_at": iso(self.created_at),
            "can_cancel": self.status in CANCELLABLE_STATUSES,
            "step": TRACK_STEPS.index(self.status) if self.status in TRACK_STEPS else -1,
            "customer": {"id": self.customer.id, "name": self.customer.name, "email": self.customer.email, "phone": self.customer.phone},
            "vehicle": self.vehicle.to_dict(),
            "service": self.service.to_dict(),
            "technician": tech.to_dict() if tech else None,
            "invoice_id": self.invoice.id if self.invoice else None,
            "invoice_status": self.invoice.status if self.invoice else None,
            "invoice_total": self.invoice.total if self.invoice else None,
        }


class TechnicianAssignment(db.Model):
    __tablename__ = "technician_assignments"
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), unique=True, nullable=False)
    technician_id = db.Column(db.Integer, db.ForeignKey("technicians.id"), nullable=False)
    assigned_at = db.Column(db.DateTime, default=utcnow, nullable=False)


class ServiceRecord(db.Model):
    __tablename__ = "service_records"
    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), unique=True, nullable=False)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicles.id"), nullable=False)
    technician_id = db.Column(db.Integer, db.ForeignKey("technicians.id"))
    service_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, default="")
    total_cost = db.Column(db.Float, nullable=False, default=0)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    technician = db.relationship("Technician")

    def to_dict(self):
        a = self.appointment
        return {
            "id": self.id,
            "appointment_id": a.id,
            "booking_id": a.booking_id,
            "service_date": iso(self.service_date),
            "service": a.service.name,
            "description": self.description,
            "vehicle": a.vehicle.to_dict(),
            "technician": self.technician.to_dict() if self.technician else None,
            "total_cost": self.total_cost,
            "status": a.status,
            "invoice_id": a.invoice.id if a.invoice else None,
        }


class Invoice(db.Model):
    __tablename__ = "invoices"
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(30), unique=True, nullable=False)
    appointment_id = db.Column(db.Integer, db.ForeignKey("appointments.id"), unique=True, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    items_json = db.Column(db.Text, nullable=False, default="[]")
    subtotal = db.Column(db.Float, nullable=False, default=0)
    tax = db.Column(db.Float, nullable=False, default=0)
    total = db.Column(db.Float, nullable=False, default=0)
    status = db.Column(db.String(20), nullable=False, default="Unpaid")  # Unpaid / Paid
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    payments = db.relationship("Payment", backref="invoice", cascade="all, delete-orphan")
    user = db.relationship("User")

    @property
    def items(self):
        return json.loads(self.items_json or "[]")

    def to_dict(self):
        a = self.appointment
        return {
            "id": self.id,
            "invoice_number": self.invoice_number,
            "appointment_id": a.id,
            "booking_id": a.booking_id,
            "status": self.status,
            "items": self.items,
            "subtotal": self.subtotal,
            "tax": self.tax,
            "total": self.total,
            "created_at": iso(self.created_at),
            "customer": {"name": self.user.name, "email": self.user.email, "phone": self.user.phone},
            "vehicle": a.vehicle.to_dict(),
            "service": a.service.name,
            "service_date": iso(a.completion_date or a.appointment_date),
            "payments": [p.to_dict() for p in self.payments],
        }


class Payment(db.Model):
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey("invoices.id"), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    method = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Success")
    transaction_ref = db.Column(db.String(40), unique=True, nullable=False)
    paid_at = db.Column(db.DateTime, default=utcnow, nullable=False)

    def to_dict(self):
        inv = self.invoice
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "invoice_number": inv.invoice_number,
            "booking_id": inv.appointment.booking_id,
            "customer": inv.user.name,
            "amount": self.amount,
            "method": self.method,
            "status": self.status,
            "transaction_ref": self.transaction_ref,
            "paid_at": iso(self.paid_at),
        }


class ContactMessage(db.Model):
    __tablename__ = "contact_messages"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    subject = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=utcnow, nullable=False)

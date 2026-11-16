"""Seed the database with demo data.

Usage:
    python seed.py            # adds demo data only if the database is empty
    python seed.py --reset    # DROPS all tables first, then seeds (local development only)
"""
import os
import sys
from datetime import date, datetime, timedelta

from app import create_app
from app.extensions import db, bcrypt
from app.models import (
    User, Vehicle, Service, Technician, Appointment, TechnicianAssignment, Payment,
)
from app.utils.billing import sync_billing
from app.utils.helpers import random_code

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@autocare.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin@12345")
CUSTOMER_PASSWORD = "Customer@123"

SERVICES = [
    ("Oil Change", "Engine oil and filter replacement with a basic safety check.", 59.0, 45),
    ("Full Vehicle Service", "Comprehensive inspection, fluids, filters, spark plugs and road test.", 189.0, 180),
    ("Brake Inspection and Repair", "Pad, rotor and brake fluid inspection, with replacement if needed.", 129.0, 120),
    ("Tire Rotation and Alignment", "Rotate tires, balance wheels and set alignment to spec.", 89.0, 90),
    ("Battery Check and Replacement", "Load test, terminal cleaning and replacement if required.", 79.0, 40),
    ("AC Service", "Refrigerant recharge, leak check and cabin filter replacement.", 109.0, 90),
    ("Engine Diagnostics", "Computer scan, fault code analysis and written report.", 99.0, 60),
    ("Car Wash and Detailing", "Exterior wash, interior vacuum, polish and dashboard care.", 69.0, 120),
]
TECHS = [
    ("Marcus Reed", "marcus@autocare.local", "555-0101", "Engine and diagnostics"),
    ("Linda Chavez", "linda@autocare.local", "555-0102", "Brakes and suspension"),
    ("Tom Nguyen", "tom@autocare.local", "555-0103", "Electrical and AC systems"),
]
CUSTOMERS = [
    ("James Carter", "james@example.com", "555-0201"),
    ("Emily Johnson", "emily@example.com", "555-0202"),
    ("Michael Brown", "michael@example.com", "555-0203"),
    ("Sophia Martinez", "sophia@example.com", "555-0204"),
    ("Daniel Lee", "daniel@example.com", "555-0205"),
]
VEHICLES = [
    ("KA01AB1234", "Toyota", "Corolla", 2019, "Petrol", "Sedan"),
    ("KA02CD5678", "Honda", "CR-V", 2021, "Hybrid", "SUV"),
    ("KA03EF9012", "Ford", "Ranger", 2018, "Diesel", "Truck"),
    ("KA04GH3456", "Tesla", "Model 3", 2022, "Electric", "Sedan"),
    ("KA05JK7890", "Hyundai", "i20", 2020, "Petrol", "Hatchback"),
]


def hash_pw(pw):
    return bcrypt.generate_password_hash(pw).decode("utf-8")


def seed():
    if User.query.first():
        print("Database already has data. Use --reset to start over.")
        return

    db.session.add(User(name="Site Admin", email=ADMIN_EMAIL.lower(), phone="555-0100", role="admin", password_hash=hash_pw(ADMIN_PASSWORD)))
    customers = [User(name=n, email=e, phone=p, role="customer", password_hash=hash_pw(CUSTOMER_PASSWORD)) for n, e, p in CUSTOMERS]
    services = [Service(name=n, description=d, price=p, duration_minutes=m) for n, d, p, m in SERVICES]
    techs = [Technician(name=n, email=e, phone=p, specialization=s) for n, e, p, s in TECHS]
    db.session.add_all(customers + services + techs)
    db.session.flush()
    vehicles = [Vehicle(user_id=c.id, reg_number=r, brand=b, model=m, year=y, fuel_type=f, vehicle_type=t)
                for c, (r, b, m, y, f, t) in zip(customers, VEHICLES)]
    db.session.add_all(vehicles)
    db.session.flush()

    today = date.today()

    def book(ci, si, offset, slot, status, notes="", tech=None, paid=False, parts=0.0, admin_notes=""):
        appt = Appointment(
            booking_id=random_code("AC", 4), user_id=customers[ci].id, vehicle_id=vehicles[ci].id, service_id=services[si].id,
            appointment_date=today + timedelta(days=offset), time_slot=slot, notes=notes, status=status,
            charges=services[si].price, parts_charges=parts, admin_notes=admin_notes,
            created_at=datetime.utcnow() + timedelta(days=min(offset, 0) - 1),
        )
        db.session.add(appt)
        db.session.flush()
        if tech is not None:
            db.session.add(TechnicianAssignment(appointment_id=appt.id, technician_id=techs[tech].id))
            db.session.flush()
            db.session.refresh(appt)
        if status in ("Service Completed", "Delivered"):
            appt.completion_date = appt.appointment_date
            invoice = sync_billing(appt)
            if paid:
                invoice.status = "Paid"
                db.session.add(Payment(
                    invoice_id=invoice.id, user_id=appt.user_id, amount=invoice.total,
                    method=("card" if ci % 2 == 0 else "upi"), status="Success",
                    transaction_ref=random_code("TXN", 8),
                    paid_at=datetime.combine(appt.appointment_date, datetime.min.time()) + timedelta(hours=15),
                ))
        db.session.flush()
        return appt

    # history (completed, some paid)
    book(0, 1, -70, "10:00", "Delivered", "Annual service", 0, True, 45.0, "Full service done. Replaced air filter.")
    book(1, 0, -48, "09:00", "Delivered", "Oil light is on", 0, True, 0, "Oil and filter changed.")
    book(2, 2, -30, "11:00", "Delivered", "Squeaking brakes", 1, True, 120.0, "Front pads and rotors replaced.")
    book(3, 3, -18, "14:00", "Delivered", "Steering pulls right", 1, True, 0, "Alignment corrected.")
    book(4, 5, -9, "15:00", "Service Completed", "AC not cooling", 2, False, 35.0, "Refrigerant recharged, cabin filter replaced.")
    book(0, 6, -3, "16:00", "Delivered", "Check engine light", 0, False, 0, "Loose sensor connector fixed.")
    # in progress, confirmed, pending, closed
    book(2, 1, 0, "17:00", "Service in Progress", "Routine 60k service", 0)
    book(1, 2, 2, "10:00", "Booking Confirmed", "Brake noise at low speed", 1)
    book(3, 4, 3, "09:00", "Booking Confirmed", "Slow cranking in the morning", 2)
    book(4, 0, 4, "11:00", "Pending", "Oil change please")
    book(0, 7, 5, "12:00", "Pending", "Detailing before a trip")
    book(1, 3, 6, "14:00", "Cancelled", "Plans changed")
    book(2, 5, 7, "15:00", "Rejected", "", None, False, 0, "Bay unavailable that day. Please rebook.")

    db.session.commit()
    print("Seeded demo data.")
    print(f"  Admin login   : {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
    print(f"  Customer login: james@example.com / {CUSTOMER_PASSWORD} (also emily@, michael@, sophia@, daniel@)")


if __name__ == "__main__":
    app = create_app()
    with app.app_context():
        if "--reset" in sys.argv:
            db.drop_all()
            db.create_all()
            print("All tables dropped and recreated.")
        seed()

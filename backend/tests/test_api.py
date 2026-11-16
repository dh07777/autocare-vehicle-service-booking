"""End-to-end API tests. Run from the backend folder:  python -m unittest discover -s tests -v"""
import os
import sys
import tempfile
import unittest
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.models import Service, Technician, User  # noqa: E402
from app.extensions import bcrypt  # noqa: E402

PW = "Passw0rd!"


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.tmp.close()
        self.app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///" + self.tmp.name, "SLOT_CAPACITY": 1})
        with self.app.app_context():
            db.session.add(User(name="Admin", email="admin@test.com", phone="5550000000", role="admin",
                                password_hash=bcrypt.generate_password_hash(PW).decode()))
            db.session.add(Service(name="Oil Change", description="Oil and filter", price=50, duration_minutes=45))
            db.session.add(Technician(name="Tech One", email="t1@test.com", phone="5551111111", specialization="Engines"))
            db.session.commit()
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.engine.dispose()
        os.unlink(self.tmp.name)

    # helpers
    def register(self, client, email="cust@test.com"):
        return client.post("/api/auth/register", json={"name": "Cust Omer", "email": email, "phone": "5552223333", "password": PW, "confirm_password": PW})

    def future_day(self, n=3):
        return (date.today() + timedelta(days=n)).isoformat()

    def admin_client(self):
        c = self.app.test_client()
        r = c.post("/api/auth/login", json={"email": "admin@test.com", "password": PW, "portal": "admin"})
        self.assertEqual(r.status_code, 200)
        return c

    def add_vehicle(self, client, reg="KA01AA0001"):
        return client.post("/api/vehicles", json={"reg_number": reg, "brand": "Toyota", "model": "Yaris", "year": 2020, "fuel_type": "Petrol", "vehicle_type": "Hatchback"})

    # tests
    def test_registration_and_login(self):
        self.assertEqual(self.register(self.client).status_code, 201)
        self.assertEqual(self.register(self.client).status_code, 422)  # duplicate email
        bad = self.client.post("/api/auth/register", json={"name": "A", "email": "x", "phone": "1", "password": "short", "confirm_password": "no"})
        self.assertEqual(bad.status_code, 422)
        me = self.client.get("/api/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertNotIn("password", str(me.get_json()))
        self.client.post("/api/auth/logout")
        self.assertEqual(self.client.get("/api/auth/me").status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login", json={"email": "cust@test.com", "password": "wrong"}).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/login", json={"email": "cust@test.com", "password": PW}).status_code, 200)

    def test_admin_login_and_authorization(self):
        self.register(self.client)
        self.assertEqual(self.client.get("/api/admin/dashboard").status_code, 403)  # customer blocked
        self.assertEqual(self.app.test_client().get("/api/admin/dashboard").status_code, 401)  # anonymous blocked
        c = self.app.test_client()
        self.assertEqual(c.post("/api/auth/login", json={"email": "admin@test.com", "password": PW}).status_code, 403)  # wrong portal
        admin = self.admin_client()
        self.assertEqual(admin.get("/api/admin/dashboard").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login", json={"email": "cust@test.com", "password": PW, "portal": "admin"}).status_code, 403)

    def test_vehicle_crud_and_ownership(self):
        self.register(self.client)
        r = self.add_vehicle(self.client)
        self.assertEqual(r.status_code, 201)
        vid = r.get_json()["vehicle"]["id"]
        self.assertEqual(self.add_vehicle(self.client).status_code, 422)  # duplicate registration
        r = self.client.put(f"/api/vehicles/{vid}", json={"reg_number": "KA01AA0001", "brand": "Toyota", "model": "Corolla", "year": 2021, "fuel_type": "Hybrid", "vehicle_type": "Sedan"})
        self.assertEqual(r.get_json()["vehicle"]["model"], "Corolla")
        other = self.app.test_client()
        self.register(other, "other@test.com")
        self.assertEqual(other.get(f"/api/vehicles/{vid}").status_code, 403)
        self.assertEqual(other.delete(f"/api/vehicles/{vid}").status_code, 403)
        self.assertEqual(len(self.client.get("/api/vehicles").get_json()["vehicles"]), 1)
        self.assertEqual(self.client.delete(f"/api/vehicles/{vid}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/vehicles/{vid}").status_code, 404)

    def test_service_crud(self):
        admin = self.admin_client()
        r = admin.post("/api/services", json={"name": "Wheel Balance", "description": "Balance all four wheels", "price": 30, "duration_minutes": 30})
        self.assertEqual(r.status_code, 201)
        sid = r.get_json()["service"]["id"]
        self.assertEqual(admin.post("/api/services", json={"name": "Wheel Balance", "description": "dup dup", "price": 1, "duration_minutes": 10}).status_code, 422)
        r = admin.put(f"/api/services/{sid}", json={"name": "Wheel Balancing", "description": "Balance all wheels", "price": 35, "duration_minutes": 30})
        self.assertEqual(r.get_json()["service"]["price"], 35)
        self.assertEqual(admin.delete(f"/api/services/{sid}").status_code, 200)
        self.register(self.client)
        self.assertEqual(self.client.post("/api/services", json={}).status_code, 403)

    def test_booking_flow_invoice_and_payment(self):
        self.register(self.client)
        vid = self.add_vehicle(self.client).get_json()["vehicle"]["id"]
        with self.app.app_context():
            sid = Service.query.first().id
            tid = Technician.query.first().id
        day = self.future_day()
        body = {"vehicle_id": vid, "service_id": sid, "appointment_date": day, "time_slot": "10:00", "notes": "Oil light"}
        r = self.client.post("/api/appointments", json=body)
        self.assertEqual(r.status_code, 201)
        appt = r.get_json()["appointment"]
        self.assertTrue(appt["booking_id"].startswith("AC-"))
        # duplicate slot is rejected for another customer
        other = self.app.test_client()
        self.register(other, "second@test.com")
        ov = self.add_vehicle(other, "KA09ZZ0002").get_json()["vehicle"]["id"]
        dup = other.post("/api/appointments", json={**body, "vehicle_id": ov})
        self.assertEqual(dup.status_code, 422)
        self.assertIn("time_slot", dup.get_json()["errors"])
        slots = self.client.get(f"/api/appointments/slots?date={day}").get_json()["slots"]
        self.assertFalse(next(s for s in slots if s["time"] == "10:00")["available"])
        # booking someone else's vehicle is forbidden
        self.assertEqual(other.post("/api/appointments", json={**body, "time_slot": "11:00"}).status_code, 403)

        admin = self.admin_client()
        aid = appt["id"]
        r = admin.put(f"/api/admin/appointments/{aid}/status", json={"status": "Booking Confirmed"})
        self.assertEqual(r.get_json()["appointment"]["status"], "Booking Confirmed")
        r = admin.post(f"/api/admin/appointments/{aid}/assign-technician", json={"technician_id": tid})
        self.assertEqual(r.get_json()["appointment"]["technician"]["id"], tid)
        self.assertEqual(admin.put(f"/api/admin/appointments/{aid}/status", json={"status": "Nonsense"}).status_code, 422)
        r = admin.put(f"/api/admin/appointments/{aid}/status", json={"status": "Service Completed", "charges": 80, "parts_charges": 20, "admin_notes": "Done"})
        done = r.get_json()["appointment"]
        self.assertIsNotNone(done["invoice_id"])
        self.assertEqual(done["completion_date"], date.today().isoformat())

        inv = self.client.get(f"/api/invoices/{done['invoice_id']}").get_json()["invoice"]
        self.assertEqual(inv["subtotal"], 100.0)
        self.assertEqual(inv["total"], 108.0)  # 8% tax
        self.assertEqual(len(inv["items"]), 2)
        self.assertEqual(other.get(f"/api/invoices/{inv['id']}").status_code, 403)
        pdf = self.client.get(f"/api/invoices/{inv['id']}/pdf")
        self.assertEqual(pdf.status_code, 200)
        self.assertTrue(pdf.data.startswith(b"%PDF"))

        self.assertEqual(self.client.post("/api/payments", json={"invoice_id": inv["id"], "method": "card", "card_number": "12"}).status_code, 422)
        r = self.client.post("/api/payments", json={"invoice_id": inv["id"], "method": "card", "card_number": "4242424242424242"})
        self.assertEqual(r.status_code, 201)
        self.assertEqual(self.client.post("/api/payments", json={"invoice_id": inv["id"], "method": "upi"}).status_code, 409)
        dash = admin.get("/api/admin/dashboard").get_json()["totals"]
        self.assertEqual(dash["revenue"], 108.0)
        self.assertEqual(dash["completed"], 1)
        self.assertEqual(admin.get("/api/admin/reports").status_code, 200)
        self.assertEqual(len(self.client.get("/api/payments").get_json()["payments"]), 1)

    def test_cancel_rules(self):
        self.register(self.client)
        vid = self.add_vehicle(self.client).get_json()["vehicle"]["id"]
        with self.app.app_context():
            sid = Service.query.first().id
        r = self.client.post("/api/appointments", json={"vehicle_id": vid, "service_id": sid, "appointment_date": self.future_day(4), "time_slot": "14:00"})
        aid = r.get_json()["appointment"]["id"]
        self.assertEqual(self.client.delete(f"/api/appointments/{aid}").get_json()["appointment"]["status"], "Cancelled")
        # slot is free again
        r = self.client.post("/api/appointments", json={"vehicle_id": vid, "service_id": sid, "appointment_date": self.future_day(4), "time_slot": "14:00"})
        self.assertEqual(r.status_code, 201)
        admin = self.admin_client()
        admin.put(f"/api/admin/appointments/{r.get_json()['appointment']['id']}/status", json={"status": "Vehicle Received"})
        self.assertEqual(self.client.delete(f"/api/appointments/{r.get_json()['appointment']['id']}").status_code, 409)


if __name__ == "__main__":
    unittest.main()

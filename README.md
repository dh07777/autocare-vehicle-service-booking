# AutoCare - Vehicle Service Booking & Maintenance Management System

A full-stack portfolio project. Customers register, manage vehicles, book service slots, track repair progress, view history and pay invoices. Admins manage customers, appointments, services, technicians and reports.

> Payments are **simulated**. No real payment gateway is used and no real money moves.

## Features

**Customer:** register / log in (server-side sessions), dashboard, vehicle CRUD, service booking with live slot availability and a unique booking ID, appointment list with cancel, 6-step service tracker, service history, itemised invoices, simulated payments, downloadable PDF invoices, profile and password change.

**Admin:** dashboard with live stats and Chart.js charts, customer search / details / activate-deactivate, vehicle search by registration number, appointment accept / reject / status updates / technician assignment / completion date / notes / charges, service CRUD, technician CRUD and assignment view, reports (daily and monthly appointments, completed vs pending, monthly revenue, popular services, customer stats).

## Technology stack

| Layer    | Tools |
|----------|-------|
| Frontend | React 18, React Router DOM 6, Axios, Chart.js, Vite, HTML5, CSS3 |
| Backend  | Python 3.11+, Flask, Flask-CORS, Flask-SQLAlchemy, Flask-Bcrypt, ReportLab (PDF) |
| Database | SQLite (file created automatically in `backend/instance/`) |

## Architecture

```
React (Vite, :5173)  --/api (proxy)-->  Flask REST API (:5000)  -->  SQLite
  Axios, withCredentials                 session cookie auth          SQLAlchemy models
```

* Authentication is a signed, HttpOnly Flask session cookie. Nothing sensitive is kept in `localStorage`. On refresh the app calls `GET /api/auth/me` to restore the session.
* In development Vite proxies `/api` to Flask, so the cookie is same-origin. CORS is also configured for `http://localhost:5173`.
* Roles (`customer`, `admin`) are enforced on the server by decorators (`login_required`, `admin_required`, `customer_required`) and again in the React route guard.
* Invoices and service records are created automatically when an appointment reaches *Service Completed*. Paid invoices are locked.

```
AutoCare/
  backend/
    app/  (__init__.py, config.py, extensions.py, models.py, routes/, utils/)
    tests/test_api.py   seed.py   run.py   requirements.txt   .env.example
  frontend/
    src/ (components, pages/{public,customer,admin}, layouts, services, hooks, context, utils)
    package.json   vite.config.js   .env.example
```

## Installation (VS Code, step by step)

Requirements: **Python 3.11+**, **Node.js 18+** and npm, VS Code.

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows (PowerShell):  venv\Scripts\Activate.ps1
# Windows (cmd):         venv\Scripts\activate.bat
# macOS / Linux:         source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # Windows: copy .env.example .env
python seed.py              # creates tables and demo data
python run.py               # API on http://127.0.0.1:5000
```

If PowerShell blocks activation run `Set-ExecutionPolicy -Scope Process Bypass` first.
Tables are also created automatically every time the app starts. `python seed.py --reset` drops everything and re-seeds (development only).

### 2. Frontend (second terminal)

```bash
cd frontend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173.

### 3. Tests

```bash
cd backend
python -m unittest discover -s tests -v
```

The suite covers registration, login, admin login, protected routes, vehicle CRUD and ownership, service CRUD, booking, duplicate-slot prevention, status updates, technician assignment, invoice and PDF generation, payment, and cancellation rules.

## Default local credentials (development only)

| Role     | Email                  | Password       |
|----------|------------------------|----------------|
| Admin    | admin@autocare.local   | Admin@12345    |
| Customer | james@example.com      | Customer@123   |

Other customers: emily@, michael@, sophia@, daniel@ `example.com` (same password).

**Change these before any deployment.** Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `backend/.env` before running the seed, use a long random `SECRET_KEY`, and never seed demo customers in production.

## Environment variables

`backend/.env`: `SECRET_KEY`, `FLASK_DEBUG`, `CORS_ORIGINS`, `DATABASE_URL`, `SLOT_CAPACITY` (bookings per time slot, default 1), `TAX_RATE` (default 0.08), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SESSION_COOKIE_SECURE` (set `1` on HTTPS).
`frontend/.env`: `VITE_API_URL` (`/api` in development).

## API documentation

All responses are JSON. Errors look like `{"error": "message", "errors": {"field": "message"}}`. Status codes: 200/201 success, 400 bad request, 401 not logged in, 403 forbidden, 404 not found, 409 conflict, 422 validation failed, 500 server error.

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | /api/auth/register | public | Create customer account (logs in) |
| POST | /api/auth/login | public | Log in (`portal`: `customer` or `admin`) |
| POST | /api/auth/logout | any | Clear session |
| GET | /api/auth/me | logged in | Current user |
| PUT | /api/auth/profile, /api/auth/password | logged in | Update profile / change password |
| GET, POST | /api/vehicles | customer (admin: GET all) | List / add vehicles (`?q=`) |
| GET, PUT, DELETE | /api/vehicles/&lt;id&gt; | owner (admin: GET) | Vehicle details / edit / delete |
| GET | /api/services | public (`?all=1` admin) | List services |
| POST, PUT, DELETE | /api/services[/&lt;id&gt;] | admin | Manage services (delete archives if booked) |
| GET | /api/appointments/slots?date=YYYY-MM-DD | logged in | Slot availability |
| GET, POST | /api/appointments | customer (admin: GET all) | List (`?status=&q=`) / book |
| GET, PUT, DELETE | /api/appointments/&lt;id&gt; | owner/admin | Details / reschedule pending / cancel |
| GET | /api/admin/dashboard | admin | Totals, charts, recent bookings |
| GET | /api/admin/customers[/&lt;id&gt;] | admin | Search / detail (`?q=`) |
| PUT | /api/admin/customers/&lt;id&gt; | admin | Edit, activate or deactivate |
| GET | /api/admin/vehicles | admin | All vehicles (`?q=`) |
| GET | /api/admin/appointments | admin | All appointments (`?status=&q=`) |
| PUT | /api/admin/appointments/&lt;id&gt;/status | admin | Status, notes, charges, completion date |
| POST | /api/admin/appointments/&lt;id&gt;/assign-technician | admin | Assign `{technician_id}` |
| GET, POST | /api/technicians | admin | List / add |
| PUT, DELETE | /api/technicians/&lt;id&gt; | admin | Edit / delete (deactivates if assigned) |
| GET | /api/technicians/&lt;id&gt;/assignments | admin | Assignments of a technician |
| GET | /api/service-records | logged in | Service history |
| GET | /api/invoices, /api/invoices/&lt;id&gt; | owner/admin | Invoices |
| GET | /api/invoices/&lt;id&gt;/pdf | owner/admin | PDF download |
| GET, POST | /api/payments | owner/admin | Payment history / simulated payment |
| GET | /api/admin/reports, /reports/revenue, /reports/appointments | admin | Analytics |
| POST | /api/contact | public | Contact form (stored in DB) |

Appointment statuses: Pending, Booking Confirmed, Vehicle Received, Inspection, Service in Progress, Service Completed, Delivered, Rejected, Cancelled. Customers can cancel only Pending or Booking Confirmed bookings.

## Screenshots

Add screenshots to `docs/screenshots/` and link them here:

```
![Landing page](docs/screenshots/home.png)
![Customer dashboard](docs/screenshots/customer-dashboard.png)
![Admin dashboard](docs/screenshots/admin-dashboard.png)
```

## Publishing to GitHub

```bash
git init
git add .
git commit -m "AutoCare: initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/AutoCare.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `venv/`, `node_modules/` and the SQLite database. Check `git status` shows no secrets before pushing.

**Deploying later:** host the Flask API (for example Render or Railway with `gunicorn run:app`), set `SECRET_KEY`, `CORS_ORIGINS` (your frontend URL) and `SESSION_COOKIE_SECURE=1`. For a cross-site frontend host you will also need `SESSION_COOKIE_SAMESITE=None`; serving both behind one domain is simpler. Build the frontend with `npm run build` and set `VITE_API_URL` to the API URL.

## Troubleshooting

* *"Cannot reach the server"*: the backend is not running on port 5000.
* *Login works but page refresh logs you out*: open the app through `http://localhost:5173` (not a different host name) so the proxy and cookie stay same-origin.
* *Slot shows as taken*: each date + time slot allows `SLOT_CAPACITY` bookings; cancelled and rejected bookings free the slot.

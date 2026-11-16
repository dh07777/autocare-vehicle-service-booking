import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./layouts/PublicLayout";
import DashboardLayout from "./layouts/DashboardLayout";

import Home from "./pages/public/Home";
import About from "./pages/public/About";
import ServicesPage from "./pages/public/Services";
import Contact from "./pages/public/Contact";
import Register from "./pages/public/Register";
import Login from "./pages/public/Login";
import AdminLogin from "./pages/public/AdminLogin";
import NotFound from "./pages/public/NotFound";

import CustomerDashboard from "./pages/customer/Dashboard";
import MyVehicles from "./pages/customer/MyVehicles";
import VehicleForm from "./pages/customer/VehicleForm";
import BookService from "./pages/customer/BookService";
import MyAppointments from "./pages/customer/MyAppointments";
import TrackService from "./pages/customer/TrackService";
import ServiceHistory from "./pages/customer/ServiceHistory";
import Payments from "./pages/customer/Payments";
import InvoiceDetails from "./pages/customer/InvoiceDetails";
import Profile from "./pages/customer/Profile";

import AdminDashboard from "./pages/admin/Dashboard";
import CustomerManagement from "./pages/admin/CustomerManagement";
import VehicleManagement from "./pages/admin/VehicleManagement";
import AppointmentManagement from "./pages/admin/AppointmentManagement";
import ServiceManagement from "./pages/admin/ServiceManagement";
import TechnicianManagement from "./pages/admin/TechnicianManagement";
import Reports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/AdminProfile";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin/login" element={<AdminLogin />} />
      </Route>

      <Route element={<ProtectedRoute role="customer" />}>
        <Route path="/customer" element={<DashboardLayout role="customer" />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="vehicles" element={<MyVehicles />} />
          <Route path="vehicles/new" element={<VehicleForm />} />
          <Route path="vehicles/:id/edit" element={<VehicleForm />} />
          <Route path="book" element={<BookService />} />
          <Route path="appointments" element={<MyAppointments />} />
          <Route path="track" element={<TrackService />} />
          <Route path="track/:id" element={<TrackService />} />
          <Route path="history" element={<ServiceHistory />} />
          <Route path="payments" element={<Payments />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<DashboardLayout role="admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="customers" element={<CustomerManagement />} />
          <Route path="vehicles" element={<VehicleManagement />} />
          <Route path="appointments" element={<AppointmentManagement />} />
          <Route path="services" element={<ServiceManagement />} />
          <Route path="technicians" element={<TechnicianManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="invoices/:id" element={<InvoiceDetails />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

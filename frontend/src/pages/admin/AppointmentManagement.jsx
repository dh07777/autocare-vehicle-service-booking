import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import useDebounce from "../../hooks/useDebounce";
import { DataState, DetailList, EmptyState, Input, Modal, PageHeader, SearchBox, Select, StatusBadge, Textarea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { ALL_STATUSES, fmtDate, fmtTime, money } from "../../utils/format";

function ManageModal({ appt, technicians, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    status: appt.status,
    completion_date: appt.completion_date || "",
    admin_notes: appt.admin_notes || "",
    charges: appt.charges,
    parts_charges: appt.parts_charges,
  });
  const [techId, setTechId] = useState(appt.technician?.id || "");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const closed = appt.status === "Cancelled";
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const quick = async (status) => {
    setBusy(true);
    try {
      await api.put(`/admin/appointments/${appt.id}/status`, { status });
      toast.success(status === "Rejected" ? "Booking rejected." : "Booking accepted.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.put(`/admin/appointments/${appt.id}/status`, form);
      if (techId && String(techId) !== String(appt.technician?.id || "")) {
        await api.post(`/admin/appointments/${appt.id}/assign-technician`, { technician_id: techId });
      }
      toast.success("Appointment updated.");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Booking ${appt.booking_id}`} onClose={onClose} wide>
      <DetailList items={[
        ["Customer", `${appt.customer.name} (${appt.customer.phone})`],
        ["Vehicle", `${appt.vehicle.brand} ${appt.vehicle.model} - ${appt.vehicle.reg_number}`],
        ["Service", appt.service.name],
        ["Scheduled", `${fmtDate(appt.appointment_date)}, ${fmtTime(appt.time_slot)}`],
        ["Customer notes", appt.notes || "-"],
        ["Current status", <StatusBadge key="s" status={appt.status} />],
      ]} />
      {appt.status === "Pending" && (
        <div className="alert info">
          <span>This booking is waiting for a decision.</span>
          <span className="row"><button className="btn sm primary" disabled={busy} onClick={() => quick("Booking Confirmed")}>Accept booking</button><button className="btn sm danger" disabled={busy} onClick={() => quick("Rejected")}>Reject booking</button></span>
        </div>
      )}
      {closed ? <div className="alert error">Cancelled bookings cannot be changed.</div> : (
        <form className="form two" onSubmit={save} noValidate>
          <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)} options={ALL_STATUSES.filter((s) => s !== "Cancelled")} error={errors.status} />
          <Select label="Assigned technician" value={techId} onChange={(e) => setTechId(e.target.value)} placeholder="Not assigned" options={technicians.filter((t) => t.is_active).map((t) => ({ value: t.id, label: `${t.name} - ${t.specialization}` }))} error={errors.technician_id} />
          <Input label="Service charge ($)" type="number" step="0.01" min="0" value={form.charges} onChange={(e) => set("charges", e.target.value)} error={errors.charges} />
          <Input label="Parts and materials ($)" type="number" step="0.01" min="0" value={form.parts_charges} onChange={(e) => set("parts_charges", e.target.value)} error={errors.parts_charges} />
          <Input label="Service completion date" type="date" value={form.completion_date} onChange={(e) => set("completion_date", e.target.value)} error={errors.completion_date} hint="Defaults to today when you mark the service completed." />
          <div />
          <div className="span-2"><Textarea label="Service notes (shown to the customer)" value={form.admin_notes} onChange={(e) => set("admin_notes", e.target.value)} /></div>
          <div className="span-2 modal-actions" style={{ marginTop: 0 }}>
            {appt.invoice_id && <Link className="btn" to={`/admin/invoices/${appt.invoice_id}`}>View invoice ({appt.invoice_status})</Link>}
            <button type="button" className="btn" onClick={onClose}>Close</button>
            <button className="btn primary" disabled={busy}>{busy ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function AppointmentManagement() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch("/admin/appointments", { q: dq, status });
  const techs = useFetch("/technicians");
  const [managing, setManaging] = useState(null);
  const list = data?.appointments || [];

  return (
    <>
      <PageHeader title="Appointments" subtitle="Accept bookings, assign technicians and move work through each stage." />
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Search booking ID, customer or registration" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <DataState loading={loading} error={error} onRetry={reload} empty={list.length === 0 && <div className="card"><EmptyState title="No appointments match" text="Change the search or status filter." /></div>}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Booking</th><th>Customer</th><th>Vehicle and service</th><th>When</th><th>Technician</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.booking_id}</strong></td>
                  <td>{a.customer.name}</td>
                  <td>{a.service.name}<div className="muted">{a.vehicle.reg_number}</div></td>
                  <td className="nowrap">{fmtDate(a.appointment_date)}<div className="muted">{fmtTime(a.time_slot)}</div></td>
                  <td>{a.technician?.name || <span className="muted">Unassigned</span>}</td>
                  <td><StatusBadge status={a.status} /><div className="muted">{money(a.invoice_total ?? a.charges)}</div></td>
                  <td className="right"><button className="btn sm primary" onClick={() => setManaging(a)}>Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
      {managing && (
        <ManageModal key={managing.id} appt={managing} technicians={techs.data?.technicians || []} onClose={() => setManaging(null)} onSaved={() => { setManaging(null); reload(); }} />
      )}
    </>
  );
}

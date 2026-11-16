import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { ConfirmDialog, DataState, EmptyState, Input, Loader, Modal, PageHeader, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDate, fmtTime } from "../../utils/format";

const EMPTY = { name: "", email: "", phone: "", specialization: "", is_active: true };

function TechForm({ tech, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(tech || EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (tech) await api.put(`/technicians/${tech.id}`, form);
      else await api.post("/technicians", form);
      toast.success(tech ? "Technician updated." : "Technician added.");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={tech ? "Edit technician" : "Add technician"} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Input label="Full name" name="name" value={form.name} onChange={set} error={errors.name} />
        <Input label="Email" type="email" name="email" value={form.email} onChange={set} error={errors.email} />
        <Input label="Phone" type="tel" name="phone" value={form.phone} onChange={set} error={errors.phone} />
        <Input label="Specialization" name="specialization" value={form.specialization} onChange={set} error={errors.specialization} />
        {tech && <label className="row"><input type="checkbox" style={{ width: "auto" }} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Available for assignments</label>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : tech ? "Save changes" : "Add technician"}</button>
        </div>
      </form>
    </Modal>
  );
}

function Assignments({ tech, onClose }) {
  const { data, loading, error } = useFetch(`/technicians/${tech.id}/assignments`);
  const rows = data?.assignments || [];
  return (
    <Modal title={`Assignments for ${tech.name}`} onClose={onClose} wide>
      {loading ? <Loader /> : error ? <div className="alert error">{error}</div> : rows.length === 0 ? <EmptyState title="No assignments yet" text="Assign this technician from the Appointments page." /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Booking</th><th>Service</th><th>Vehicle</th><th>When</th><th>Status</th></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}><td>{a.booking_id}</td><td>{a.service.name}</td><td>{a.vehicle.reg_number}</td><td className="nowrap">{fmtDate(a.appointment_date)}, {fmtTime(a.time_slot)}</td><td><StatusBadge status={a.status} /></td></tr>
          ))}</tbody>
        </table></div>
      )}
    </Modal>
  );
}

export default function TechnicianManagement() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch("/technicians");
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const techs = data?.technicians || [];

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.delete(`/technicians/${deleting.id}`);
      toast.success(res.data.message);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setDeleting(null);
    }
  };

  return (
    <>
      <PageHeader title="Technicians" subtitle="Your workshop team and their assignments.">
        <button className="btn primary" onClick={() => setEditing("new")}>Add technician</button>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload} empty={techs.length === 0 && <div className="card"><EmptyState title="No technicians yet" text="Add a technician to start assigning jobs." /></div>}>
        <div className="grid auto">
          {techs.map((t) => (
            <div className="card" key={t.id}>
              <div className="row between"><h3>{t.name}</h3><span className={`badge ${t.is_active ? "ok" : "warn"}`}>{t.is_active ? "Active" : "Inactive"}</span></div>
              <p className="muted" style={{ marginBottom: 4 }}>{t.specialization}</p>
              <p className="muted">{t.email}<br />{t.phone}</p>
              <p><strong>{t.assignment_count}</strong> assignment{t.assignment_count === 1 ? "" : "s"}</p>
              <div className="row">
                <button className="btn sm" onClick={() => setViewing(t)}>Assignments</button>
                <button className="btn sm" onClick={() => setEditing(t)}>Edit</button>
                <button className="btn sm danger" onClick={() => setDeleting(t)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </DataState>
      {editing && <TechForm tech={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {viewing && <Assignments tech={viewing} onClose={() => setViewing(null)} />}
      {deleting && <ConfirmDialog title="Delete this technician?" message={`${deleting.name} will be removed. If they have past assignments they are deactivated instead so records stay accurate.`} confirmLabel="Delete technician" danger busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

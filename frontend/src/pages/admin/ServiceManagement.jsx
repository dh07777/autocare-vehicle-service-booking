import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { ConfirmDialog, DataState, EmptyState, Input, Modal, PageHeader, Textarea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { money } from "../../utils/format";

const EMPTY = { name: "", description: "", price: "", duration_minutes: "", is_active: true };

function ServiceForm({ service, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(service || EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (service) await api.put(`/services/${service.id}`, form);
      else await api.post("/services", form);
      toast.success(service ? "Service updated." : "Service added.");
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={service ? "Edit service" : "Add service"} onClose={onClose}>
      <form className="form" onSubmit={submit} noValidate>
        <Input label="Service name" name="name" value={form.name} onChange={set} error={errors.name} />
        <Textarea label="Description" name="description" value={form.description} onChange={set} error={errors.description} />
        <div className="form two">
          <Input label="Estimated price ($)" name="price" type="number" step="0.01" min="0" value={form.price} onChange={set} error={errors.price} />
          <Input label="Estimated duration (minutes)" name="duration_minutes" type="number" min="5" value={form.duration_minutes} onChange={set} error={errors.duration_minutes} />
        </div>
        {service && (
          <label className="row"><input type="checkbox" style={{ width: "auto" }} checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Offered to customers</label>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : service ? "Save changes" : "Add service"}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ServiceManagement() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch("/services", { all: 1 });
  const [editing, setEditing] = useState(null); // null | "new" | service
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const services = data?.services || [];

  const remove = async () => {
    setBusy(true);
    try {
      const res = await api.delete(`/services/${deleting.id}`);
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
      <PageHeader title="Services" subtitle="The catalogue customers choose from when booking.">
        <button className="btn primary" onClick={() => setEditing("new")}>Add service</button>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload} empty={services.length === 0 && <div className="card"><EmptyState title="No services yet" text="Add a service so customers can book it." /></div>}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Service</th><th>Description</th><th>Price</th><th>Duration</th><th>Visibility</th><th></th></tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ minWidth: 220 }} className="muted">{s.description}</td>
                  <td>{money(s.price)}</td>
                  <td className="nowrap">{s.duration_minutes} min</td>
                  <td><span className={`badge ${s.is_active ? "ok" : "warn"}`}>{s.is_active ? "Active" : "Archived"}</span></td>
                  <td className="right nowrap">
                    <button className="btn sm" onClick={() => setEditing(s)}>Edit</button>
                    <button className="btn sm danger" onClick={() => setDeleting(s)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
      {editing && <ServiceForm service={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {deleting && <ConfirmDialog title="Delete this service?" message={`"${deleting.name}" will be removed. If customers have already booked it, it is archived instead so their history stays intact.`} confirmLabel="Delete service" danger busy={busy} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

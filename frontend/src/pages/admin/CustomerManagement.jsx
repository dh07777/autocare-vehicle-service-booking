import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import useDebounce from "../../hooks/useDebounce";
import { ConfirmDialog, DataState, DetailList, EmptyState, Loader, Modal, PageHeader, SearchBox, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtDate, fmtTime } from "../../utils/format";

function CustomerDetail({ id, onClose }) {
  const { data, loading, error } = useFetch(`/admin/customers/${id}`);
  return (
    <Modal title="Customer details" onClose={onClose} wide>
      {loading ? <Loader /> : error ? <div className="alert error">{error}</div> : (
        <div className="stack">
          <DetailList items={[["Name", data.customer.name], ["Email", data.customer.email], ["Phone", data.customer.phone], ["Joined", fmtDate(data.customer.created_at)], ["Account", data.customer.is_active ? "Active" : "Deactivated"]]} />
          <h3>Vehicles ({data.vehicles.length})</h3>
          {data.vehicles.length === 0 ? <p className="muted">No vehicles registered.</p> : (
            <ul>{data.vehicles.map((v) => <li key={v.id}>{v.brand} {v.model} ({v.year}) - <strong>{v.reg_number}</strong>, {v.fuel_type}</li>)}</ul>
          )}
          <h3>Bookings ({data.appointments.length})</h3>
          {data.appointments.length === 0 ? <p className="muted">No bookings yet.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Booking</th><th>Service</th><th>When</th><th>Status</th></tr></thead>
              <tbody>{data.appointments.map((a) => (
                <tr key={a.id}><td>{a.booking_id}</td><td>{a.service.name}</td><td className="nowrap">{fmtDate(a.appointment_date)}, {fmtTime(a.time_slot)}</td><td><StatusBadge status={a.status} /></td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function CustomerManagement() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch("/admin/customers", { q: dq });
  const [viewing, setViewing] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [busy, setBusy] = useState(false);
  const customers = data?.customers || [];

  const toggle = async () => {
    setBusy(true);
    try {
      await api.put(`/admin/customers/${toggling.id}`, { is_active: !toggling.is_active });
      toast.success(toggling.is_active ? "Account deactivated." : "Account reactivated.");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      setToggling(null);
    }
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="Search, review and manage customer accounts." />
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search by name, email or phone" /></div>
      <DataState loading={loading} error={error} onRetry={reload} empty={customers.length === 0 && <div className="card"><EmptyState title="No customers found" text={q ? "Try a different search." : "Customers appear here after they register."} /></div>}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Contact</th><th>Vehicles</th><th>Bookings</th><th>Account</th><th></th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.name}</strong><div className="muted">Joined {fmtDate(c.created_at)}</div></td>
                  <td>{c.email}<div className="muted">{c.phone}</div></td>
                  <td>{c.vehicle_count}</td>
                  <td>{c.booking_count}</td>
                  <td><span className={`badge ${c.is_active ? "ok" : "bad"}`}>{c.is_active ? "Active" : "Deactivated"}</span></td>
                  <td className="right nowrap">
                    <button className="btn sm" onClick={() => setViewing(c.id)}>View</button>
                    <button className={`btn sm ${c.is_active ? "danger" : ""}`} onClick={() => setToggling(c)}>{c.is_active ? "Deactivate" : "Reactivate"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
      {viewing && <CustomerDetail id={viewing} onClose={() => setViewing(null)} />}
      {toggling && (
        <ConfirmDialog
          title={toggling.is_active ? "Deactivate this account?" : "Reactivate this account?"}
          message={toggling.is_active ? `${toggling.name} will no longer be able to log in. Their data is kept.` : `${toggling.name} will be able to log in again.`}
          confirmLabel={toggling.is_active ? "Deactivate" : "Reactivate"}
          danger={toggling.is_active}
          busy={busy}
          onConfirm={toggle}
          onCancel={() => setToggling(null)}
        />
      )}
    </>
  );
}

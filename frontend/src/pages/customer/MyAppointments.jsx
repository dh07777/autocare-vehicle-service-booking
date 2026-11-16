import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { ConfirmDialog, DataState, DetailList, EmptyState, Modal, PageHeader, StatusBadge } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { ALL_STATUSES, fmtDate, fmtTime, money } from "../../utils/format";

export default function MyAppointments() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const { data, loading, error, reload } = useFetch("/appointments", { status });
  const [viewing, setViewing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [busy, setBusy] = useState(false);
  const list = data?.appointments || [];

  const cancel = async () => {
    setBusy(true);
    try {
      await api.delete(`/appointments/${cancelling.id}`);
      toast.success("Booking cancelled.");
      setCancelling(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
      setCancelling(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My appointments" subtitle="All your bookings and their current status.">
        <Link className="btn primary" to="/customer/book">Book a service</Link>
      </PageHeader>
      <div className="toolbar">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {ALL_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>
      <DataState loading={loading} error={error} onRetry={reload} empty={list.length === 0 && (
        <div className="card"><EmptyState title="No appointments found" text={status ? "Try a different status filter." : "Book your first service to see it here."} /></div>
      )}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Booking ID</th><th>Vehicle</th><th>Service</th><th>Date and time</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td className="nowrap"><strong>{a.booking_id}</strong></td>
                  <td>{a.vehicle.brand} {a.vehicle.model}<div className="muted">{a.vehicle.reg_number}</div></td>
                  <td>{a.service.name}</td>
                  <td className="nowrap">{fmtDate(a.appointment_date)}<div className="muted">{fmtTime(a.time_slot)}</div></td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="right nowrap">
                    <button className="btn sm" onClick={() => setViewing(a)}>Details</button>
                    {a.can_cancel && <button className="btn sm danger" onClick={() => setCancelling(a)}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>

      {viewing && (
        <Modal title={`Booking ${viewing.booking_id}`} onClose={() => setViewing(null)} wide>
          <DetailList items={[
            ["Status", <StatusBadge key="s" status={viewing.status} />],
            ["Service", viewing.service.name],
            ["Vehicle", `${viewing.vehicle.brand} ${viewing.vehicle.model} (${viewing.vehicle.reg_number})`],
            ["Appointment", `${fmtDate(viewing.appointment_date)}, ${fmtTime(viewing.time_slot)}`],
            ["Technician", viewing.technician?.name || "Not assigned yet"],
            ["Estimated charge", money(viewing.charges)],
            ["Your notes", viewing.notes || "-"],
            ["Workshop notes", viewing.admin_notes || "-"],
            ["Completed on", viewing.completion_date ? fmtDate(viewing.completion_date) : "-"],
          ]} />
          <div className="modal-actions">
            {viewing.invoice_id && <Link className="btn" to={`/customer/invoices/${viewing.invoice_id}`}>View invoice</Link>}
            <Link className="btn primary" to={`/customer/track/${viewing.id}`}>Track service</Link>
          </div>
        </Modal>
      )}
      {cancelling && (
        <ConfirmDialog title="Cancel this booking?" message={`Booking ${cancelling.booking_id} on ${fmtDate(cancelling.appointment_date)} at ${fmtTime(cancelling.time_slot)} will be cancelled and the slot released.`} confirmLabel="Cancel booking" danger busy={busy} onConfirm={cancel} onCancel={() => setCancelling(null)} />
      )}
    </>
  );
}

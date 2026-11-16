import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { DataState, DetailList, EmptyState, PageHeader, StatusBadge } from "../../components/ui";
import Tracker from "../../components/Tracker";
import { fmtDate, fmtTime } from "../../utils/format";

export default function TrackService() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch("/appointments");
  const list = data?.appointments || [];
  const [selected, setSelected] = useState(id || "");

  useEffect(() => {
    if (id) setSelected(id);
    else if (!selected && list.length) {
      const active = list.find((a) => !["Delivered", "Cancelled", "Rejected"].includes(a.status));
      setSelected(String((active || list[0]).id));
    }
  }, [id, list.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const appt = list.find((a) => String(a.id) === String(selected));

  return (
    <>
      <PageHeader title="Track service" subtitle="See how far along your vehicle is.">
        <button className="btn" onClick={reload}>Refresh status</button>
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload} empty={list.length === 0 && (
        <div className="card"><EmptyState title="Nothing to track" text="Once you book a service you can follow it here." action={<Link className="btn primary" to="/customer/book">Book a service</Link>} /></div>
      )}>
        <div className="toolbar">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="Choose a booking" style={{ maxWidth: 420 }}>
            {list.map((a) => <option key={a.id} value={a.id}>{a.booking_id} - {a.service.name} ({a.vehicle.reg_number})</option>)}
          </select>
        </div>
        {appt && (
          <div className="card stack">
            <div className="row between">
              <h2 style={{ margin: 0 }}>{appt.service.name}</h2>
              <StatusBadge status={appt.status} />
            </div>
            <Tracker status={appt.status} step={appt.step} />
            <DetailList items={[
              ["Booking ID", appt.booking_id],
              ["Vehicle", `${appt.vehicle.brand} ${appt.vehicle.model} (${appt.vehicle.reg_number})`],
              ["Scheduled for", `${fmtDate(appt.appointment_date)}, ${fmtTime(appt.time_slot)}`],
              ["Technician", appt.technician?.name || "Not assigned yet"],
              ["Workshop notes", appt.admin_notes || "-"],
              ["Completed on", appt.completion_date ? fmtDate(appt.completion_date) : "-"],
            ]} />
            {appt.invoice_id && <div><Link className="btn primary" to={`/customer/invoices/${appt.invoice_id}`}>View invoice</Link></div>}
          </div>
        )}
      </DataState>
    </>
  );
}

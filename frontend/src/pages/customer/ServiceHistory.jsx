import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { DataState, EmptyState, PageHeader } from "../../components/ui";
import { fmtDate, money } from "../../utils/format";

export default function ServiceHistory() {
  const { data, loading, error, reload } = useFetch("/service-records");
  const records = data?.records || [];
  return (
    <>
      <PageHeader title="Service history" subtitle="Every completed job on your vehicles." />
      <DataState loading={loading} error={error} onRetry={reload} empty={records.length === 0 && (
        <div className="card"><EmptyState title="No service records yet" text="Records appear here once a service is completed." /></div>
      )}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Service</th><th>Vehicle</th><th>Description</th><th>Technician</th><th className="right">Total cost</th><th></th></tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td className="nowrap">{fmtDate(r.service_date)}</td>
                  <td><strong>{r.service}</strong><div className="muted">{r.booking_id}</div></td>
                  <td>{r.vehicle.brand} {r.vehicle.model}<div className="muted">{r.vehicle.reg_number}</div></td>
                  <td style={{ minWidth: 200 }}>{r.description}</td>
                  <td>{r.technician ? <>{r.technician.name}<div className="muted">{r.technician.specialization}</div></> : "-"}</td>
                  <td className="right"><strong>{money(r.total_cost)}</strong></td>
                  <td>{r.invoice_id && <Link className="btn sm" to={`/customer/invoices/${r.invoice_id}`}>Invoice</Link>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </>
  );
}

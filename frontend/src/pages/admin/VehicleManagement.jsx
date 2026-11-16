import { useState } from "react";
import useFetch from "../../hooks/useFetch";
import useDebounce from "../../hooks/useDebounce";
import { DataState, DetailList, EmptyState, Modal, PageHeader, SearchBox } from "../../components/ui";
import { fmtDate } from "../../utils/format";

export default function VehicleManagement() {
  const [q, setQ] = useState("");
  const dq = useDebounce(q);
  const { data, loading, error, reload } = useFetch("/admin/vehicles", { q: dq });
  const [viewing, setViewing] = useState(null);
  const vehicles = data?.vehicles || [];

  return (
    <>
      <PageHeader title="Vehicles" subtitle="Every vehicle registered by customers." />
      <div className="toolbar"><SearchBox value={q} onChange={setQ} placeholder="Search by registration number, brand or owner" /></div>
      <DataState loading={loading} error={error} onRetry={reload} empty={vehicles.length === 0 && <div className="card"><EmptyState title="No vehicles found" text={q ? "Try a different registration number." : "Vehicles appear here after customers add them."} /></div>}>
        <div className="card flush table-wrap">
          <table>
            <thead><tr><th>Registration</th><th>Vehicle</th><th>Fuel</th><th>Owner</th><th></th></tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.reg_number}</strong></td>
                  <td>{v.brand} {v.model}<div className="muted">{v.year} - {v.vehicle_type}</div></td>
                  <td>{v.fuel_type}</td>
                  <td>{v.owner.name}<div className="muted">{v.owner.phone}</div></td>
                  <td className="right"><button className="btn sm" onClick={() => setViewing(v)}>Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
      {viewing && (
        <Modal title={viewing.reg_number} onClose={() => setViewing(null)}>
          <DetailList items={[
            ["Vehicle", `${viewing.brand} ${viewing.model}`], ["Year", viewing.year], ["Fuel type", viewing.fuel_type], ["Vehicle type", viewing.vehicle_type],
            ["Owner", viewing.owner.name], ["Owner email", viewing.owner.email], ["Owner phone", viewing.owner.phone], ["Registered", fmtDate(viewing.created_at)],
          ]} />
        </Modal>
      )}
    </>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { ConfirmDialog, DataState, DetailList, EmptyState, Modal, PageHeader } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

export default function MyVehicles() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch("/vehicles");
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const vehicles = data?.vehicles || [];

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/vehicles/${deleting.id}`);
      toast.success("Vehicle deleted.");
      setDeleting(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="My vehicles" subtitle="Vehicles you can book services for.">
        <Link className="btn primary" to="/customer/vehicles/new">Add vehicle</Link>
      </PageHeader>
      <DataState
        loading={loading}
        error={error}
        onRetry={reload}
        empty={vehicles.length === 0 && (
          <div className="card"><EmptyState title="No vehicles yet" text="Add your first vehicle to start booking services." action={<Link className="btn primary" to="/customer/vehicles/new">Add vehicle</Link>} /></div>
        )}
      >
        <div className="grid auto">
          {vehicles.map((v) => (
            <div className="card" key={v.id}>
              <h3>{v.brand} {v.model}</h3>
              <p className="muted" style={{ marginBottom: 4 }}>{v.reg_number}</p>
              <p className="muted">{v.year} - {v.fuel_type} - {v.vehicle_type}</p>
              <div className="row">
                <button className="btn sm" onClick={() => setViewing(v)}>Details</button>
                <Link className="btn sm" to={`/customer/vehicles/${v.id}/edit`}>Edit</Link>
                <button className="btn sm danger" onClick={() => setDeleting(v)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </DataState>

      {viewing && (
        <Modal title={`${viewing.brand} ${viewing.model}`} onClose={() => setViewing(null)}>
          <DetailList items={[
            ["Registration number", viewing.reg_number],
            ["Brand", viewing.brand],
            ["Model", viewing.model],
            ["Manufacturing year", viewing.year],
            ["Fuel type", viewing.fuel_type],
            ["Vehicle type", viewing.vehicle_type],
          ]} />
          <div className="modal-actions">
            <Link className="btn primary" to="/customer/book">Book a service</Link>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this vehicle?"
          message={`${deleting.brand} ${deleting.model} (${deleting.reg_number}) will be removed from your account. This cannot be undone.`}
          confirmLabel="Delete vehicle"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  );
}

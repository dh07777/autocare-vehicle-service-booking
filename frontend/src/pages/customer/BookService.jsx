import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { DataState, EmptyState, Field, PageHeader, Select, Textarea } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { fmtTime, money, todayISO } from "../../utils/format";

export default function BookService() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const vehicles = useFetch("/vehicles");
  const services = useFetch("/services");
  const [form, setForm] = useState({ vehicle_id: params.get("vehicle") || "", service_id: "", appointment_date: "", time_slot: "", notes: "" });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!form.appointment_date) return;
    let cancelled = false;
    setSlotsLoading(true);
    api.get("/appointments/slots", { params: { date: form.appointment_date } })
      .then((res) => !cancelled && setSlots(res.data.slots))
      .catch((err) => !cancelled && (setSlots([]), toast.error(errorMessage(err))))
      .finally(() => !cancelled && setSlotsLoading(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.appointment_date, refresh]);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value, ...(name === "appointment_date" ? { time_slot: "" } : {}) }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await api.post("/appointments", form);
      toast.success(`Booking ${res.data.appointment.booking_id} submitted. We will confirm it shortly.`);
      navigate("/customer/appointments");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
      if (fieldErrors(err).time_slot) { setRefresh((r) => r + 1); set("time_slot", ""); } // reload slots after a clash
    } finally {
      setBusy(false);
    }
  };

  const vehicleList = vehicles.data?.vehicles || [];
  const serviceList = services.data?.services || [];
  const loading = vehicles.loading || services.loading;

  return (
    <>
      <PageHeader title="Book a service" subtitle="Choose a vehicle, a service and a free time slot." />
      <DataState
        loading={loading}
        error={vehicles.error || services.error}
        onRetry={() => { vehicles.reload(); services.reload(); }}
        empty={vehicleList.length === 0 && (
          <div className="card"><EmptyState title="Add a vehicle first" text="You need at least one vehicle to book a service." action={<Link className="btn primary" to="/customer/vehicles/new">Add vehicle</Link>} /></div>
        )}
      >
        <form className="stack" onSubmit={submit} noValidate>
          <div className="card form">
            <h2>1. Vehicle</h2>
            <Select label="Your vehicle" value={form.vehicle_id} onChange={(e) => set("vehicle_id", e.target.value)} placeholder="Select a vehicle"
              options={vehicleList.map((v) => ({ value: v.id, label: `${v.brand} ${v.model} - ${v.reg_number}` }))} error={errors.vehicle_id} />
          </div>

          <div className="card">
            <h2>2. Service category</h2>
            {errors.service_id && <p className="field-error">{errors.service_id}</p>}
            <div className="grid auto">
              {serviceList.map((s) => (
                <button type="button" key={s.id} className={`choice ${String(form.service_id) === String(s.id) ? "selected" : ""}`} onClick={() => set("service_id", s.id)} aria-pressed={String(form.service_id) === String(s.id)}>
                  <strong>{s.name}</strong>
                  <span className="muted">{s.description}</span>
                  <div className="row between" style={{ marginTop: 8 }}>
                    <span className="price">{money(s.price)}</span>
                    <span className="muted">~{s.duration_minutes} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="card form">
            <h2>3. Date and time</h2>
            <Field label="Service date" error={errors.appointment_date}>
              <input type="date" min={todayISO()} value={form.appointment_date} onChange={(e) => set("appointment_date", e.target.value)} style={{ maxWidth: 240 }} />
            </Field>
            {form.appointment_date && (
              <div>
                <span className="field-label">Available time slots</span>
                {slotsLoading ? (
                  <p className="muted">Checking availability...</p>
                ) : (
                  <div className="slots" style={{ marginTop: 8 }}>
                    {slots.map((s) => (
                      <button type="button" key={s.time} disabled={!s.available} className={`slot ${form.time_slot === s.time ? "selected" : ""}`} onClick={() => set("time_slot", s.time)}>
                        {fmtTime(s.time)}
                      </button>
                    ))}
                  </div>
                )}
                {errors.time_slot && <p className="field-error">{errors.time_slot}</p>}
              </div>
            )}
          </div>

          <div className="card form">
            <h2>4. Problems or notes</h2>
            <Textarea label="Describe any problems (optional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} error={errors.notes} placeholder="For example: grinding noise when braking" />
            <div><button className="btn primary" disabled={busy}>{busy ? "Submitting..." : "Submit booking"}</button></div>
          </div>
        </form>
      </DataState>
    </>
  );
}

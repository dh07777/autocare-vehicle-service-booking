import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../../services/api";
import { Input, Loader, PageHeader, Select } from "../../components/ui";
import { useToast } from "../../context/ToastContext";

const FUELS = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"];
const TYPES = ["Hatchback", "Sedan", "SUV", "Truck", "Van", "Motorcycle", "Other"];
const EMPTY = { reg_number: "", brand: "", model: "", year: "", fuel_type: "", vehicle_type: "" };

export default function VehicleForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editing) return;
    api.get(`/vehicles/${id}`)
      .then((res) => setForm(res.data.vehicle))
      .catch((err) => { toast.error(errorMessage(err)); navigate("/customer/vehicles"); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      if (editing) await api.put(`/vehicles/${id}`, form);
      else await api.post("/vehicles", form);
      toast.success(editing ? "Vehicle updated." : "Vehicle added.");
      navigate("/customer/vehicles");
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <>
      <PageHeader title={editing ? "Edit vehicle" : "Add vehicle"} />
      <form className="card form two" onSubmit={submit} noValidate style={{ maxWidth: 720 }}>
        <div className="span-2"><Input label="Registration number" name="reg_number" value={form.reg_number} onChange={set} error={errors.reg_number} placeholder="KA01AB1234" /></div>
        <Input label="Brand" name="brand" value={form.brand} onChange={set} error={errors.brand} />
        <Input label="Model" name="model" value={form.model} onChange={set} error={errors.model} />
        <Input label="Manufacturing year" name="year" type="number" value={form.year} onChange={set} error={errors.year} />
        <Select label="Fuel type" name="fuel_type" value={form.fuel_type} onChange={set} options={FUELS} placeholder="Select fuel type" error={errors.fuel_type} />
        <div className="span-2"><Select label="Vehicle type" name="vehicle_type" value={form.vehicle_type} onChange={set} options={TYPES} placeholder="Select vehicle type" error={errors.vehicle_type} /></div>
        <div className="span-2 row">
          <button className="btn primary" disabled={busy}>{busy ? "Saving..." : editing ? "Save changes" : "Add vehicle"}</button>
          <Link className="btn" to="/customer/vehicles">Cancel</Link>
        </div>
      </form>
    </>
  );
}

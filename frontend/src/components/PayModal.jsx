import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../services/api";
import { Input, Modal, Select } from "./ui";
import { useToast } from "../context/ToastContext";
import { money } from "../utils/format";

// Simulated payment. Nothing is sent to a real payment gateway.
export default function PayModal({ invoice, isAdmin = false, onClose, onPaid }) {
  const toast = useToast();
  const [method, setMethod] = useState(isAdmin ? "cash" : "card");
  const [card, setCard] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const methods = [
    { value: "card", label: "Credit or debit card" },
    { value: "upi", label: "UPI" },
    { value: "netbanking", label: "Net banking" },
    ...(isAdmin ? [{ value: "cash", label: "Cash at the workshop" }] : []),
  ];

  const pay = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      await api.post("/payments", { invoice_id: invoice.id, method, card_number: card });
      toast.success(`Payment of ${money(invoice.total)} recorded.`);
      onPaid();
    } catch (err) {
      setErrors(fieldErrors(err));
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Pay invoice ${invoice.invoice_number}`} onClose={onClose}>
      <form className="form" onSubmit={pay} noValidate>
        <div className="alert info">Demo payment only. No real money is charged.</div>
        <p style={{ margin: 0 }}>Amount due: <strong>{money(invoice.total)}</strong></p>
        <Select label="Payment method" value={method} onChange={(e) => setMethod(e.target.value)} options={methods} error={errors.method} />
        {method === "card" && (
          <Input label="Card number" inputMode="numeric" value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" error={errors.card_number} hint="Any 12-19 digits work in demo mode. Only the last four digits are kept." />
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? "Processing..." : `Pay ${money(invoice.total)}`}</button>
        </div>
      </form>
    </Modal>
  );
}

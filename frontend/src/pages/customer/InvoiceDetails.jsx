import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { DataState, PageHeader, StatusBadge } from "../../components/ui";
import PayModal from "../../components/PayModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { fmtDate, money } from "../../utils/format";

export default function InvoiceDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user.role === "admin";
  const { data, loading, error, reload } = useFetch(`/invoices/${id}`);
  const [paying, setPaying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const inv = data?.invoice;

  const download = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${inv.invoice_number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <PageHeader title="Invoice details">
        <Link className="btn" to={isAdmin ? "/admin/appointments" : "/customer/payments"}>Back</Link>
        {inv && <button className="btn" onClick={download} disabled={downloading}>{downloading ? "Preparing PDF..." : "Download PDF"}</button>}
        {inv && inv.status === "Unpaid" && <button className="btn primary" onClick={() => setPaying(true)}>{isAdmin ? "Record payment" : "Pay now"}</button>}
      </PageHeader>
      <DataState loading={loading} error={error} onRetry={reload}>
        {inv && (
          <div className="card invoice stack">
            <div className="row between">
              <div>
                <h2 style={{ marginBottom: 2 }}>{inv.invoice_number}</h2>
                <span className="muted">Booking {inv.booking_id} - issued {fmtDate(inv.created_at)}</span>
              </div>
              <StatusBadge status={inv.status} />
            </div>
            <div className="grid cols-2">
              <div><strong>Billed to</strong><div>{inv.customer.name}</div><div className="muted">{inv.customer.email}</div><div className="muted">{inv.customer.phone}</div></div>
              <div><strong>Vehicle</strong><div>{inv.vehicle.brand} {inv.vehicle.model} ({inv.vehicle.year})</div><div className="muted">{inv.vehicle.reg_number}</div><div className="muted">Serviced {fmtDate(inv.service_date)}</div></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
                <tbody>
                  {inv.items.map((it, i) => <tr key={i}><td>{it.description}</td><td>{it.quantity}</td><td>{money(it.amount)}</td></tr>)}
                  <tr><td></td><td className="muted">Subtotal</td><td>{money(inv.subtotal)}</td></tr>
                  <tr><td></td><td className="muted">Tax</td><td>{money(inv.tax)}</td></tr>
                  <tr className="total-row"><td></td><td>Total</td><td>{money(inv.total)}</td></tr>
                </tbody>
              </table>
            </div>
            {inv.payments.map((p) => (
              <div className="alert ok" key={p.id}>Paid {money(p.amount)} by {p.method} on {fmtDate(p.paid_at)} (ref {p.transaction_ref})</div>
            ))}
          </div>
        )}
      </DataState>
      {paying && <PayModal invoice={inv} isAdmin={isAdmin} onClose={() => setPaying(false)} onPaid={() => { setPaying(false); reload(); }} />}
    </>
  );
}

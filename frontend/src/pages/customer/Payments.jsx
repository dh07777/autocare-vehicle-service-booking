import { useState } from "react";
import { Link } from "react-router-dom";
import useFetch from "../../hooks/useFetch";
import { DataState, EmptyState, PageHeader, StatusBadge } from "../../components/ui";
import PayModal from "../../components/PayModal";
import { fmtDate, money } from "../../utils/format";

export default function Payments() {
  const invoices = useFetch("/invoices");
  const payments = useFetch("/payments");
  const [paying, setPaying] = useState(null);
  const inv = invoices.data?.invoices || [];
  const pay = payments.data?.payments || [];
  const due = inv.filter((i) => i.status === "Unpaid").reduce((s, i) => s + i.total, 0);
  const reloadAll = () => { invoices.reload(); payments.reload(); };

  return (
    <>
      <PageHeader title="Payments" subtitle={due > 0 ? `You have ${money(due)} outstanding.` : "You are all paid up."} />
      <DataState loading={invoices.loading || payments.loading} error={invoices.error || payments.error} onRetry={reloadAll}
        empty={inv.length === 0 && <div className="card"><EmptyState title="No invoices yet" text="An invoice is created when your service is completed." /></div>}>
        <h2>Invoices</h2>
        <div className="card flush table-wrap" style={{ marginBottom: 24 }}>
          <table>
            <thead><tr><th>Invoice</th><th>Service</th><th>Date</th><th className="right">Total</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {inv.map((i) => (
                <tr key={i.id}>
                  <td><strong>{i.invoice_number}</strong><div className="muted">{i.booking_id}</div></td>
                  <td>{i.service}</td>
                  <td className="nowrap">{fmtDate(i.service_date)}</td>
                  <td className="right"><strong>{money(i.total)}</strong></td>
                  <td><StatusBadge status={i.status} /></td>
                  <td className="right nowrap">
                    <Link className="btn sm" to={`/customer/invoices/${i.id}`}>View</Link>
                    {i.status === "Unpaid" && <button className="btn sm primary" onClick={() => setPaying(i)}>Pay now</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h2>Payment history</h2>
        {pay.length === 0 ? (
          <div className="card"><EmptyState title="No payments yet" text="Payments you make will be listed here." /></div>
        ) : (
          <div className="card flush table-wrap">
            <table>
              <thead><tr><th>Reference</th><th>Invoice</th><th>Method</th><th>Date</th><th className="right">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {pay.map((p) => (
                  <tr key={p.id}>
                    <td>{p.transaction_ref}</td>
                    <td>{p.invoice_number}</td>
                    <td style={{ textTransform: "capitalize" }}>{p.method}</td>
                    <td className="nowrap">{fmtDate(p.paid_at)}</td>
                    <td className="right">{money(p.amount)}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      {paying && <PayModal invoice={paying} onClose={() => setPaying(null)} onPaid={() => { setPaying(null); reloadAll(); }} />}
    </>
  );
}

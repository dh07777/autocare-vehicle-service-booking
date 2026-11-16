import { STEPS } from "../utils/format";

export default function Tracker({ status, step }) {
  if (status === "Pending")
    return <div className="alert info">Waiting for the workshop to confirm this booking.</div>;
  if (status === "Rejected" || status === "Cancelled")
    return <div className="alert error">This booking was {status.toLowerCase()}.</div>;

  return (
    <ol className="tracker">
      {STEPS.map((name, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={name} className={state}>
            <span className="dot">{state === "done" ? "\u2713" : i + 1}</span>
            <span className="tracker-label">{name}</span>
          </li>
        );
      })}
    </ol>
  );
}

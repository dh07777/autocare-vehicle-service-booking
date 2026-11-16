export default function About() {
  return (
    <section className="section">
      <div className="container stack" style={{ maxWidth: 780 }}>
        <h1>About AutoCare</h1>
        <p>
          AutoCare is a vehicle service centre built around one idea: you should never have to call to find out whether
          your car is ready. Every booking has a status that the workshop updates as the work moves forward.
        </p>
        <div className="grid cols-3">
          <div className="card"><h3>Certified technicians</h3><p className="muted">Every job is assigned to a named technician, and their name appears on your service history.</p></div>
          <div className="card"><h3>Transparent pricing</h3><p className="muted">You see the estimated price when you book and an itemised invoice when the work is done.</p></div>
          <div className="card"><h3>Full records</h3><p className="muted">Each visit is stored against your vehicle so you can look back at what was done and when.</p></div>
        </div>
        <p>
          This project is a portfolio application: a React front end talking to a Flask REST API with an SQLite database.
          Payments are simulated and no real money is moved.
        </p>
      </div>
    </section>
  );
}

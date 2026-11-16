import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export const PALETTE = ["#1f4fd8", "#f2a900", "#1a8f5a", "#c0392b", "#6c5ce7", "#0891b2", "#9a6b2f", "#64748b", "#d6409f"];

export default function ChartCanvas({ type = "bar", labels = [], values = [], label = "", height = 260, colors, money = false }) {
  const ref = useRef(null);
  const sig = JSON.stringify([type, labels, values]);

  useEffect(() => {
    const circular = type === "doughnut" || type === "pie";
    const chart = new Chart(ref.current, {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: circular ? labels.map((_, i) => (colors || PALETTE)[i % PALETTE.length]) : colors?.[0] || "#1f4fd8",
            borderColor: type === "line" ? "#1f4fd8" : undefined,
            borderRadius: type === "bar" ? 6 : 0,
            tension: 0.3,
            fill: type === "line",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: circular, position: "bottom" } },
        scales: circular
          ? {}
          : {
              y: { beginAtZero: true, ticks: { precision: 0, callback: (v) => (money ? "$" + v : v) } },
              x: { grid: { display: false } },
            },
      },
    });
    return () => chart.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (
    <div style={{ height, position: "relative" }}>
      <canvas ref={ref} />
    </div>
  );
}

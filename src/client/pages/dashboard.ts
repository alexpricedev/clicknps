import {
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Filler,
);

const gradientLinePlugin = {
  id: "gradientLine",
  beforeDatasetsDraw(chart: Chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];

    if (!meta.data || meta.data.length < 2) return;

    const getNpsColor = (score: number): string => {
      if (score >= 9) return "oklch(0.78452 0.132 181.911)";
      if (score >= 7) return "oklch(0.83242 0.139 82.95)";
      return "oklch(0.71785 0.17 13.118)";
    };

    ctx.save();
    ctx.lineWidth = 3;

    for (let i = 0; i < meta.data.length - 1; i++) {
      const point1 = meta.data[i];
      const point2 = meta.data[i + 1];

      if (!point1 || !point2) continue;

      const x1 = point1.x;
      const y1 = point1.y;
      const x2 = point2.x;
      const y2 = point2.y;

      const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
      const color1 = getNpsColor(dataset.data[i] as number);
      const color2 = getNpsColor(dataset.data[i + 1] as number);

      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.moveTo(x1, y1);

      if ((dataset as { tension?: number }).tension) {
        const cp1x = x1 + (x2 - x1) / 3;
        const cp1y = y1;
        const cp2x = x1 + (2 * (x2 - x1)) / 3;
        const cp2y = y2;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
      } else {
        ctx.lineTo(x2, y2);
      }

      ctx.stroke();
    }

    ctx.restore();
  },
};

Chart.register(gradientLinePlugin);

export const init = () => {
  const canvas = document.getElementById("nps-chart") as HTMLCanvasElement;
  if (!canvas) return;

  const chartData = canvas.dataset.chartData;
  if (!chartData) return;

  const data = JSON.parse(chartData);

  const getNpsColor = (score: number): string => {
    if (score >= 9) return "oklch(0.78452 0.132 181.911)";
    if (score >= 7) return "oklch(0.83242 0.139 82.95)";
    return "oklch(0.71785 0.17 13.118)";
  };

  const pointColors = data.values.map((value: number) => getNpsColor(value));

  new Chart(canvas, {
    type: "line",
    data: {
      labels: data.labels,
      datasets: [
        {
          label: "NPS Score",
          data: data.values,
          fill: false,
          tension: 0.4,
          borderWidth: 0,
          pointRadius: 7,
          pointHoverRadius: 10,
          pointBackgroundColor: pointColors,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 3,
          pointHoverBorderWidth: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: "index",
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "#ffffff",
          titleColor: "#1f2937",
          bodyColor: "#374151",
          borderColor: (context) => {
            const index = context.tooltip.dataPoints[0].dataIndex;
            const value = data.values[index];
            return getNpsColor(value);
          },
          borderWidth: 2,
          padding: 16,
          displayColors: false,
          titleFont: {
            size: 14,
            weight: "bold",
          },
          bodyFont: {
            size: 13,
          },
          callbacks: {
            title: (context) => {
              const index = context[0].dataIndex;
              return data.tooltips[index].dateRange;
            },
            label: (context) => {
              const index = context.dataIndex;
              const tooltip = data.tooltips[index];
              return [
                `NPS: ${tooltip.nps}`,
                `Responses: ${tooltip.responseCount}`,
              ];
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
            drawTicks: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            padding: 8,
            stepSize: 2,
            font: {
              size: 13,
            },
          },
        },
        x: {
          grid: {
            display: false,
          },
          border: {
            display: false,
          },
          ticks: {
            color: "rgba(255, 255, 255, 0.7)",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
            font: {
              size: 13,
            },
          },
        },
      },
    },
  });
};

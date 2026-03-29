<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(DoughnutController, ArcElement, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface Breakdown {
    pit: number;
    cit: number;
    ssc: number;
    vat: number;
    property: number;
    other: number;
  }

  interface Props {
    breakdown: Breakdown;
    oecdAvgBreakdown: Breakdown;
    totalTaxGdp: number;
    oecdAvgTotal: number;
    categoryLabels: Record<string, string>;
    vsAverageLabel: string;
    countryName: string;
    oecdLabel: string;
    unitLabel: string;
  }

  let {
    breakdown,
    oecdAvgBreakdown,
    totalTaxGdp,
    oecdAvgTotal,
    categoryLabels,
    vsAverageLabel,
    countryName,
    oecdLabel,
    unitLabel,
  }: Props = $props();

  let doughnutCanvas: HTMLCanvasElement;
  let barCanvas: HTMLCanvasElement;
  let doughnutChart: Chart | null = null;
  let barChart: Chart | null = null;

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#6b7280'];
  const KEYS: (keyof Breakdown)[] = ['pit', 'cit', 'ssc', 'vat', 'property', 'other'];

  function createCharts() {
    if (!doughnutCanvas || !barCanvas) return;
    doughnutChart?.destroy();
    barChart?.destroy();

    const labels = KEYS.map(k => categoryLabels[k] ?? k);
    const values = KEYS.map(k => breakdown[k]);

    doughnutChart = new Chart(doughnutCanvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: COLORS,
          borderWidth: 2,
          borderColor: '#fff',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '55%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 14, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = ctx.dataset.data.reduce((a, b) => (a as number) + (b as number), 0) as number;
                const pct = (((ctx.parsed as number) / total) * 100).toFixed(1);
                return `${ctx.label}: ${(ctx.parsed as number).toFixed(1)}% GDP (${pct}% of total)`;
              },
            },
          },
        },
      },
    });

    // Comparison bar chart
    const avgValues = KEYS.map(k => oecdAvgBreakdown[k]);

    barChart = new Chart(barCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: countryName,
            data: values,
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
          {
            label: oecdLabel,
            data: avgValues,
            backgroundColor: '#cbd5e1',
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}${unitLabel}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${val}%` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 11 }, maxRotation: 45 },
          },
        },
      },
    });
  }

  onMount(() => createCharts());
  onDestroy(() => {
    doughnutChart?.destroy();
    barChart?.destroy();
  });
</script>

<div class="charts-grid">
  <div class="chart-card">
    <div class="doughnut-wrapper">
      <canvas bind:this={doughnutCanvas}></canvas>
    </div>
    <p class="chart-note">
      Total: <strong>{totalTaxGdp.toFixed(1)}%</strong> GDP
    </p>
  </div>

  <div class="chart-card">
    <h3>{vsAverageLabel}</h3>
    <div class="bar-wrapper">
      <canvas bind:this={barCanvas}></canvas>
    </div>
  </div>
</div>

<style>
  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-top: 1.5rem;
  }

  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
  }

  .chart-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .chart-card h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--color-text-muted);
  }

  .doughnut-wrapper {
    max-width: 350px;
    margin: 0 auto;
  }

  .bar-wrapper {
    position: relative;
    height: 300px;
  }

  .chart-note {
    text-align: center;
    margin-top: 1rem;
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
</style>

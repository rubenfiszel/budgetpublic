<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, ScatterController, PointElement, LinearScale, Tooltip } from 'chart.js';

  Chart.register(ScatterController, PointElement, LinearScale, Tooltip);

  interface CountryPoint {
    code: string;
    name: string;
    flag: string;
    xValue: number;
    yValue: number;
    isHighlighted: boolean;
  }

  interface Props {
    points: CountryPoint[];
    xLabel: string;
    yLabel: string;
    xUnit: string;
    yUnit: string;
    title: string;
  }

  let { points, xLabel, yLabel, xUnit, yUnit, title }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const data = points.map(p => ({
      x: p.xValue,
      y: p.yValue,
    }));

    const bgColors = points.map(p => p.isHighlighted ? '#ef4444' : '#3b82f6');
    const sizes = points.map(p => p.isHighlighted ? 10 : 6);

    chart = new Chart(canvas, {
      type: 'scatter',
      data: {
        datasets: [{
          data,
          backgroundColor: bgColors,
          pointRadius: sizes,
          pointHoverRadius: sizes.map(s => s + 3),
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const p = points[ctx.dataIndex];
                return `${p.flag} ${p.name}: ${p.xValue.toFixed(1)}${xUnit}, ${p.yValue.toFixed(1)}${yUnit}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: xLabel, font: { size: 13, weight: 'bold' } },
            ticks: { callback: (val) => `${val}${xUnit}` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          y: {
            title: { display: true, text: yLabel, font: { size: 13, weight: 'bold' } },
            ticks: { callback: (val) => `${val}${yUnit}` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());
</script>

<div class="outcomes-card">
  <h3>{title}</h3>
  <div class="chart-wrapper">
    <canvas bind:this={canvas}></canvas>
  </div>
  <div class="legend">
    <span class="legend-item">
      <span class="dot highlighted"></span> This country
    </span>
    <span class="legend-item">
      <span class="dot"></span> Other countries
    </span>
  </div>
</div>

<style>
  .outcomes-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .outcomes-card h3 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: var(--color-text);
  }

  .chart-wrapper {
    position: relative;
    height: 300px;
  }

  .legend {
    display: flex;
    gap: 1.5rem;
    justify-content: center;
    margin-top: 0.75rem;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #3b82f6;
  }

  .dot.highlighted {
    background: #ef4444;
  }
</style>

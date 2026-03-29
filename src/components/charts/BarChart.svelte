<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface Props {
    labels: string[];
    values: number[];
    colors?: string[];
    highlightIndex?: number;
    label?: string;
    unit?: string;
    horizontal?: boolean;
    onBarClick?: (index: number) => void;
  }

  let {
    labels,
    values,
    colors = [],
    highlightIndex = -1,
    label = '',
    unit = '%',
    horizontal = true,
    onBarClick,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const DEFAULT_COLOR = '#3b82f6';
  const HIGHLIGHT_COLOR = '#f59e0b';

  function getColors(): string[] {
    if (colors.length > 0) return colors;
    return values.map((_, i) => i === highlightIndex ? HIGHLIGHT_COLOR : DEFAULT_COLOR);
  }

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const indexAxis = horizontal ? 'y' as const : 'x' as const;

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label,
          data: values,
          backgroundColor: getColors(),
          borderRadius: 4,
          barThickness: horizontal ? 20 : undefined,
        }],
      },
      options: {
        indexAxis,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed[horizontal ? 'x' : 'y'].toFixed(1)}${unit}`,
            },
          },
        },
        scales: {
          [horizontal ? 'x' : 'y']: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `${val}${unit}`,
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          [horizontal ? 'y' : 'x']: {
            grid: { display: false },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length > 0 && onBarClick) {
            onBarClick(elements[0].index);
          }
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());

  $effect(() => {
    // Re-create chart when data changes
    labels; values; colors; highlightIndex;
    if (canvas) createChart();
  });
</script>

<div class="chart-container">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    width: 100%;
    min-height: 400px;
  }
</style>

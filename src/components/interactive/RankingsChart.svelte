<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

  interface CountryEntry {
    code: string;
    name: string;
    slug: string;
    flag: string;
    value: number;
  }

  interface Props {
    entries: CountryEntry[];
    locale: string;
    baseUrl: string;
    color?: string;
    colorLight?: string;
    maxScale?: number;
  }

  let {
    entries,
    locale,
    baseUrl,
    color = '#3b82f6',
    colorLight = '#93c5fd',
    maxScale = 0,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const labels = sorted.map(e => `${e.flag} ${e.name}`);
    const data = sorted.map(e => e.value);
    const slugs = sorted.map(e => e.slug);

    const avg = data.reduce((s, v) => s + v, 0) / data.length;

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: data.map(v => v >= avg ? color : colorLight),
          borderRadius: 4,
          barThickness: 22,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.x.toFixed(1)}% of GDP`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: maxScale > 0 ? maxScale : undefined,
            ticks: { callback: (val) => `${val}%` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 13 } },
          },
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            window.location.href = `${baseUrl}/${slugs[idx]}`;
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target) {
            target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());
</script>

<div class="chart-wrapper">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-wrapper {
    position: relative;
    width: 100%;
    height: 620px;
  }
</style>

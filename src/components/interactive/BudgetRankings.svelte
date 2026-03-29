<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface CountryEntry {
    code: string;
    name: string;
    slug: string;
    flag: string;
    revenue: number;
    spending: number;
    balance: number;
  }

  interface Props {
    entries: CountryEntry[];
    baseUrl: string;
    revenueLabel: string;
    spendingLabel: string;
  }

  let { entries, baseUrl, revenueLabel, spendingLabel }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const sorted = [...entries].sort((a, b) => b.spending - a.spending);
    const labels = sorted.map(e => `${e.flag} ${e.name}`);
    const slugs = sorted.map(e => e.slug);

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: spendingLabel,
            data: sorted.map(e => e.spending),
            backgroundColor: '#fca5a5',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
          },
          {
            label: revenueLabel,
            data: sorted.map(e => e.revenue),
            backgroundColor: '#93c5fd',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4,
            barPercentage: 0.7,
          },
        ],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } },
          },
          tooltip: {
            callbacks: {
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx !== undefined) {
                  const e = sorted[idx];
                  const sign = e.balance >= 0 ? '+' : '';
                  return `Balance: ${sign}${e.balance.toFixed(1)}% of GDP`;
                }
                return '';
              },
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.x.toFixed(1)}% of GDP`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 65,
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
    height: 680px;
  }
</style>

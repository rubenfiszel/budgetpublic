<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface Props {
    breakdown: Record<string, number>;
    categoryLabels: Record<string, string>;
    adminKey: string;
    adminLabel: string;
    adminNote: string;
  }

  let { breakdown, categoryLabels, adminKey, adminLabel, adminNote }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const COLORS: Record<string, string> = {
    social_protection: '#3b82f6',
    health: '#ef4444',
    education: '#10b981',
    economic_affairs: '#f59e0b',
    defence: '#6366f1',
    general_public_services: '#f97316', // highlighted as admin overhead
    public_order: '#8b5cf6',
    environment: '#14b8a6',
    housing: '#ec4899',
    culture: '#6b7280',
  };

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    // Sort by value descending
    const sorted = Object.entries(breakdown)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([k]) => categoryLabels[k] ?? k);
    const values = sorted.map(([, v]) => v);
    const colors = sorted.map(([k]) => COLORS[k] ?? '#94a3b8');

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          barThickness: 24,
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
            ticks: { callback: (val) => `${val}%` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
          },
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());

  const adminPct = $derived(
    breakdown.general_public_services && breakdown.general_public_services > 0
      ? breakdown.general_public_services
      : 0
  );
  const totalSpending = $derived(Object.values(breakdown).reduce((s, v) => s + v, 0));
  const adminShare = $derived(totalSpending > 0 ? ((adminPct / totalSpending) * 100).toFixed(1) : '0');
</script>

<div class="spending-chart">
  <div class="chart-wrapper">
    <canvas bind:this={canvas}></canvas>
  </div>
  {#if adminPct > 0}
    <div class="admin-callout">
      <div class="admin-header">
        <span class="admin-dot"></span>
        <strong>{adminLabel}</strong>: {adminPct.toFixed(1)}% of GDP ({adminShare}% of total spending)
      </div>
      <p class="admin-note">{adminNote}</p>
    </div>
  {/if}
</div>

<style>
  .spending-chart {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .chart-wrapper {
    position: relative;
    height: 380px;
  }

  .admin-callout {
    margin-top: 1rem;
    padding: 0.75rem 1rem;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: 8px;
    font-size: 0.85rem;
  }

  .admin-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .admin-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #f97316;
    flex-shrink: 0;
  }

  .admin-note {
    margin-top: 0.25rem;
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
</style>

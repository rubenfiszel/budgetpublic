<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

  interface CategoryInfo {
    en: string;
    fr: string;
    parent?: string;
  }

  interface Props {
    breakdown: Record<string, number>;  // L1 breakdown from spending.json
    detailedBreakdown: Record<string, number> | null;  // L2 from spending-detailed.json
    labels: Record<string, CategoryInfo>;
    locale: string;
    adminNote: string;
  }

  let { breakdown, detailedBreakdown, labels, locale, adminNote }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;
  let expandedCategory = $state<string | null>(null);

  const L1_COLORS: Record<string, string> = {
    social_protection: '#3b82f6', health: '#ef4444', education: '#10b981',
    economic_affairs: '#f59e0b', general_public_services: '#f97316',
    defence: '#6366f1', public_order: '#8b5cf6', environment: '#14b8a6',
    housing: '#ec4899', culture: '#6b7280',
  };

  // Map L1 keys to COFOG codes for drill-down
  const L1_TO_COFOG: Record<string, string> = {
    social_protection: 'GF10', health: 'GF07', education: 'GF09',
    economic_affairs: 'GF04', general_public_services: 'GF01',
    defence: 'GF02', public_order: 'GF03', environment: 'GF05',
    housing: 'GF06', culture: 'GF08',
  };

  function getChartData() {
    if (!expandedCategory || !detailedBreakdown) {
      // Show L1 categories
      const sorted = Object.entries(breakdown)
        .filter(([, v]) => v > 0)
        .sort((a, b) => b[1] - a[1]);

      return {
        labels: sorted.map(([k]) => {
          const cofog = L1_TO_COFOG[k];
          const info = labels[cofog];
          return info ? (info as any)[locale] : k;
        }),
        values: sorted.map(([, v]) => v),
        colors: sorted.map(([k]) => L1_COLORS[k] ?? '#94a3b8'),
        keys: sorted.map(([k]) => k),
        isL2: false,
      };
    }

    // Show L2 subcategories for expanded category
    const cofogParent = L1_TO_COFOG[expandedCategory];
    const subcats = Object.entries(detailedBreakdown)
      .filter(([code]) => {
        const info = labels[code];
        return info?.parent === cofogParent;
      })
      .sort((a, b) => b[1] - a[1]);

    if (subcats.length === 0) {
      expandedCategory = null;
      return getChartData();
    }

    return {
      labels: subcats.map(([code]) => (labels[code] as any)?.[locale] ?? code),
      values: subcats.map(([, v]) => v),
      colors: subcats.map(() => L1_COLORS[expandedCategory!] ?? '#94a3b8'),
      keys: subcats.map(([code]) => code),
      isL2: true,
    };
  }

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const data = getChartData();

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [{
          data: data.values,
          backgroundColor: data.colors.map(c => c + (data.isL2 ? '' : 'cc')),
          borderColor: data.colors,
          borderWidth: 1,
          borderRadius: 4,
          barThickness: data.isL2 ? 28 : 24,
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
              label: (ctx) => `${ctx.parsed.x.toFixed(2)}% of GDP`,
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
        onClick: (_event, elements) => {
          if (!expandedCategory && elements.length > 0 && detailedBreakdown) {
            const idx = elements[0].index;
            const key = getChartData().keys[idx];
            const cofog = L1_TO_COFOG[key];
            // Check if subcategories exist
            const hasSubs = Object.entries(detailedBreakdown).some(([code]) => labels[code]?.parent === cofog);
            if (hasSubs) {
              expandedCategory = key;
              createChart();
            }
          }
        },
        onHover: (event, elements) => {
          const target = event.native?.target as HTMLElement | undefined;
          if (target && !expandedCategory && detailedBreakdown) {
            target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          }
        },
      },
    });
  }

  function goBack() {
    expandedCategory = null;
    createChart();
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());

  const chartHeight = $derived(expandedCategory ? 350 : 400);
  const parentLabel = $derived(() => {
    if (!expandedCategory) return '';
    const cofog = L1_TO_COFOG[expandedCategory];
    return (labels[cofog] as any)?.[locale] ?? expandedCategory;
  });
</script>

<div class="drilldown-card">
  {#if expandedCategory}
    <div class="breadcrumb">
      <button onclick={goBack} class="back-btn">
        &larr; {locale === 'fr' ? 'Toutes les catégories' : 'All categories'}
      </button>
      <span class="current-cat">{parentLabel()}</span>
    </div>
  {:else if detailedBreakdown}
    <p class="hint">{locale === 'fr' ? 'Cliquez sur une catégorie pour voir le détail' : 'Click a category to drill down into subcategories'}</p>
  {/if}

  <div class="chart-wrapper" style="height: {chartHeight}px">
    <canvas bind:this={canvas}></canvas>
  </div>

  {#if !expandedCategory}
    <div class="admin-callout">
      <strong>{locale === 'fr' ? 'Note' : 'Note'}:</strong> {adminNote}
    </div>
  {/if}
</div>

<style>
  .drilldown-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .back-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--color-primary);
  }

  .back-btn:hover {
    border-color: var(--color-primary);
    background: #eff6ff;
  }

  .current-cat {
    font-weight: 700;
    font-size: 1rem;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: 0.5rem;
  }

  .chart-wrapper {
    position: relative;
    width: 100%;
  }

  .admin-callout {
    margin-top: 1rem;
    padding: 0.5rem 0.75rem;
    background: #f8fafc;
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }
</style>

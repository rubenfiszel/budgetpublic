<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

  interface AgeGroup {
    ageRange: string;
    label: { en: string; fr: string };
    population: number;
    spendingShare: number;
    mainComponents: { en: string; fr: string };
    perCapita: number;
  }

  interface Props {
    groups: AgeGroup[];
    description: string;
    locale: string;
  }

  let { groups, description, locale }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const labels = groups.map(g => (g.label as any)[locale]);
    // Show per-capita spending and spending share side by side
    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: locale === 'fr' ? 'Part des dépenses (%)' : 'Share of spending (%)',
            data: groups.map(g => g.spendingShare),
            backgroundColor: COLORS.map(c => c + 'cc'),
            borderColor: COLORS,
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
          },
          {
            label: locale === 'fr' ? 'Part de la population (%)' : 'Share of population (%)',
            data: groups.map(g => g.population),
            backgroundColor: COLORS.map(() => '#e2e8f0'),
            borderColor: COLORS.map(() => '#94a3b8'),
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: 'y',
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx !== undefined) {
                  const g = groups[idx];
                  const perCapLabel = locale === 'fr' ? 'Par habitant' : 'Per capita';
                  const compLabel = locale === 'fr' ? 'Composantes' : 'Components';
                  return `${perCapLabel}: ${g.perCapita.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}€\n${compLabel}: ${(g.mainComponents as any)[locale]}`;
                }
                return '';
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${val}%` },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());
</script>

<div class="age-card">
  <div class="chart-wrapper">
    <canvas bind:this={canvas}></canvas>
  </div>
  <p class="description">{description}</p>

  <div class="age-details">
    {#each groups as group, i}
      <div class="age-row" style="border-left-color: {COLORS[i]}">
        <strong>{(group.label as any)[locale]}</strong>
        <span class="pop">{group.population}% {locale === 'fr' ? 'de la pop.' : 'of pop.'} &rarr; {group.spendingShare}% {locale === 'fr' ? 'des dépenses' : 'of spending'}</span>
        <span class="components">{(group.mainComponents as any)[locale]}</span>
        <span class="per-capita">{locale === 'fr' ? 'Par habitant' : 'Per capita'}: <strong>{group.perCapita.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}€</strong></span>
      </div>
    {/each}
  </div>
</div>

<style>
  .age-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }
  .chart-wrapper { position: relative; height: 300px; }
  .description { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 1rem; line-height: 1.5; }

  .age-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  @media (max-width: 600px) { .age-details { grid-template-columns: 1fr; } }

  .age-row {
    padding: 0.75rem;
    border-left: 4px solid;
    background: #fafafa;
    border-radius: 0 8px 8px 0;
    font-size: 0.85rem;
  }
  .age-row strong { display: block; margin-bottom: 0.2rem; }
  .pop { display: block; color: var(--color-text-muted); font-size: 0.8rem; }
  .components { display: block; font-size: 0.75rem; color: var(--color-text-muted); margin-top: 0.2rem; line-height: 1.4; }
  .per-capita { display: block; font-size: 0.8rem; margin-top: 0.25rem; }
</style>

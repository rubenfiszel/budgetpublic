<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface Decile {
    label: string;
    labelFr: string;
    shareOfIncomeTax: number;
    avgTaxRate: number;
    monthlyIncome: number;
  }

  interface Props {
    deciles: Decile[];
    description: string;
    locale: string;
  }

  let { deciles, description, locale }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const labels = deciles.map(d => locale === 'fr' ? d.labelFr : d.label);

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: locale === 'fr' ? "Part de l'IRPP payée" : 'Share of income tax paid',
            data: deciles.map(d => d.shareOfIncomeTax),
            backgroundColor: deciles.map((d, i) => i === 9 ? '#dc2626' : i >= 7 ? '#3b82f6' : '#93c5fd'),
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (ctx) => {
                const d = deciles[ctx.dataIndex];
                const incLabel = locale === 'fr' ? 'Revenu mensuel moyen' : 'Avg monthly income';
                const rateLabel = locale === 'fr' ? 'Taux moyen' : 'Avg tax rate';
                return `${rateLabel}: ${d.avgTaxRate}%\n${incLabel}: ${d.monthlyIncome.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')}€`;
              },
              label: (ctx) => `${ctx.parsed.y.toFixed(1)}% ${locale === 'fr' ? 'de l\'IRPP total' : 'of total income tax'}`,
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

<div class="decile-card">
  <div class="chart-wrapper">
    <canvas bind:this={canvas}></canvas>
  </div>
  <p class="description">{description}</p>
  <div class="highlight-box">
    <strong>D10</strong> ({locale === 'fr' ? 'les 10% les plus riches' : 'top 10%'}):
    {deciles[9].shareOfIncomeTax}% {locale === 'fr' ? "de l'impôt sur le revenu" : 'of all income tax'}
    — {locale === 'fr' ? 'taux moyen' : 'avg rate'} {deciles[9].avgTaxRate}%
  </div>
</div>

<style>
  .decile-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }
  .chart-wrapper { position: relative; height: 300px; }
  .description { font-size: 0.85rem; color: var(--color-text-muted); margin-top: 1rem; line-height: 1.5; }
  .highlight-box {
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #991b1b;
  }
</style>

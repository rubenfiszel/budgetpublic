<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

  Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

  interface IncomeLevel {
    totalWedge: number;
    incomeTax: number;
    employeeSSC: number;
    employerSSC: number;
  }

  interface Props {
    incomeLevels: Record<string, IncomeLevel>;
    incomeLevelLabels: Record<string, { en: string; fr: string }>;
    corporateShare: number;
    individualShare: number;
    locale: string;
    countryName: string;
  }

  let { incomeLevels, incomeLevelLabels, corporateShare, individualShare, locale, countryName }: Props = $props();

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const itLabel = locale === 'fr' ? 'Impôt sur le revenu' : 'Income Tax';
  const eeSscLabel = locale === 'fr' ? 'Cotisations salarié' : 'Employee SSC';
  const erSscLabel = locale === 'fr' ? 'Cotisations employeur' : 'Employer SSC';

  function createChart() {
    if (!canvas) return;
    chart?.destroy();

    const levels = ['AW67', 'AW100', 'AW167'];
    const labels = levels.map(l => (incomeLevelLabels[l] as any)?.[locale] ?? l);
    const data = levels.map(l => incomeLevels[l]);

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: itLabel,
            data: data.map(d => d?.incomeTax ?? 0),
            backgroundColor: '#3b82f6',
            borderRadius: 4,
          },
          {
            label: eeSscLabel,
            data: data.map(d => d?.employeeSSC ?? 0),
            backgroundColor: '#10b981',
            borderRadius: 4,
          },
          {
            label: erSscLabel,
            data: data.map(d => d?.employerSSC ?? 0),
            backgroundColor: '#f59e0b',
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
              afterBody: (items) => {
                const idx = items[0]?.dataIndex;
                if (idx !== undefined) {
                  const level = levels[idx];
                  const d = incomeLevels[level];
                  return `Total tax wedge: ${d?.totalWedge ?? 0}%`;
                }
                return '';
              },
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { callback: (val) => `${val}%` },
            grid: { color: 'rgba(0,0,0,0.06)' },
            title: {
              display: true,
              text: locale === 'fr' ? '% du coût du travail' : '% of labour costs',
              font: { size: 12 },
            },
          },
        },
      },
    });
  }

  onMount(() => createChart());
  onDestroy(() => chart?.destroy());

  const otherShare = $derived(Math.max(0, 100 - corporateShare - individualShare));
</script>

<div class="tax-burden-card">
  <div class="burden-grid">
    <div class="chart-section">
      <h4>{locale === 'fr' ? 'Coin fiscal par niveau de revenu' : 'Tax Wedge by Income Level'}</h4>
      <p class="subtitle">{locale === 'fr' ? 'Célibataire sans enfant' : 'Single, no children'}</p>
      <div class="chart-wrapper">
        <canvas bind:this={canvas}></canvas>
      </div>
    </div>

    <div class="split-section">
      <h4>{locale === 'fr' ? 'Qui paie ?' : 'Who Pays?'}</h4>
      <div class="split-bar">
        <div class="split-segment indiv" style="width: {individualShare}%">
          <span class="split-label">{locale === 'fr' ? 'Individus' : 'Individuals'}</span>
          <span class="split-value">{individualShare.toFixed(0)}%</span>
        </div>
        <div class="split-segment corp" style="width: {corporateShare}%">
          <span class="split-label">{locale === 'fr' ? 'Entreprises' : 'Corporations'}</span>
          <span class="split-value">{corporateShare.toFixed(0)}%</span>
        </div>
        {#if otherShare > 1}
          <div class="split-segment other" style="width: {otherShare}%">
            <span class="split-label">{locale === 'fr' ? 'Autres' : 'Other'}</span>
            <span class="split-value">{otherShare.toFixed(0)}%</span>
          </div>
        {/if}
      </div>
      <p class="split-note">{locale === 'fr' ? '% des recettes fiscales totales' : '% of total tax revenue'}</p>

      <div class="wedge-summary">
        {#each ['AW67', 'AW100', 'AW167'] as level}
          {@const d = incomeLevels[level]}
          {#if d}
            <div class="wedge-row">
              <span class="wedge-label">{(incomeLevelLabels[level] as any)?.[locale] ?? level}</span>
              <div class="wedge-bar-track">
                <div class="wedge-bar-fill" style="width: {d.totalWedge}%; background: {level === 'AW67' ? '#93c5fd' : level === 'AW100' ? '#3b82f6' : '#1e40af'}"></div>
              </div>
              <span class="wedge-value">{d.totalWedge}%</span>
            </div>
          {/if}
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .tax-burden-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .burden-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
  }

  @media (max-width: 768px) {
    .burden-grid { grid-template-columns: 1fr; }
  }

  h4 { font-size: 1rem; font-weight: 700; margin-bottom: 0.25rem; }
  .subtitle { font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.75rem; }

  .chart-wrapper { position: relative; height: 280px; }

  .split-section { display: flex; flex-direction: column; gap: 1rem; }

  .split-bar {
    display: flex;
    height: 44px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--color-border);
  }

  .split-segment {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 50px;
    padding: 0.25rem;
  }

  .split-segment.indiv { background: #dbeafe; color: #1e40af; }
  .split-segment.corp { background: #fef3c7; color: #92400e; }
  .split-segment.other { background: #f1f5f9; color: #475569; }

  .split-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
  .split-value { font-size: 0.9rem; font-weight: 800; }
  .split-note { font-size: 0.75rem; color: var(--color-text-muted); text-align: center; }

  .wedge-summary { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }

  .wedge-row { display: flex; align-items: center; gap: 0.5rem; }
  .wedge-label { width: 140px; font-size: 0.8rem; flex-shrink: 0; color: var(--color-text-muted); }
  .wedge-bar-track { flex: 1; height: 18px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .wedge-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .wedge-value { font-size: 0.85rem; font-weight: 700; width: 40px; text-align: right; }
</style>

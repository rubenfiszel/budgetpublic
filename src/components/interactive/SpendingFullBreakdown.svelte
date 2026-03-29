<script lang="ts">
  interface Distribution {
    min: number; q1: number; median: number; q3: number; max: number;
    rank: number; total: number;
  }

  interface SpendingRow {
    label: string;
    value: number;
    pctOfTotal: number;
    color: string;
    isParent: boolean;
    dist: Distribution | null;
  }

  interface Props {
    rows: SpendingRow[];
    locale: string;
    countryName: string;
  }

  let { rows, locale, countryName }: Props = $props();

  const maxValue = $derived(Math.max(...rows.filter(r => r.isParent).map(r => r.value), 1));

  function rankLabel(dist: Distribution): string {
    if (dist.total === 0) return '';
    return `#${dist.rank}/${dist.total}`;
  }

  function rankColor(dist: Distribution, value: number): string {
    if (dist.total === 0) return '#94a3b8';
    if (value >= dist.q3) return '#dc2626'; // top quartile = high spender
    if (value >= dist.median) return '#f59e0b'; // above median
    if (value >= dist.q1) return '#3b82f6'; // below median
    return '#10b981'; // bottom quartile = low spender
  }

  // Position as percentage within the full range
  function markerPos(dist: Distribution, value: number): number {
    if (dist.max <= dist.min) return 50;
    return Math.max(2, Math.min(98, ((value - dist.min) / (dist.max - dist.min)) * 100));
  }
</script>

<div class="breakdown-card">
  <div class="breakdown-list">
    {#each rows as row}
      <div class={`row ${row.isParent ? 'parent' : 'child'}`}>
        <div class="row-label">
          {#if !row.isParent}<span class="indent"></span>{/if}
          <span class="dot" style="background: {row.color}"></span>
          <span class="name" class:bold={row.isParent} title={row.label}>{row.label}</span>
        </div>
        <div class="row-data">
          <div class="bar-track">
            <div
              class="bar-fill"
              style="width: {(row.value / maxValue) * 100}%; background: {row.color}"
            ></div>
          </div>
          <span class="row-value">{row.value.toFixed(1)}%</span>
          {#if row.dist && row.dist.total > 3}
            <div class="dist-cell" title="{countryName}: {row.value.toFixed(1)}% — Min: {row.dist.min.toFixed(1)}% | Q1: {row.dist.q1.toFixed(1)}% | Median: {row.dist.median.toFixed(1)}% | Q3: {row.dist.q3.toFixed(1)}% | Max: {row.dist.max.toFixed(1)}%">
              <div class="dist-track">
                <div class="dist-box" style="left: {markerPos(row.dist, row.dist.q1)}%; right: {100 - markerPos(row.dist, row.dist.q3)}%"></div>
                <div class="dist-median" style="left: {markerPos(row.dist, row.dist.median)}%"></div>
                <div class="dist-marker" style="left: {markerPos(row.dist, row.value)}%; background: {rankColor(row.dist, row.value)}"></div>
              </div>
              <span class="rank-label" style="color: {rankColor(row.dist, row.value)}">{rankLabel(row.dist)}</span>
            </div>
          {:else}
            <div class="dist-cell empty"></div>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="legend">
    <div class="legend-left">
      <span>{locale === 'fr' ? '% du PIB' : '% of GDP'}</span>
    </div>
    <div class="legend-right">
      <span class="legend-title">{locale === 'fr' ? 'Comparaison' : 'vs others'}</span>
      <div class="legend-items">
        <span class="legend-item"><span class="legend-dot" style="background: #e2e8f0"></span> {locale === 'fr' ? 'Q1–Q3' : 'Q1–Q3'}</span>
        <span class="legend-item"><span class="legend-line"></span> {locale === 'fr' ? 'médiane' : 'median'}</span>
        <span class="legend-item"><span class="legend-dot filled"></span> {countryName}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .breakdown-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .breakdown-list { display: flex; flex-direction: column; gap: 1px; }

  .row { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; }
  .row.parent { padding-top: 0.7rem; margin-top: 0.15rem; border-top: 1px solid #f1f5f9; }
  .row.parent:first-child { margin-top: 0; border-top: none; padding-top: 0.3rem; }

  .row-label { display: flex; align-items: center; gap: 0.4rem; width: 220px; flex-shrink: 0; }
  @media (max-width: 700px) { .row-label { width: 130px; } }

  .indent { width: 16px; flex-shrink: 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .row.parent .dot { width: 10px; height: 10px; }
  .name { font-size: 0.8rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name.bold { font-weight: 700; font-size: 0.85rem; }

  .row-data { flex: 1; display: flex; align-items: center; gap: 0.5rem; }

  .bar-track { flex: 1; height: 14px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
  .row.parent .bar-track { height: 20px; }
  .bar-fill { height: 100%; border-radius: 3px; min-width: 2px; }

  .row-value { font-size: 0.8rem; font-weight: 700; width: 42px; text-align: right; flex-shrink: 0; }
  .row.parent .row-value { font-size: 0.85rem; }

  /* Distribution mini chart */
  .dist-cell { width: 110px; flex-shrink: 0; display: flex; align-items: center; gap: 0.3rem; }
  .dist-cell.empty { width: 110px; }

  .dist-track {
    width: 70px; height: 14px; background: #f8fafc; border: 1px solid #e2e8f0;
    border-radius: 3px; position: relative; flex-shrink: 0;
  }

  .dist-box {
    position: absolute; top: 2px; bottom: 2px;
    background: #e2e8f0; border-radius: 2px;
  }

  .dist-median {
    position: absolute; top: 1px; bottom: 1px; width: 1px;
    background: #94a3b8;
  }

  .dist-marker {
    position: absolute; top: 50%; width: 8px; height: 8px;
    border-radius: 50%; transform: translate(-50%, -50%);
    border: 1.5px solid white; box-shadow: 0 0 2px rgba(0,0,0,0.3);
  }

  .rank-label { font-size: 0.65rem; font-weight: 700; white-space: nowrap; }

  /* Legend */
  .legend {
    display: flex; justify-content: space-between; align-items: flex-start;
    margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9;
    font-size: 0.75rem; color: var(--color-text-muted);
  }

  .legend-right { text-align: right; }
  .legend-title { font-weight: 600; display: block; margin-bottom: 0.25rem; }
  .legend-items { display: flex; gap: 0.75rem; }
  .legend-item { display: flex; align-items: center; gap: 0.25rem; }
  .legend-dot { width: 12px; height: 8px; border-radius: 2px; display: inline-block; }
  .legend-dot.filled { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; }
  .legend-line { width: 8px; height: 1px; background: #94a3b8; display: inline-block; }
</style>

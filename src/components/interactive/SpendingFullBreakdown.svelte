<script lang="ts">
  interface SpendingRow {
    label: string;
    value: number;
    pctOfTotal: number;
    color: string;
    isParent: boolean;
  }

  interface Props {
    rows: SpendingRow[];
    locale: string;
  }

  let { rows, locale }: Props = $props();

  const maxValue = $derived(Math.max(...rows.filter(r => r.isParent).map(r => r.value), 1));
</script>

<div class="breakdown-card">
  <div class="breakdown-list">
    {#each rows as row}
      <div class={`row ${row.isParent ? 'parent' : 'child'}`}>
        <div class="row-label">
          {#if !row.isParent}<span class="indent"></span>{/if}
          <span class="dot" style="background: {row.color}"></span>
          <span class="name" class:bold={row.isParent}>{row.label}</span>
        </div>
        <div class="row-bar-area">
          <div class="bar-track">
            <div
              class="bar-fill"
              style="width: {(row.value / maxValue) * 100}%; background: {row.color}"
            ></div>
          </div>
          <span class="row-value">{row.value.toFixed(1)}%</span>
          <span class="row-pct">({row.pctOfTotal.toFixed(0)}%)</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="legend-note">
    <span>{locale === 'fr' ? '% du PIB' : '% of GDP'}</span>
    <span class="pct-note">({locale === 'fr' ? '% des dépenses totales' : '% of total spending'})</span>
  </div>
</div>

<style>
  .breakdown-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .breakdown-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0;
  }

  .row.parent {
    padding-top: 0.7rem;
    margin-top: 0.15rem;
    border-top: 1px solid #f1f5f9;
  }

  .row.parent:first-child {
    margin-top: 0;
    border-top: none;
    padding-top: 0.3rem;
  }

  .row-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    width: 250px;
    flex-shrink: 0;
  }

  @media (max-width: 700px) {
    .row-label { width: 150px; }
  }

  .indent { width: 16px; flex-shrink: 0; }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .row.parent .dot {
    width: 10px;
    height: 10px;
  }

  .name {
    font-size: 0.8rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .name.bold {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .row-bar-area {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .bar-track {
    flex: 1;
    height: 14px;
    background: #f1f5f9;
    border-radius: 3px;
    overflow: hidden;
  }

  .row.parent .bar-track {
    height: 20px;
  }

  .bar-fill {
    height: 100%;
    border-radius: 3px;
    min-width: 2px;
  }

  .row-value {
    font-size: 0.8rem;
    font-weight: 700;
    width: 42px;
    text-align: right;
    flex-shrink: 0;
  }

  .row.parent .row-value {
    font-size: 0.85rem;
  }

  .row-pct {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    width: 35px;
    text-align: right;
    flex-shrink: 0;
  }

  .legend-note {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .pct-note { opacity: 0.7; }
</style>

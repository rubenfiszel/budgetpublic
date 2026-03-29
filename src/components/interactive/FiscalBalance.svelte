<script lang="ts">
  interface Props {
    revenue: number;
    spending: number;
    balance: number;
    debt: number;
    labels: {
      revenue: string;
      spending: string;
      balance: string;
      deficit: string;
      surplus: string;
      debt: string;
      of_gdp: string;
    };
  }

  let { revenue, spending, balance, debt, labels }: Props = $props();

  const isDeficit = $derived(balance < 0);
  const balanceLabel = $derived(isDeficit ? labels.deficit : labels.surplus);
  const balanceColor = $derived(isDeficit ? '#ef4444' : '#10b981');
  const barMax = $derived(Math.max(revenue, spending) * 1.1);
</script>

<div class="fiscal-card">
  <div class="bars">
    <div class="bar-row">
      <span class="bar-label">{labels.revenue}</span>
      <div class="bar-track">
        <div class="bar-fill revenue" style="width: {(revenue / barMax) * 100}%"></div>
        <span class="bar-value">{revenue.toFixed(1)}{labels.of_gdp}</span>
      </div>
    </div>
    <div class="bar-row">
      <span class="bar-label">{labels.spending}</span>
      <div class="bar-track">
        <div class="bar-fill spending" style="width: {(spending / barMax) * 100}%"></div>
        <span class="bar-value">{spending.toFixed(1)}{labels.of_gdp}</span>
      </div>
    </div>
  </div>

  <div class="metrics">
    <div class="metric" style="border-color: {balanceColor}">
      <span class="metric-label">{balanceLabel}</span>
      <span class="metric-value" style="color: {balanceColor}">
        {balance > 0 ? '+' : ''}{balance.toFixed(1)}%
      </span>
      <span class="metric-unit">of GDP</span>
    </div>
    <div class="metric" style="border-color: #f59e0b">
      <span class="metric-label">{labels.debt}</span>
      <span class="metric-value" style="color: #f59e0b">{debt.toFixed(1)}%</span>
      <span class="metric-unit">of GDP</span>
    </div>
  </div>
</div>

<style>
  .fiscal-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .bar-row {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .bar-label {
    width: 80px;
    font-size: 0.85rem;
    font-weight: 600;
    text-align: right;
    flex-shrink: 0;
  }

  .bar-track {
    flex: 1;
    height: 28px;
    background: #f1f5f9;
    border-radius: 6px;
    position: relative;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    border-radius: 6px;
    transition: width 0.5s ease;
  }

  .bar-fill.revenue {
    background: #3b82f6;
  }

  .bar-fill.spending {
    background: #ef4444;
  }

  .bar-value {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
  }

  .metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .metric {
    text-align: center;
    padding: 1rem;
    border-radius: 8px;
    border: 2px solid;
    background: #fafafa;
  }

  .metric-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }

  .metric-value {
    display: block;
    font-size: 1.75rem;
    font-weight: 800;
    line-height: 1.2;
  }

  .metric-unit {
    display: block;
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }
</style>

<script lang="ts">
  import { sankey as d3sankey, sankeyLinkHorizontal } from 'd3-sankey';

  interface RevenueBreakdown {
    pit: number; cit: number; ssc: number; vat: number; property: number; other: number;
  }

  interface Props {
    revenueBreakdown: RevenueBreakdown;
    spendingBreakdown: Record<string, number>;
    deficit: number;
    revenueLabels: Record<string, string>;
    spendingLabels: Record<string, string>;
    deficitLabel: string;
    surplusLabel: string;
    locale: string;
  }

  let {
    revenueBreakdown, spendingBreakdown, deficit,
    revenueLabels, spendingLabels, deficitLabel, surplusLabel, locale,
  }: Props = $props();

  const LEFT_COLORS: Record<string, string> = {
    pit: '#3b82f6', cit: '#2563eb', ssc: '#10b981',
    vat: '#f59e0b', property: '#8b5cf6', other: '#6b7280',
    _deficit: '#ef4444',
  };
  const RIGHT_COLORS: Record<string, string> = {
    social_protection: '#3b82f6', health: '#ef4444', education: '#10b981',
    economic_affairs: '#f59e0b', general_public_services: '#f97316',
    defence: '#6366f1', public_order: '#8b5cf6', environment: '#14b8a6',
    housing: '#ec4899', culture: '#6b7280', _surplus: '#10b981',
  };

  interface SNode { id: number; label: string; side: string; color: string; value: number }
  interface SLink { source: number; target: number; value: number }

  // Build the SVG string reactively
  const svgContent = $derived.by(() => {
    const W = 750;
    const H = 500;
    const margin = { top: 10, right: 190, bottom: 10, left: 190 };

    const nodes: SNode[] = [];
    const links: SLink[] = [];

    // Left: revenue sources
    const revKeys = (['pit', 'cit', 'ssc', 'vat', 'property', 'other'] as const)
      .filter(k => revenueBreakdown[k] > 0.1);
    for (const k of revKeys) {
      const v = revenueBreakdown[k];
      nodes.push({ id: nodes.length, label: `${revenueLabels[k]} (${v.toFixed(1)}%)`, side: 'left', color: LEFT_COLORS[k], value: v });
    }
    if (deficit > 0.1) {
      nodes.push({ id: nodes.length, label: `${deficitLabel} (${deficit.toFixed(1)}%)`, side: 'left', color: LEFT_COLORS._deficit, value: deficit });
    }

    const leftCount = nodes.length;

    // Right: spending categories
    const spendSorted = Object.entries(spendingBreakdown)
      .filter(([, v]) => v > 0.1)
      .sort((a, b) => b[1] - a[1]);
    for (const [k, v] of spendSorted) {
      nodes.push({ id: nodes.length, label: `${spendingLabels[k] ?? k} (${v.toFixed(1)}%)`, side: 'right', color: RIGHT_COLORS[k] ?? '#94a3b8', value: v });
    }
    if (deficit < -0.1) {
      const sv = Math.abs(deficit);
      nodes.push({ id: nodes.length, label: `${surplusLabel} (${sv.toFixed(1)}%)`, side: 'right', color: RIGHT_COLORS._surplus, value: sv });
    }

    const rightNodes = nodes.filter(n => n.side === 'right');
    const totalRight = rightNodes.reduce((s, n) => s + n.value, 0);
    if (totalRight === 0 || nodes.length < 3) return '';

    // Build proportional links
    for (let li = 0; li < leftCount; li++) {
      for (let ri = leftCount; ri < nodes.length; ri++) {
        const flow = (nodes[li].value * nodes[ri].value) / totalRight;
        if (flow > 0.01) {
          links.push({ source: li, target: ri, value: flow });
        }
      }
    }

    if (links.length === 0) return '';

    try {
      const layout = d3sankey<SNode, SLink>()
        .nodeId((d: any) => d.id)
        .nodeWidth(14)
        .nodePadding(12)
        .nodeSort(null)
        .extent([[margin.left, margin.top], [W - margin.right, H - margin.bottom]]);

      const graph = layout({
        nodes: nodes.map(n => ({ ...n })),
        links: links.map(l => ({ ...l })),
      });

      const linkPath = sankeyLinkHorizontal();
      let svg = '';

      // Links
      for (const link of graph.links) {
        const d = linkPath(link as any) ?? '';
        const srcColor = (link.source as any).color ?? '#999';
        const w = Math.max(1, (link as any).width ?? 1);
        svg += `<path d="${d}" fill="none" stroke="${srcColor}" stroke-opacity="0.3" stroke-width="${w}" class="sankey-link"/>`;
      }

      // Nodes + labels
      for (const node of graph.nodes) {
        const n = node as any;
        const h = Math.max(1, n.y1 - n.y0);
        svg += `<rect x="${n.x0}" y="${n.y0}" width="${n.x1 - n.x0}" height="${h}" fill="${n.color}" rx="3"/>`;

        const tx = n.side === 'left' ? n.x0 - 8 : n.x1 + 8;
        const anchor = n.side === 'left' ? 'end' : 'start';
        const escaped = (n.label as string).replace(/&/g, '&amp;').replace(/</g, '&lt;');
        svg += `<text x="${tx}" y="${n.y0 + h / 2}" dy="0.35em" font-size="11" font-family="-apple-system, BlinkMacSystemFont, sans-serif" fill="#334155" text-anchor="${anchor}">${escaped}</text>`;
      }

      return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${svg}</svg>`;
    } catch (e) {
      return '';
    }
  });
</script>

<div class="sankey-card">
  <div class="sankey-labels">
    <span class="side-label">{locale === 'fr' ? 'Recettes' : 'Revenue'}</span>
    <span class="side-label">{locale === 'fr' ? 'Dépenses' : 'Spending'}</span>
  </div>
  <div class="sankey-container">
    {@html svgContent}
  </div>
</div>

<style>
  .sankey-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 1.5rem;
    overflow: hidden;
  }
  .sankey-labels {
    display: flex; justify-content: space-between;
    margin-bottom: 0.5rem; padding: 0 1rem;
  }
  .side-label {
    font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted);
  }
  .sankey-container { width: 100%; }
  .sankey-container :global(.sankey-link:hover) { stroke-opacity: 0.6 !important; }
</style>

import * as dagreNS from './vendor/dagre.esm.mjs';
const dagre = dagreNS.default ?? dagreNS;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FS = 18; // 节点字号
const charW = c => (/[\x00-\xff]/.test(c) ? FS * 0.56 : FS * 1.02); // CJK≈1em，ASCII≈0.56em
const textW = s => [...String(s)].reduce((a, c) => a + charW(c), 0);

const LABEL_FS = 13; // 边标签 chip 字号
// 与 chip 字号一致地量宽：CJK≈1em、ASCII≈0.6em（修掉「ASCII 当全角」的高估）
const labelW = s => [...String(s)].reduce((a, c) => a + (/[\x00-\xff]/.test(c) ? LABEL_FS * 0.6 : LABEL_FS * 1.0), 0);
// chip 实际渲染尺寸；布局预留与渲染描边共用此函数，保证「预留 == 实画」不再漂移
const chipSize = label => ({ w: Math.ceil(labelW(label)) + 16, h: 24 });
function sizeFor(type, label) {
  const tw = textW(label);
  if (type === 'decision') return { width: Math.max(96, tw + 64), height: 84 };
  if (type === 'terminal') return { width: Math.max(96, tw + 52), height: 52 };
  return { width: Math.max(96, tw + 44), height: 52 };
}

export function graphToSvg(graph, { direction = 'LR' } = {}) {
  const nodes = graph.nodes || [], edges = graph.edges || [];
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir: direction, nodesep: 44, ranksep: 64, marginx: 24, marginy: 28 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) g.setNode(String(n.id), { ...sizeFor(n.type, n.label), label: n.label, type: n.type || 'normal' });
  edges.forEach((e, i) => {
    const r = e.label ? chipSize(e.label) : { w: 0, h: 0 };
    // 预留 = chip 真实尺寸 + 两侧各 10px 清空带：dagre 在 LR 下把它计入 rank 间距，自动把节点推开让出位
    g.setEdge(String(e.from), String(e.to), { label: e.label, width: e.label ? r.w + 20 : 0, height: e.label ? r.h + 8 : 0, labelpos: 'c' }, 'e' + i);
  });
  dagre.layout(g);

  const W = Math.max(1, Math.ceil(g.graph().width || 1)), H = Math.max(1, Math.ceil(g.graph().height || 1));
  const p = [];
  p.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:auto;height:auto;max-width:100%;max-height:56vh;display:block;font-family:var(--font-display)">`);
  p.push(`<defs><marker id="dcg-arrow" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1,1 L9,5 L1,9 L3.2,5 Z" style="fill:var(--text-3)"/></marker></defs>`);

  // 边（先画，压在节点下）
  edges.forEach((e, i) => {
    const ed = g.edge(String(e.from), String(e.to), 'e' + i);
    if (!ed || !ed.points || !ed.points.length) return; // 边数据缺失则跳过，不崩
    const pts = ed.points;
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let k = 1; k < pts.length; k++) d += ` L${pts[k].x.toFixed(1)},${pts[k].y.toFixed(1)}`;
    p.push(`<path d="${d}" style="fill:none;stroke:var(--text-3);stroke-width:1.6" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#dcg-arrow)"/>`);
    if (e.label) {
      const lx = ed.x ?? pts[Math.floor(pts.length / 2)].x;
      const ly = ed.y ?? pts[Math.floor(pts.length / 2)].y;
      const { w, h } = chipSize(e.label); // 与 setEdge 预留同源，chip 居中后两侧各留 10px 清空带
      p.push(`<g><rect x="${(lx - w / 2).toFixed(1)}" y="${(ly - h / 2).toFixed(1)}" width="${w}" height="${h}" rx="7" style="fill:var(--bg);stroke:var(--border)"/><text x="${lx.toFixed(1)}" y="${(ly + 5).toFixed(1)}" text-anchor="middle" font-size="${LABEL_FS}" font-weight="600" style="fill:var(--text-2)">${esc(e.label)}</text></g>`);
    }
  });

  // 节点
  for (const id of g.nodes()) {
    const n = g.node(id);
    if (!n || n.x == null) continue; // 跳过 setEdge 自动建的幽灵节点（边引用了未声明的节点）
    const cx = n.x, cy = n.y, w = n.width, h = n.height, x = cx - w / 2, y = cy - h / 2;
    if (n.type === 'decision') {
      p.push(`<polygon points="${cx},${(cy - h / 2).toFixed(1)} ${(cx + w / 2).toFixed(1)},${cy} ${cx},${(cy + h / 2).toFixed(1)} ${(cx - w / 2).toFixed(1)},${cy}" style="fill:var(--bg-alt);stroke:var(--accent);stroke-width:1.8" stroke-linejoin="round"/>`);
      p.push(`<text x="${cx}" y="${(cy + 6).toFixed(1)}" text-anchor="middle" font-size="${FS}" font-weight="600" style="fill:var(--text)">${esc(n.label)}</text>`);
    } else if (n.type === 'terminal') {
      p.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="${h / 2}" style="fill:var(--accent)"/>`);
      p.push(`<text x="${cx}" y="${(cy + 6).toFixed(1)}" text-anchor="middle" font-size="${FS}" font-weight="600" style="fill:var(--pill-to-fg)">${esc(n.label)}</text>`);
    } else {
      p.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="12" style="fill:var(--bg-alt);stroke:var(--border-2);stroke-width:1.5"/>`);
      p.push(`<text x="${cx}" y="${(cy + 6).toFixed(1)}" text-anchor="middle" font-size="${FS}" font-weight="600" style="fill:var(--text)">${esc(n.label)}</text>`);
    }
  }
  p.push('</svg>');
  return p.join('\n');
}

export function graphToSvgBlock(graph, opts) {
  return `<figure class="dc-graph">\n${graphToSvg(graph, opts)}\n</figure>`;
}

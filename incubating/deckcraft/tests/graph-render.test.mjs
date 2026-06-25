import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphToSvg, graphToSvgBlock } from '../graph-render.mjs';

const g = {
  nodes: [
    { id: 1, label: '需求', type: 'start' },
    { id: 2, label: '设计' },
    { id: 3, label: '验收', type: 'decision' },
    { id: 4, label: '交付', type: 'terminal' },
  ],
  edges: [
    { from: 1, to: 2 },
    { from: 2, to: 3 },
    { from: 3, to: 4, label: '过' },
    { from: 3, to: 2, label: '不过' },
  ],
};

test('输出 svg，含全部节点文字', () => {
  const s = graphToSvg(g);
  assert.ok(s.startsWith('<svg'));
  for (const l of ['需求', '设计', '验收', '交付']) assert.ok(s.includes(l), '缺少 ' + l);
});

test('decision→polygon、terminal→胶囊(rx=26)、含箭头 marker', () => {
  const s = graphToSvg(g);
  assert.ok(s.includes('<polygon'), '判定应为菱形 polygon');
  assert.ok(s.includes('rx="26"'), 'terminal 应为 h/2 圆角胶囊');
  assert.ok(s.includes('marker-end="url(#dcg-arrow)"'), '应有箭头 marker');
});

test('颜色走 CSS 上下文 var()，禁止表现属性 var()', () => {
  const s = graphToSvg(g);
  assert.ok(s.includes('var(--accent)') && s.includes('var(--text)'), '应使用主题令牌');
  assert.ok(!/="var\(/.test(s), '禁止 fill="var(--x)" 这类表现属性写法（浏览器不解析）');
});

test('边标签 chip 渲染', () => {
  const s = graphToSvg(g);
  assert.ok(s.includes('过') && s.includes('不过'));
});

test('包成 figure.dc-graph', () =>
  assert.match(graphToSvgBlock(g), /^<figure class="dc-graph">[\s\S]*<\/figure>$/));

test('非整数字符串 id 不撞车（自家 emitter 无 sanitize 坑）', () => {
  const s = graphToSvg({ nodes: [{ id: 'a.b', label: 'X' }, { id: 'a-b', label: 'Y' }], edges: [{ from: 'a.b', to: 'a-b' }] });
  assert.ok(s.includes('X') && s.includes('Y'));
});

test('空图不崩', () => assert.ok(graphToSvg({ nodes: [], edges: [] }).startsWith('<svg')));

test('边引用未声明节点也不崩（降级而非抛错）', () => {
  const s = graphToSvg({ nodes: [{ id: 1, label: 'X' }], edges: [{ from: 1, to: 999 }] });
  assert.ok(s.startsWith('<svg') && s.includes('X'));
});

test('稠密多标签图：边标签 chip 不与任何节点重叠（布局预留 == 渲染尺寸的契约）', () => {
  // CC Switch 那张：5 条边全带标签 + 分叉两路汇聚，是边标签重叠的最坏情况。
  const s = graphToSvg({
    nodes: [
      { id: 'SW', label: 'CC Switch' }, { id: 'C1', label: 'claude' }, { id: 'C2', label: 'codex' },
      { id: 'PX', label: '本地代理' }, { id: 'DS', label: 'DeepSeek V4', type: 'terminal' },
    ],
    edges: [
      { from: 'SW', to: 'C1', label: '环境变量' }, { from: 'C1', to: 'DS', label: '兼容端点' },
      { from: 'C2', to: 'PX', label: 'OpenAI' }, { from: 'SW', to: 'PX', label: '内置启动' },
      { from: 'PX', to: 'DS', label: '转发' },
    ],
  });
  const rects = [...s.matchAll(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([-\d.]+)" height="([-\d.]+)" rx="([-\d.]+)"/g)]
    .map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], rx: +m[5] }));
  const polys = [...s.matchAll(/<polygon points="([^"]+)"/g)].map(m => {
    const xs = [], ys = [];
    m[1].trim().split(/\s+/).forEach(pt => { const [a, b] = pt.split(',').map(Number); xs.push(a); ys.push(b); });
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  });
  const chips = rects.filter(r => r.rx === 7);          // 边标签 chip 用 rx="7"
  const nodes = [...rects.filter(r => r.rx !== 7), ...polys]; // 节点：rx≠7 的矩形 + 菱形 polygon
  const hit = (a, b) => a.x + 1 < b.x + b.w && a.x + a.w - 1 > b.x && a.y + 1 < b.y + b.h && a.y + a.h - 1 > b.y; // 内缩 1px 防浮点贴边误报
  assert.ok(chips.length >= 5, '应抠到 5 个边标签 chip，实际 ' + chips.length);
  for (const c of chips) for (const n of nodes)
    assert.ok(!hit(c, n), `边标签 chip 压在节点上：chip@${c.x},${c.y} ${c.w}x${c.h} vs node@${n.x},${n.y} ${n.w}x${n.h}`);
});

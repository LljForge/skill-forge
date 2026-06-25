// spec: { type:'bar'|'line'|'pie', title?, categories:[..], series:[{name?, values:[..]}] }
// 不再手画 SVG；发射一个带 data-echarts(JSON) 的占位 figure，运行时由模板里的 ECharts 渲染。
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
// 防御性归一化：去千分位逗号、百分号、常见货币符与空白；解析不出 → 0（绝不 NaN）。
// 注意：单位换算（如「万」）是调用方/模型的职责，这里只做符号清洗。
const num = v => { const n = Number(String(v).replace(/[,，¥￥$%\s]/g, '')); return Number.isFinite(n) ? n : 0; };

export function renderChart(spec) {
  const type = ['bar', 'line', 'pie'].includes(spec.type) ? spec.type : 'bar';
  const categories = (spec.categories || []).map(String);
  const series = (spec.series || []).map(s => ({ name: s.name, values: (s.values || []).map(num) }));
  const clean = { type, title: spec.title, categories, series };
  return `<figure class="dc-chart" data-echarts='${esc(JSON.stringify(clean))}'></figure>`;
}

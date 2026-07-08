/*
Usage guide
===========
1. Open index.html directly in a modern desktop browser or host these three files on GitHub Pages.
2. Set the fixed kiosk screen size and background in Screen Settings.
3. Adjust spans, spawns, nudges, z-indexes, and clickability; every change updates the iframe preview immediately.
4. Use the export buttons to download screen_name.html, style.css, and main.js for the finished kiosk page.
5. The exported page is static and browser-only. Edit exported placeholder click handlers as needed.
*/

const DEFAULTS = {
  screenName: 'demo-screen',
  width: 1080,
  height: 1920,
  background: '#b50029',
  spanCount: 3,
  spanHeight: 480,
  spawnCount: 3,
  spawnWidth: 300,
  spawnHeight: 300
};

const state = {
  screenName: DEFAULTS.screenName,
  width: DEFAULTS.width,
  height: DEFAULTS.height,
  background: DEFAULTS.background,
  evenVerticalSpacing: true,
  spans: []
};

const els = {};

function init() {
  cacheElements();
  state.spans = createSpans(DEFAULTS.spanCount, []);
  syncScreenInputs();
  renderSpanControls();
  updatePreview();
  bindGlobalEvents();
}

function cacheElements() {
  els.previewStage = document.getElementById('previewStage');
  els.previewFrame = document.getElementById('previewFrame');
  els.previewMeta = document.getElementById('previewMeta');
  els.screenName = document.getElementById('screenName');
  els.screenWidth = document.getElementById('screenWidth');
  els.screenHeight = document.getElementById('screenHeight');
  els.backgroundColor = document.getElementById('backgroundColor');
  els.spanCount = document.getElementById('spanCount');
  els.evenVerticalSpacing = document.getElementById('evenVerticalSpacing');
  els.spanControls = document.getElementById('spanControls');
  els.downloadHtml = document.getElementById('downloadHtml');
  els.downloadCss = document.getElementById('downloadCss');
  els.downloadJs = document.getElementById('downloadJs');
}

function bindGlobalEvents() {
  [els.screenName, els.screenWidth, els.screenHeight, els.backgroundColor, els.evenVerticalSpacing].forEach(input => {
    input.addEventListener('input', () => {
      readScreenInputs();
      updatePreview();
    });
  });

  els.spanCount.addEventListener('input', () => {
    readScreenInputs();
    state.spans = createSpans(toInt(els.spanCount.value, 0), state.spans);
    renderSpanControls();
    updatePreview();
  });

  els.downloadHtml.addEventListener('click', () => downloadFile(`${safeFileName(state.screenName)}.html`, generateExportHtml()));
  els.downloadCss.addEventListener('click', () => downloadFile('style.css', generateExportCss(false)));
  els.downloadJs.addEventListener('click', () => downloadFile('main.js', generateExportJs()));
  window.addEventListener('resize', scalePreviewFrame);
}

function syncScreenInputs() {
  els.screenName.value = state.screenName;
  els.screenWidth.value = state.width;
  els.screenHeight.value = state.height;
  els.backgroundColor.value = state.background;
  els.spanCount.value = state.spans.length;
  els.evenVerticalSpacing.checked = state.evenVerticalSpacing;
}

function readScreenInputs() {
  state.screenName = els.screenName.value.trim() || DEFAULTS.screenName;
  state.width = toInt(els.screenWidth.value, DEFAULTS.width);
  state.height = toInt(els.screenHeight.value, DEFAULTS.height);
  state.background = els.backgroundColor.value || DEFAULTS.background;
  state.evenVerticalSpacing = els.evenVerticalSpacing.checked;
}

function createSpans(count, oldSpans) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const old = oldSpans[index];
    const span = old ? { ...old } : {
      id: `span-${index + 1}`,
      height: DEFAULTS.spanHeight,
      nudgeY: 0,
      spawnCount: DEFAULTS.spawnCount,
      defaultSpawnWidth: DEFAULTS.spawnWidth,
      defaultSpawnHeight: DEFAULTS.spawnHeight,
      padding: 60,
      spacing: 30,
      evenHorizontalSpacing: true,
      spawns: []
    };
    span.spawns = createSpawns(span.spawnCount, span.spawns, span, index);
    return span;
  });
}

function createSpawns(count, oldSpawns, span, spanIndex) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => {
    const old = oldSpawns[index];
    return old ? { ...old } : {
      id: `${span.id || `span-${spanIndex + 1}`}-spawn-${index + 1}`,
      width: span.defaultSpawnWidth,
      height: span.defaultSpawnHeight,
      nudgeX: 0,
      nudgeY: 0,
      zIndex: index + 1,
      clickable: false
    };
  });
}

function renderSpanControls() {
  els.spanControls.innerHTML = '';
  state.spans.forEach((span, spanIndex) => {
    const card = document.createElement('div');
    card.className = 'span-card';
    card.innerHTML = `
      <h4>Span ${spanIndex + 1}</h4>
      <div class="grid three-col">
        ${inputHtml('Span ID', `span-${spanIndex}-id`, span.id, 'text')}
        ${inputHtml('Height', `span-${spanIndex}-height`, span.height)}
        ${inputHtml('Vertical nudge', `span-${spanIndex}-nudgeY`, span.nudgeY)}
        ${inputHtml('Spawn count', `span-${spanIndex}-spawnCount`, span.spawnCount)}
        ${inputHtml('Default spawn W', `span-${spanIndex}-defaultSpawnWidth`, span.defaultSpawnWidth)}
        ${inputHtml('Default spawn H', `span-${spanIndex}-defaultSpawnHeight`, span.defaultSpawnHeight)}
        ${inputHtml('Horizontal padding', `span-${spanIndex}-padding`, span.padding)}
        ${inputHtml('Spacing', `span-${spanIndex}-spacing`, span.spacing)}
        <label class="checkbox-label"><input id="span-${spanIndex}-evenHorizontalSpacing" type="checkbox" ${span.evenHorizontalSpacing ? 'checked' : ''}> Even horizontal spacing</label>
      </div>
      <div class="spawn-list" id="spawn-list-${spanIndex}"></div>
    `;
    els.spanControls.appendChild(card);
    bindSpanInputs(spanIndex);
    renderSpawnControls(spanIndex);
  });
}

function inputHtml(label, id, value, type = 'number') {
  const attrs = type === 'number' ? 'step="1"' : '';
  return `<label>${label}<input id="${id}" type="${type}" value="${escapeAttr(value)}" ${attrs}></label>`;
}

function bindSpanInputs(spanIndex) {
  const fields = ['id', 'height', 'nudgeY', 'defaultSpawnWidth', 'defaultSpawnHeight', 'padding', 'spacing'];
  fields.forEach(field => {
    document.getElementById(`span-${spanIndex}-${field}`).addEventListener('input', event => {
      state.spans[spanIndex][field] = field === 'id' ? event.target.value.trim() : toInt(event.target.value, 0);
      updatePreview();
    });
  });
  document.getElementById(`span-${spanIndex}-evenHorizontalSpacing`).addEventListener('input', event => {
    state.spans[spanIndex].evenHorizontalSpacing = event.target.checked;
    updatePreview();
  });
  document.getElementById(`span-${spanIndex}-spawnCount`).addEventListener('input', event => {
    const span = state.spans[spanIndex];
    span.spawnCount = toInt(event.target.value, 0);
    span.spawns = createSpawns(span.spawnCount, span.spawns, span, spanIndex);
    renderSpawnControls(spanIndex);
    updatePreview();
  });
}

function renderSpawnControls(spanIndex) {
  const list = document.getElementById(`spawn-list-${spanIndex}`);
  list.innerHTML = '';
  state.spans[spanIndex].spawns.forEach((spawn, spawnIndex) => {
    const card = document.createElement('div');
    card.className = 'spawn-card';
    card.innerHTML = `
      <h5>Spawn ${spawnIndex + 1}</h5>
      <div class="grid three-col">
        ${inputHtml('Spawn ID', `spawn-${spanIndex}-${spawnIndex}-id`, spawn.id, 'text')}
        ${inputHtml('Width', `spawn-${spanIndex}-${spawnIndex}-width`, spawn.width)}
        ${inputHtml('Height', `spawn-${spanIndex}-${spawnIndex}-height`, spawn.height)}
        ${inputHtml('Nudge X', `spawn-${spanIndex}-${spawnIndex}-nudgeX`, spawn.nudgeX)}
        ${inputHtml('Nudge Y', `spawn-${spanIndex}-${spawnIndex}-nudgeY`, spawn.nudgeY)}
        ${inputHtml('Z-index', `spawn-${spanIndex}-${spawnIndex}-zIndex`, spawn.zIndex)}
        <label class="checkbox-label"><input id="spawn-${spanIndex}-${spawnIndex}-clickable" type="checkbox" ${spawn.clickable ? 'checked' : ''}> Clickable</label>
      </div>
    `;
    list.appendChild(card);
    bindSpawnInputs(spanIndex, spawnIndex);
  });
}

function bindSpawnInputs(spanIndex, spawnIndex) {
  ['id', 'width', 'height', 'nudgeX', 'nudgeY', 'zIndex'].forEach(field => {
    document.getElementById(`spawn-${spanIndex}-${spawnIndex}-${field}`).addEventListener('input', event => {
      state.spans[spanIndex].spawns[spawnIndex][field] = field === 'id' ? event.target.value.trim() : toInt(event.target.value, 0);
      updatePreview();
    });
  });
  document.getElementById(`spawn-${spanIndex}-${spawnIndex}-clickable`).addEventListener('input', event => {
    state.spans[spanIndex].spawns[spawnIndex].clickable = event.target.checked;
    updatePreview();
  });
}

function getLayout() {
  const spanPositions = calculateSpanPositions();
  return state.spans.map((span, spanIndex) => ({
    ...span,
    top: spanPositions[spanIndex],
    spawns: span.spawns.map((spawn, spawnIndex) => ({
      ...spawn,
      left: calculateSpawnLeft(span, spawn, spawnIndex),
      top: Math.round((span.height - spawn.height) / 2) + spawn.nudgeY
    }))
  }));
}

function calculateSpanPositions() {
  if (!state.spans.length) return [];
  if (!state.evenVerticalSpacing) {
    let cursor = 0;
    return state.spans.map(span => {
      const top = cursor + span.nudgeY;
      cursor += span.height;
      return top;
    });
  }
  const totalSpanHeight = state.spans.reduce((sum, span) => sum + span.height, 0);
  const gap = (state.height - totalSpanHeight) / (state.spans.length + 1);
  let cursor = gap;
  return state.spans.map(span => {
    const top = Math.round(cursor + span.nudgeY);
    cursor += span.height + gap;
    return top;
  });
}

function calculateSpawnLeft(span, spawn, spawnIndex) {
  const spawns = span.spawns;
  const totalWidth = spawns.reduce((sum, item) => sum + item.width, 0);
  const available = state.width - (span.padding * 2) - totalWidth;
  const autoGap = spawns.length > 1 ? available / (spawns.length - 1) : available / 2;
  let left = spawns.length > 1 ? span.padding : span.padding + autoGap;
  for (let i = 0; i < spawnIndex; i += 1) left += spawns[i].width + (span.evenHorizontalSpacing ? autoGap : span.spacing);
  return Math.round(left + spawn.nudgeX);
}

function updatePreview() {
  els.previewMeta.textContent = `${state.width} × ${state.height}`;
  els.previewFrame.width = state.width;
  els.previewFrame.height = state.height;
  els.previewFrame.srcdoc = generatePreviewDocument();
  scalePreviewFrame();
}

function scalePreviewFrame() {
  const pad = 32;
  const scale = Math.min((els.previewStage.clientWidth - pad) / state.width, (els.previewStage.clientHeight - pad) / state.height, 1);
  els.previewFrame.style.width = `${state.width}px`;
  els.previewFrame.style.height = `${state.height}px`;
  els.previewFrame.style.transform = `scale(${Math.max(scale, 0.05)})`;
}

function generatePreviewDocument() {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${generateExportCss(true)}</style></head><body>${generateScreenMarkup(true)}</body></html>`;
}

function generateScreenMarkup(showLabels) {
  const spans = getLayout().map(span => `    <div id="${escapeAttr(span.id)}" class="span" style="top:${span.top}px;height:${span.height}px;">
${span.spawns.map(spawn => `      <div id="${escapeAttr(spawn.id)}" class="spawn" style="left:${spawn.left}px;top:${spawn.top}px;width:${spawn.width}px;height:${spawn.height}px;z-index:${spawn.zIndex};">${showLabels ? escapeHtml(spawn.id) : ''}</div>`).join('\n')}
    </div>`).join('\n');
  return `  <div id="screenSize">\n${spans}\n  </div>`;
}

function generateExportHtml() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${state.width}, height=${state.height}, initial-scale=1">
  <title>${escapeHtml(state.screenName)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${generateScreenMarkup(false)}
  <script src="main.js"></script>
</body>
</html>
`;
}

function generateExportCss(debugBorders) {
  const borderCss = debugBorders ? `
#screenSize { border: 2px solid rgba(255,255,255,.75); }
.span { border: 2px solid rgba(255,255,255,.55); }
.spawn { border: 2px solid rgba(255,255,255,.8); }
` : '';
  return `html, body {
  margin: 0;
  padding: 0;
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
}

body {
  position: relative;
  font-family: Arial, Helvetica, sans-serif;
}

#screenSize {
  position: relative;
  width: ${state.width}px;
  height: ${state.height}px;
  overflow: hidden;
  background: ${state.background};
}

.span {
  position: absolute;
  left: 0;
  width: ${state.width}px;
  overflow: visible;
}

.spawn {
  position: absolute;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
}

/* Debug borders are off by default in exported kiosk files.
   Uncomment this block while troubleshooting layout alignment.
#screenSize { border: 2px solid rgba(255,255,255,.75); }
.span { border: 2px solid rgba(255,255,255,.55); }
.spawn { border: 2px solid rgba(255,255,255,.8); }
*/
${borderCss}`;
}

function generateExportJs() {
  const handlers = [];
  state.spans.forEach(span => span.spawns.filter(spawn => spawn.clickable).forEach(spawn => {
    const fn = `on${toPascalCase(spawn.id)}Click`;
    handlers.push(`  function ${fn}() {\n    console.log("${escapeJs(spawn.id)} clicked");\n  }\n\n  document.getElementById("${escapeJs(spawn.id)}").addEventListener("click", ${fn});`);
  }));
  return `document.addEventListener("DOMContentLoaded", function () {
${handlers.length ? handlers.join('\n\n') : '  // No clickable spawns were selected in the builder.'}
});
`;
}

function downloadFile(fileName, contents) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toInt(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPascalCase(value) {
  const cleaned = String(value || 'spawn').replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  const pascal = cleaned.split(/\s+/).filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
  return pascal || 'Spawn';
}

function safeFileName(value) {
  return String(value || DEFAULTS.screenName).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || DEFAULTS.screenName;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function escapeAttr(value) { return escapeHtml(value); }
function escapeJs(value) { return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

document.addEventListener('DOMContentLoaded', init);

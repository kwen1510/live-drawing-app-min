const DEFAULTS = {
  width: 800,
  height: 600,
  defaultColor: '#111827',
  defaultSize: 2.2,
  minSize: 1,
  maxSize: 12,
  eraserMultiplier: 5.2,
};

export function initCanvasApp(options){
  const {
    root,
    stage,
    canvas,
    colorButtons = [],
    toolButtons = [],
    undoButton,
    redoButton,
    clearButton,
    stylusToggle,
    sizeSlider,
    sizeLabel,
    sizePreview,
    role = 'participant',
    statusElement,
    statusText,
    channelName = 'canvas-sync',
    broadcastPayloadFormatter,
    onPathCommitted,
    onRemotePath,
    shouldAcceptRemotePath,
  } = options ?? {};

  if(!root || !stage || !canvas){
    throw new Error('initCanvasApp requires root, stage, and canvas elements.');
  }

  const cfg = { ...DEFAULTS, ...options?.dimensions };

  const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });

  const tool = {
    color: cfg.defaultColor,
    size: cfg.defaultSize,
    mode: 'pen',
    stylusOnly: true,
  };

  const state = {
    drawing: false,
    pointerId: null,
    currentPath: null,
    paths: [],
    undoStack: [],
    redoStack: [],
    eraseBatch: null,
  };

  const supportsBroadcast = typeof BroadcastChannel === 'function';
  const channel = supportsBroadcast ? new BroadcastChannel(channelName) : null;
  let statusTimeout = null;

  const statusEl = statusElement ?? statusText ?? null;
  const statusLabel = statusText ?? statusElement ?? null;

  function showStatus(message, tone = 'ready'){
    if(!statusEl && !statusLabel) return;
    if(statusEl){
      statusEl.dataset.tone = tone;
    }
    if(statusLabel){
      statusLabel.textContent = message;
    }
    if(statusTimeout){
      clearTimeout(statusTimeout);
      statusTimeout = null;
    }
    if(tone !== 'ready'){
      statusTimeout = setTimeout(() => {
        if(statusEl){ statusEl.dataset.tone = 'ready'; }
        if(statusLabel){ statusLabel.textContent = 'Ready'; }
      }, 2500);
    }
  }

  function fitCanvasToStage(){
    const cs = getComputedStyle(stage);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const availW = Math.max(0, stage.clientWidth - padX);
    const availH = Math.max(0, stage.clientHeight - padY);

    const scale = Math.min(availW / cfg.width, availH / cfg.height, 1);
    canvas.style.width = (cfg.width * scale) + 'px';
    canvas.style.height = (cfg.height * scale) + 'px';
  }

  const stageObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => fitCanvasToStage())
    : null;
  if(stageObserver){
    stageObserver.observe(stage);
  }

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const eraserSize = () => clamp(tool.size * cfg.eraserMultiplier, cfg.minSize * cfg.eraserMultiplier, cfg.maxSize * cfg.eraserMultiplier);
  const baseWidth = () => tool.mode === 'eraser' ? eraserSize() : tool.size;

  function resetCanvas(){
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0, cfg.width, cfg.height);
  }

  function updateColorUI(){
    colorButtons.forEach(btn => {
      const active = btn.dataset.color === tool.color && tool.mode !== 'eraser';
      btn.classList.toggle('is-active', active);
    });
  }

  function updateToolUI(){
    toolButtons.forEach(btn => btn.classList.toggle('is-active', btn.dataset.tool === tool.mode));
  }

  function updateSizeUI(){
    if(sizeSlider){
      sizeSlider.value = tool.size;
    }
    if(sizeLabel){
      sizeLabel.textContent = `${(+tool.size).toFixed(1)} px`;
    }
    if(sizePreview){
      const previewSize = Math.round((tool.size - cfg.minSize) / (cfg.maxSize - cfg.minSize) * 28 + 10);
      sizePreview.style.width = previewSize + 'px';
      sizePreview.style.height = previewSize + 'px';
      sizePreview.style.background = tool.mode === 'eraser' ? '#ffffff' : tool.color;
    }
  }

  function updateHistoryUI(){
    if(undoButton){ undoButton.disabled = state.undoStack.length === 0; }
    if(redoButton){ redoButton.disabled = state.redoStack.length === 0; }
    if(clearButton){ clearButton.disabled = state.paths.length === 0; }
  }

  function canvasPoint(e){
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (canvas.width / r.width);
    const y = (e.clientY - r.top) * (canvas.height / r.height);
    return { x, y };
  }

  function supportedPointer(e){
    const type = (e.pointerType || '').toLowerCase();
    if(tool.stylusOnly) return type === '' || type === 'pen' || type === 'mouse';
    return type === '' || type === 'pen' || type === 'mouse' || type === 'touch';
  }

  function drawDot(pt, width, color, erase){
    const r = Math.max(0.45 * width, Math.min(0.8 * width, 0.5 * width));
    ctx.save();
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fillStyle = erase ? '#000' : color;
    ctx.fill();
    ctx.restore();
  }

  function strokeLiveBegin(pt, width, color, erase){
    ctx.save();
    ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = erase ? '#000' : color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  }

  const strokeLiveTo = (pt) => { ctx.lineTo(pt.x, pt.y); ctx.stroke(); };
  const strokeLiveEnd = () => { ctx.restore(); };

  function renderAll(){
    resetCanvas();
    state.paths.forEach(path => {
      if(!path.points.length){ return; }
      if(path.points.length === 1){
        drawDot(path.points[0], path.width, path.color, path.erase);
        return;
      }
      strokeLiveBegin(path.points[0], path.width, path.color, path.erase);
      for(let i = 1; i < path.points.length; i++){
        strokeLiveTo(path.points[i]);
      }
      strokeLiveEnd();
    });
  }

  const dist = (a,b) => Math.hypot(a.x - b.x, a.y - b.y);
  function distToSeg(p,a,b){
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const wx = p.x - a.x;
    const wy = p.y - a.y;
    const c = vx * vx + vy * vy;
    if(!c) return dist(p,a);
    let t = (wx * vx + wy * vy) / c;
    t = clamp(t, 0, 1);
    const cx = a.x + t * vx;
    const cy = a.y + t * vy;
    return Math.hypot(p.x - cx, p.y - cy);
  }

  function hitStrokeIndex(pt){
    for(let i = state.paths.length - 1; i >= 0; i--){
      const path = state.paths[i];
      const pts = path.points;
      if(!pts.length) continue;
      const w = path.width;
      const pad = Math.max(w * 0.6, 6);
      if(pts.length === 1){
        if(dist(pt, pts[0]) <= Math.max(0.5 * w, 6) + pad) return i;
        continue;
      }
      for(let j = 1; j < pts.length; j++){
        const d = distToSeg(pt, pts[j-1], pts[j]);
        if(d <= Math.max(0.6 * w, 6) + pad) return i;
      }
    }
    return -1;
  }

  function deepClonePath(path){
    return {
      color: path.color,
      width: path.width,
      erase: path.erase,
      points: path.points.map(pt => ({ x: pt.x, y: pt.y })),
    };
  }

  const deepClonePaths = (arr) => arr.map(deepClonePath);

  function broadcastStroke(path){
    if(!channel) return;
    const basePath = deepClonePath(path);
    let extra = {};
    if(typeof broadcastPayloadFormatter === 'function'){
      try{
        extra = broadcastPayloadFormatter(basePath, { role }) || {};
      }catch(err){
        console.warn('broadcastPayloadFormatter error', err);
        extra = {};
      }
    }
    const message = { type: 'strokeComplete', from: role, path: basePath };
    if(extra && typeof extra === 'object'){
      Object.assign(message, extra);
      if(Object.prototype.hasOwnProperty.call(extra, 'path') && extra.path){
        message.path = extra.path;
      }
    }
    channel.postMessage(message);
    showStatus(`Stroke sent to ${role === 'teacher' ? 'students' : 'teacher'}`, 'sent');
  }

  function commitPath(path, { broadcast = true } = {}){
    state.paths.push(path);
    state.undoStack.push({ type: 'draw', path });
    state.redoStack.length = 0;
    renderAll();
    updateHistoryUI();
    if(typeof onPathCommitted === 'function'){
      onPathCommitted(deepClonePath(path));
    }
    if(broadcast){
      broadcastStroke(path);
    }
  }

  function applyRemotePath(path, message){
    const pathCopy = deepClonePath(path);
    state.paths.push(pathCopy);
    state.undoStack.push({ type: 'draw', path: pathCopy });
    state.redoStack.length = 0;
    renderAll();
    updateHistoryUI();
    showStatus(`Stroke received from ${options.remoteLabel ?? 'peer'}`, 'received');
    if(typeof onRemotePath === 'function'){
      onRemotePath(deepClonePath(pathCopy), message || {});
    }
  }

  function eraseAt(pt){
    const idx = hitStrokeIndex(pt);
    if(idx !== -1){
      const [removed] = state.paths.splice(idx, 1);
      state.eraseBatch.push({ path: removed, index: idx });
      renderAll();
    }
  }

  function finishErase(){
    const batch = state.eraseBatch || [];
    if(batch.length){
      state.undoStack.push({ type: 'erase', entries: batch });
      state.redoStack.length = 0;
      updateHistoryUI();
    }
    state.eraseBatch = null;
  }

  function startStroke(e){
    if(!supportedPointer(e)) return;
    e.preventDefault();
    if(typeof e.pointerId === 'number' && canvas.setPointerCapture){
      try{ canvas.setPointerCapture(e.pointerId); }catch{}
    }
    const pt = canvasPoint(e);

    if(tool.mode === 'eraser'){
      state.eraseBatch = [];
      eraseAt(pt);
      state.drawing = true;
      state.pointerId = e.pointerId ?? null;
      return;
    }

    const path = { color: tool.color, width: baseWidth(), erase: false, points: [pt] };
    state.currentPath = path;
    strokeLiveBegin(pt, path.width, path.color, false);

    state.drawing = true;
    state.pointerId = e.pointerId ?? null;
  }

  function moveStroke(e){
    if(!state.drawing) return;
    if(state.pointerId != null && e.pointerId != null && e.pointerId !== state.pointerId) return;
    if(!supportedPointer(e)) return;
    e.preventDefault();
    const pt = canvasPoint(e);

    if(tool.mode === 'eraser'){
      eraseAt(pt);
      return;
    }

    state.currentPath.points.push(pt);
    strokeLiveTo(pt);
  }

  function endStroke(e){
    if(!state.drawing) return;
    if(state.pointerId != null && e.pointerId != null && e.pointerId !== state.pointerId) return;
    e.preventDefault();

    if(typeof e.pointerId === 'number' && canvas.releasePointerCapture){
      try{ canvas.releasePointerCapture(e.pointerId); }catch{}
    }

    if(tool.mode === 'eraser'){
      finishErase();
      state.drawing = false;
      state.pointerId = null;
      return;
    }

    const path = state.currentPath;
    if(path){
      if(path.points.length === 1){
        drawDot(path.points[0], path.width, path.color, false);
      }
      strokeLiveEnd();
      commitPath(path);
      state.currentPath = null;
    }

    state.drawing = false;
    state.pointerId = null;
  }

  function cancelStroke(e){
    if(!state.drawing) return;
    e.preventDefault();

    if(tool.mode === 'eraser'){
      finishErase();
    }else{
      strokeLiveEnd();
      renderAll();
      state.currentPath = null;
    }

    state.drawing = false;
    state.pointerId = null;
  }

  if(undoButton){
    undoButton.addEventListener('click', () => {
      if(!state.undoStack.length) return;
      const action = state.undoStack.pop();

      if(action.type === 'draw'){
        const path = action.path;
        const i = state.paths.lastIndexOf(path);
        if(i !== -1) state.paths.splice(i, 1);
        else state.paths.pop();
        state.redoStack.push({ type: 'draw', path });
      }else if(action.type === 'erase'){
        const entries = action.entries || [];
        for(let i = entries.length - 1; i >= 0; i--){
          const { path, index } = entries[i];
          state.paths.splice(index, 0, path);
        }
        state.redoStack.push({ type: 'erase', entries });
      }else if(action.type === 'clear'){
        const prev = action.prev || [];
        state.paths = deepClonePaths(prev);
        state.redoStack.push({ type: 'clear', prev: deepClonePaths(prev) });
      }

      renderAll();
      updateHistoryUI();
    });
  }

  if(redoButton){
    redoButton.addEventListener('click', () => {
      if(!state.redoStack.length) return;
      const action = state.redoStack.pop();

      if(action.type === 'draw'){
        state.paths.push(action.path);
        state.undoStack.push({ type: 'draw', path: action.path });
      }else if(action.type === 'erase'){
        const performed = [];
        (action.entries || []).forEach(({ path, index }) => {
          const i = state.paths.indexOf(path);
          if(i !== -1){
            const [removed] = state.paths.splice(i, 1);
            performed.push({ path: removed, index: i });
          }else if(index >= 0 && index < state.paths.length){
            const [removed] = state.paths.splice(index, 1);
            performed.push({ path: removed, index });
          }
        });
        if(performed.length) state.undoStack.push({ type: 'erase', entries: performed });
      }else if(action.type === 'clear'){
        const prevNow = deepClonePaths(state.paths);
        state.paths.length = 0;
        state.undoStack.push({ type: 'clear', prev: prevNow });
      }

      renderAll();
      updateHistoryUI();
    });
  }

  if(clearButton){
    clearButton.addEventListener('click', () => {
      const snapshot = deepClonePaths(state.paths);
      if(snapshot.length === 0) return;
      state.paths.length = 0;
      state.undoStack.push({ type: 'clear', prev: snapshot });
      state.redoStack.length = 0;
      renderAll();
      updateHistoryUI();
    });
  }

  colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tool.color = btn.dataset.color;
      tool.mode = 'pen';
      updateColorUI();
      updateToolUI();
      updateSizeUI();
    });
  });

  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tool.mode = btn.dataset.tool;
      updateToolUI();
      updateSizeUI();
    });
  });

  if(sizeSlider){
    sizeSlider.addEventListener('input', (e) => {
      tool.size = clamp(+e.target.value || cfg.defaultSize, cfg.minSize, cfg.maxSize);
      updateSizeUI();
    });
  }

  if(stylusToggle){
    stylusToggle.addEventListener('click', () => {
      tool.stylusOnly = !tool.stylusOnly;
      stylusToggle.setAttribute('aria-pressed', String(tool.stylusOnly));
      stylusToggle.textContent = tool.stylusOnly ? 'Stylus-only' : 'Pen/Touch';
      stylusToggle.classList.toggle('off', !tool.stylusOnly);
    });
  }

  canvas.addEventListener('pointerdown', startStroke, { passive: false });
  canvas.addEventListener('pointermove', moveStroke, { passive: false });
  canvas.addEventListener('pointerup', endStroke, { passive: false });
  canvas.addEventListener('pointercancel', cancelStroke, { passive: false });
  canvas.addEventListener('pointerleave', cancelStroke, { passive: false });

  ['touchstart', 'touchmove', 'gesturestart'].forEach(eventName => {
    canvas.addEventListener(eventName, (e) => { e.preventDefault(); }, { passive: false });
  });

  function handleMessage(event){
    const msg = event?.data;
    if(!msg || msg.from === role) return;
    if(msg.type === 'strokeComplete' && msg.path){
      if(typeof shouldAcceptRemotePath === 'function' && !shouldAcceptRemotePath(msg)){
        return;
      }
      applyRemotePath(msg.path, msg);
    }
  }

  if(channel){
    channel.addEventListener('message', handleMessage);
  }

  resetCanvas();
  updateColorUI();
  updateToolUI();
  updateSizeUI();
  updateHistoryUI();
  fitCanvasToStage();
  requestAnimationFrame(() => fitCanvasToStage());
  showStatus('Ready');

  window.addEventListener('resize', fitCanvasToStage);
  window.addEventListener('orientationchange', fitCanvasToStage);
  if(window.visualViewport){
    visualViewport.addEventListener('resize', fitCanvasToStage);
  }

  return {
    destroy(){
      window.removeEventListener('resize', fitCanvasToStage);
      window.removeEventListener('orientationchange', fitCanvasToStage);
      if(window.visualViewport){
        visualViewport.removeEventListener('resize', fitCanvasToStage);
      }
      if(channel){
        channel.removeEventListener('message', handleMessage);
        channel.close();
      }
      if(stageObserver){
        stageObserver.disconnect();
      }
    },
    getState(){
      return {
        tool: { ...tool },
        paths: deepClonePaths(state.paths),
      };
    },
    refreshLayout(){
      fitCanvasToStage();
    },
  };
}

export default initCanvasApp;

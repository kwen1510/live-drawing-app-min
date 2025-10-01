import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY, ROOM_ID } from './supabase-config.js';

const paletteMap = {
  Canvas: ['#0f172a', '#2563eb', '#16a34a', '#ef4444'],
  Student: ['#111827', '#1d4ed8', '#16a34a', '#f97316'],
  Teacher: ['#dc2626', '#9333ea', '#0ea5e9', '#0f172a'],
};

const roleTitle = {
  Canvas: 'Shared Canvas',
  Student: 'Student Canvas',
  Teacher: 'Teacher Canvas',
};

function assignPalette(role, paletteElement) {
  const colors = paletteMap[role] || paletteMap.Canvas;
  paletteElement.innerHTML = '';
  let currentColor = colors[0];

  colors.forEach((color, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'color-swatch';
    btn.style.background = color;
    btn.dataset.color = color;
    if (index === 0) {
      btn.classList.add('is-active');
    }
    btn.addEventListener('click', () => {
      currentColor = color;
      [...paletteElement.children].forEach((child) => child.classList.remove('is-active'));
      btn.classList.add('is-active');
    });
    paletteElement.appendChild(btn);
  });

  return {
    get current() {
      return currentColor;
    },
    set current(value) {
      currentColor = value;
    },
  };
}

export function initRealtimeCanvas({ roomId = ROOM_ID } = {}) {
  const role = document.body.dataset.role || 'Canvas';
  const title = roleTitle[role] || roleTitle.Canvas;

  const pageTitle = document.getElementById('pageTitle');
  const pageSubtitle = document.getElementById('pageSubtitle');
  const sessionId = document.getElementById('sessionId');
  const colorPalette = document.getElementById('colorPalette');
  const brushInput = document.getElementById('brushSize');
  const brushValue = document.getElementById('brushValue');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const clearBtn = document.getElementById('clearBtn');
  const connectionStatus = document.getElementById('connectionStatus');
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  pageTitle.textContent = title;
  document.title = `${title} – Live Drawing`;

  if (role === 'Student') {
    pageSubtitle.textContent = 'Share your drawing with the teacher in real-time.';
  } else if (role === 'Teacher') {
    pageSubtitle.textContent = 'Watch the shared canvas update instantly and annotate if needed.';
  } else {
    pageSubtitle.textContent = 'Draw in real-time with anyone connected to this session.';
  }

  if (sessionId) {
    sessionId.textContent = roomId;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const palette = assignPalette(role, colorPalette);

  let brushSize = Number(brushInput.value);
  brushValue.textContent = `${brushSize.toFixed(1)} px`;
  brushInput.addEventListener('input', () => {
    brushSize = Number(brushInput.value);
    brushValue.textContent = `${brushSize.toFixed(1)} px`;
  });

  const strokes = [];
  const strokeMap = new Map();
  const undoneStack = [];
  let currentStroke = null;
  let isDrawing = false;
  let activePointerId = null;

  const clientId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `client-${Math.random().toString(36).slice(2)}`;
  const userId = `${role.toLowerCase()}-${clientId}`;

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  let channel = null;
  let reconnectTimer = null;

  function setStatus(text, state) {
    connectionStatus.textContent = text;
    if (state) {
      connectionStatus.dataset.state = state;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) {
      return;
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      subscribeToChannel();
    }, 2000);
  }

  function clearReconnectTimer() {
    if (!reconnectTimer) {
      return;
    }
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  function broadcast(event, payload) {
    if (!channel) return;
    const result = channel.send({
      type: 'broadcast',
      event,
      payload,
    });
    if (result && typeof result.catch === 'function') {
      result.catch((error) => console.error(`Broadcast ${event} failed`, error));
    }
  }

  function getPoint(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  function drawStroke(stroke) {
    if (!stroke || !stroke.points || stroke.points.length === 0) return;
    const pts = stroke.points;
    ctx.save();
    ctx.lineWidth = stroke.size;
    ctx.strokeStyle = stroke.color;
    ctx.beginPath();
    if (pts.length === 1) {
      ctx.fillStyle = stroke.color;
      ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i += 1) {
      const point = pts[i];
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ordered = [...strokes].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    ordered.forEach((stroke) => drawStroke(stroke));
    if (currentStroke) {
      drawStroke(currentStroke);
    }
  }

  function updateButtons() {
    const hasLocalStrokes = strokes.some((stroke) => stroke.userId === userId);
    undoBtn.disabled = !hasLocalStrokes;
    clearBtn.disabled = !hasLocalStrokes;
    redoBtn.disabled = undoneStack.length === 0;
  }

  function addStroke(stroke, { broadcast: shouldBroadcast } = { broadcast: false }) {
    if (!stroke || !stroke.id || strokeMap.has(stroke.id)) return;
    strokeMap.set(stroke.id, stroke);
    strokes.push(stroke);
    redraw();
    updateButtons();
    if (shouldBroadcast) {
      broadcast('stroke', { stroke, userId, clientId });
    }
  }

  function removeStrokeById(id) {
    const stroke = strokeMap.get(id);
    if (!stroke) return null;
    strokeMap.delete(id);
    const idx = strokes.findIndex((item) => item.id === id);
    if (idx !== -1) {
      strokes.splice(idx, 1);
    }
    redraw();
    updateButtons();
    return stroke;
  }

  function findLastLocalStroke() {
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      if (strokes[i].userId === userId) {
        return strokes[i];
      }
    }
    return null;
  }

  function finishStroke() {
    if (!isDrawing) return;
    if (activePointerId !== null) {
      try {
        canvas.releasePointerCapture(activePointerId);
      } catch (error) {
        console.warn('Pointer release failed', error);
      }
      activePointerId = null;
    }
    isDrawing = false;
    if (currentStroke && currentStroke.points.length > 0) {
      currentStroke.createdAt = Date.now();
      addStroke(currentStroke, { broadcast: true });
      undoneStack.length = 0;
    }
    currentStroke = null;
    redraw();
  }

  canvas.addEventListener('pointerdown', (evt) => {
    if (evt.button !== 0) return;
    activePointerId = evt.pointerId;
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(activePointerId);
      } catch (error) {
        console.warn('Pointer capture failed', error);
      }
    }
    isDrawing = true;
    const point = getPoint(evt);
    currentStroke = {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      userId,
      clientId,
      color: palette.current,
      size: brushSize,
      points: [point],
      createdAt: Date.now(),
    };
    redraw();
  });

  canvas.addEventListener('pointermove', (evt) => {
    if (!isDrawing || !currentStroke) return;
    const point = getPoint(evt);
    const lastPoint = currentStroke.points[currentStroke.points.length - 1];
    const dx = point.x - lastPoint.x;
    const dy = point.y - lastPoint.y;
    if (Math.hypot(dx, dy) < 0.8) return;
    currentStroke.points.push(point);
    redraw();
  });

  const endEvents = ['pointerup', 'pointercancel', 'pointerleave'];
  endEvents.forEach((name) => {
    canvas.addEventListener(name, () => {
      finishStroke();
    });
  });

  undoBtn.addEventListener('click', () => {
    const stroke = findLastLocalStroke();
    if (!stroke) return;
    const removed = removeStrokeById(stroke.id);
    if (!removed) return;
    undoneStack.push(removed);
    broadcast('remove', { strokeId: removed.id, userId, clientId });
  });

  redoBtn.addEventListener('click', () => {
    if (undoneStack.length === 0) return;
    const stroke = undoneStack.pop();
    stroke.createdAt = Date.now();
    addStroke(stroke, { broadcast: true });
  });

  clearBtn.addEventListener('click', () => {
    let removedAny = false;
    while (true) {
      const stroke = findLastLocalStroke();
      if (!stroke) break;
      const removed = removeStrokeById(stroke.id);
      if (!removed) break;
      undoneStack.push(removed);
      removedAny = true;
    }
    if (removedAny) {
      broadcast('clear', { userId, clientId });
    }
  });

  function attachChannelHandlers(targetChannel) {
    targetChannel.on('broadcast', { event: 'stroke' }, ({ payload }) => {
      if (!payload || payload.clientId === clientId) return;
      addStroke(payload.stroke, { broadcast: false });
    });

    targetChannel.on('broadcast', { event: 'remove' }, ({ payload }) => {
      if (!payload || payload.clientId === clientId) return;
      removeStrokeById(payload.strokeId);
    });

    targetChannel.on('broadcast', { event: 'clear' }, ({ payload }) => {
      if (!payload || payload.clientId === clientId) return;
      const targetUser = payload.userId;
      const idsToDelete = strokes.filter((stroke) => stroke.userId === targetUser).map((stroke) => stroke.id);
      idsToDelete.forEach((id) => removeStrokeById(id));
    });

    targetChannel.on('broadcast', { event: 'request_state' }, ({ payload }) => {
      if (!payload || payload.clientId === clientId) return;
      if (strokes.length === 0) return;
      broadcast('state', {
        targetClientId: payload.clientId,
        fromClientId: clientId,
        strokes,
      });
    });

    targetChannel.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (!payload || payload.targetClientId !== clientId) return;
      const incoming = payload.strokes || [];
      incoming.forEach((stroke) => {
        addStroke(stroke, { broadcast: false });
      });
    });
  }

  function subscribeToChannel() {
    if (channel) {
      supabase.removeChannel(channel);
    }

    channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { ack: true },
      },
    });

    attachChannelHandlers(channel);

    setStatus('Connecting…', 'connecting');

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearReconnectTimer();
        setStatus('Connected', 'ready');
        broadcast('request_state', { clientId, userId });
      } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
        setStatus('Connection lost', 'error');
        scheduleReconnect();
      } else if (status === 'CLOSED') {
        setStatus('Disconnected', 'error');
        scheduleReconnect();
      } else {
        setStatus('Connecting…', 'connecting');
      }
    });
  }

  supabase.realtime.onConnectionStateChange((event) => {
    const { current } = event ?? {};
    if (!current) return;
    if (current === 'OPEN') {
      setStatus('Connected', 'ready');
      clearReconnectTimer();
    } else if (current === 'CONNECTING' || current === 'RETRYING') {
      setStatus('Connecting…', 'connecting');
    } else if (current === 'CLOSED' || current === 'DISCONNECTED' || current === 'CHANNEL_ERROR') {
      setStatus('Connection lost', 'error');
      scheduleReconnect();
    }
  });

  updateButtons();
  subscribeToChannel();

  window.addEventListener('beforeunload', () => {
    if (channel) {
      supabase.removeChannel(channel);
    }
  });
}

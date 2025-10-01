import initCanvasApp from './canvas-app.js';

const sessionInput = document.getElementById('sessionInput');
const startSessionBtn = document.getElementById('startSessionBtn');
const statusBadge = document.getElementById('status');
const sessionInfo = document.getElementById('sessionInfo');
const sessionCodeEl = document.getElementById('sessionCode');
const studentCountEl = document.getElementById('studentCount');
const studentsContainer = document.getElementById('students');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModal');
const modalTitle = document.getElementById('modalTitle');
const teacherClearBtnEl = document.getElementById('teacherClearBtn');

const STORAGE_KEY = 'liveDrawing.teacherSession';
const presenceChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('classroom-presence') : null;

const teacherCanvasApp = initCanvasApp({
  root: document.getElementById('teacherCanvasApp'),
  stage: document.getElementById('teacherStage'),
  canvas: document.getElementById('teacherPad'),
  colorButtons: [...document.querySelectorAll('#teacherCanvasApp [data-color]')],
  toolButtons: [...document.querySelectorAll('#teacherCanvasApp [data-tool]')],
  undoButton: document.getElementById('teacherUndoBtn'),
  redoButton: document.getElementById('teacherRedoBtn'),
  clearButton: teacherClearBtnEl,
  stylusToggle: document.getElementById('teacherStylusBtn'),
  sizeSlider: document.getElementById('teacherBrush'),
  sizeLabel: document.getElementById('teacherSizeLabel'),
  sizePreview: document.getElementById('teacherSizePreview'),
  statusElement: document.getElementById('teacherCanvasStatus'),
  statusText: document.getElementById('teacherCanvasStatusText'),
  role: 'teacher',
  remoteLabel: 'student',
  channelName: 'classroom-canvas',
  broadcastPayloadFormatter: (path) => ({
    path,
    teacher: true,
    targetStudentId: activeStudentId ?? null,
    session: currentSession ?? null,
  }),
  onPathCommitted: (path) => {
    if(activeStudentId){
      appendPathToPreview(activeStudentId, path);
      const record = studentMap.get(activeStudentId);
      if(record){
        const updated = { ...record, lastSeen: Date.now() };
        studentMap.set(activeStudentId, updated);
        if(currentSession && updated.session === currentSession){
          renderStudents();
        }
      }
    }
  },
  onRemotePath: (path, message = {}) => {
    if(!message.studentId) return;
    const record = upsertStudent({
      id: message.studentId,
      name: message.studentName,
      session: message.session,
      lastSeen: Date.now(),
    });
    const sessionCode = (message.session || record?.session || '').trim().toUpperCase();
    if(currentSession && sessionCode && sessionCode !== currentSession){
      return;
    }
    appendPathToPreview(message.studentId, path);
    if(currentSession && record?.session === currentSession){
      renderStudents();
    }
  },
  shouldAcceptRemotePath: (message) => {
    const sessionCode = (message.session || '').trim().toUpperCase();
    if(currentSession && sessionCode && sessionCode !== currentSession){
      return false;
    }
    return true;
  },
});

let currentSession = null;
const studentMap = new Map();
let activeStudentId = null;
const previewMap = new Map();

const clonePreviewPath = (path) => ({
  color: path.color,
  width: path.width,
  erase: !!path.erase,
  points: (path.points || []).map((pt) => ({ x: pt.x, y: pt.y })),
});

function resetPreview(entry){
  if(!entry) return;
  const { ctx, canvas } = entry;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawPreviewPath(ctx, path){
  const pts = path.points || [];
  if(!pts.length) return;
  const width = path.width || 1;
  ctx.save();
  ctx.globalCompositeOperation = path.erase ? 'destination-out' : 'source-over';
  if(pts.length === 1){
    const radius = Math.max(0.45 * width, Math.min(0.8 * width, 0.5 * width));
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, radius, 0, Math.PI * 2);
    ctx.fillStyle = path.erase ? '#000' : path.color || '#111827';
    ctx.fill();
  }else{
    ctx.strokeStyle = path.erase ? '#000' : path.color || '#111827';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i = 1; i < pts.length; i++){
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function renderPreview(entry){
  if(!entry) return;
  resetPreview(entry);
  entry.paths.forEach((path) => drawPreviewPath(entry.ctx, path));
}

function ensureStudentPreview(studentOrId){
  const id = typeof studentOrId === 'string' ? studentOrId : studentOrId?.id;
  if(!id) return null;
  let entry = previewMap.get(id);
  if(entry){
    if(studentOrId && typeof studentOrId === 'object'){
      updatePreviewLabel(studentOrId);
    }
    return entry;
  }
  const stage = document.createElement('div');
  stage.className = 'relative aspect-[4/3] w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-950/80 shadow-inner';
  stage.dataset.studentId = id;
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  stage.appendChild(canvas);
  const label = document.createElement('span');
  label.className = 'absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 shadow';
  label.textContent = studentOrId?.name ? `${studentOrId.name} · Preview` : 'Live preview';
  stage.appendChild(label);
  const ctx = canvas.getContext('2d', { alpha:false });
  entry = { stage, canvas, ctx, paths: [], label };
  resetPreview(entry);
  previewMap.set(id, entry);
  return entry;
}

function updatePreviewLabel(student){
  if(!student?.id) return;
  const entry = previewMap.get(student.id);
  if(entry?.label){
    entry.label.textContent = student.name ? `${student.name} · Preview` : 'Live preview';
  }
}

function appendPathToPreview(studentId, path){
  if(!studentId || !path) return;
  const student = studentMap.get(studentId) || { id: studentId };
  const entry = ensureStudentPreview(student);
  if(!entry) return;
  entry.paths.push(clonePreviewPath(path));
  if(entry.paths.length > 500){
    entry.paths.splice(0, entry.paths.length - 500);
  }
  renderPreview(entry);
}

function clearPreview(studentId){
  const entry = previewMap.get(studentId);
  if(!entry) return;
  entry.paths = [];
  resetPreview(entry);
}

function removePreview(studentId){
  const entry = previewMap.get(studentId);
  if(!entry) return;
  entry.stage.remove();
  previewMap.delete(studentId);
}

function upsertStudent(student){
  if(!student || !student.id) return null;
  const existing = studentMap.get(student.id) || {};
  const normalizedSession = (student.session || existing.session || '').trim().toUpperCase();
  const normalizedName = (student.name || existing.name || '').trim();
  const sessionChanged = Boolean(existing.session) && normalizedSession && normalizedSession !== existing.session;
  const record = {
    id: student.id,
    name: normalizedName,
    session: normalizedSession,
    lastSeen: student.lastSeen || Date.now(),
  };
  studentMap.set(student.id, record);
  updatePreviewLabel(record);
  if(sessionChanged){
    clearPreview(student.id);
  }
  return record;
}

if(teacherClearBtnEl){
  teacherClearBtnEl.addEventListener('click', () => {
    if(activeStudentId){
      clearPreview(activeStudentId);
    }
  });
}

function setStatus(text, variant = 'idle'){
  if(!statusBadge) return;
  const baseClasses = 'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200';
  const variants = {
    idle: 'border-blue-200 bg-blue-100 text-blue-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    error: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  statusBadge.className = `${baseClasses} ${variants[variant] || variants.idle}`;
  statusBadge.textContent = text;
}

function requestPresence(){
  if(!presenceChannel || !currentSession) return;
  presenceChannel.postMessage({ type: 'teacher-session-started', session: currentSession });
  presenceChannel.postMessage({ type: 'teacher-sync-request', session: currentSession });
}

function pruneStudents(){
  if(!currentSession) return;
  for(const [id, student] of studentMap.entries()){
    if(student.session !== currentSession){
      studentMap.delete(id);
      removePreview(id);
    }
  }
  for(const id of [...previewMap.keys()]){
    if(!studentMap.has(id)){
      removePreview(id);
    }
  }
}

function createStudentCard(student){
  const card = document.createElement('article');
  card.className = 'flex flex-col gap-4 rounded-[24px] border border-slate-200 bg-white/80 p-5 shadow-[0_20px_45px_rgba(30,64,175,0.16)] backdrop-blur';

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between gap-3';

  const identity = document.createElement('div');
  const nameEl = document.createElement('p');
  nameEl.className = 'text-lg font-semibold text-slate-900';
  const displayName = student.name || 'Unnamed student';
  nameEl.textContent = displayName;
  const detailEl = document.createElement('p');
  detailEl.className = 'text-sm text-slate-500';
  const timestamp = student.lastSeen || Date.now();
  detailEl.textContent = `Last seen ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  identity.appendChild(nameEl);
  identity.appendChild(detailEl);

  const badge = document.createElement('span');
  badge.className = 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700';
  badge.textContent = student.session || '—';

  header.append(identity, badge);

  const actionRow = document.createElement('div');
  actionRow.className = 'flex flex-wrap items-center gap-3';

  const annotateBtn = document.createElement('button');
  annotateBtn.type = 'button';
  annotateBtn.className = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:from-blue-500 hover:to-indigo-400 focus:outline-none focus:ring-4 focus:ring-blue-200';
  annotateBtn.textContent = 'View & Annotate';
  annotateBtn.addEventListener('click', () => openModal(student));

  const statusHint = document.createElement('span');
  statusHint.className = 'text-xs font-medium uppercase tracking-wide text-slate-400';
  statusHint.textContent = 'Live';

  actionRow.append(annotateBtn, statusHint);

  const preview = ensureStudentPreview(student);

  card.append(header);
  if(preview){
    card.append(preview.stage);
  }
  card.append(actionRow);
  return card;
}

function renderStudents(){
  if(!studentsContainer || !studentCountEl || !emptyState){
    return;
  }
  const sessionStudents = currentSession
    ? [...studentMap.values()].filter((student) => student.session === currentSession)
    : [];
  sessionStudents.sort((a, b) => a.name.localeCompare(b.name));

  studentsContainer.innerHTML = '';
  sessionStudents.forEach((student) => {
    studentsContainer.appendChild(createStudentCard(student));
  });

  studentCountEl.textContent = String(sessionStudents.length);
  emptyState.classList.toggle('hidden', sessionStudents.length > 0 && !!currentSession);
  studentsContainer.classList.toggle('hidden', sessionStudents.length === 0);

  if(currentSession){
    if(sessionStudents.length){
      const label = sessionStudents.length === 1 ? 'student online' : 'students online';
      setStatus(`${sessionStudents.length} ${label}`, 'active');
    }else{
      setStatus('Waiting for students', 'active');
    }
  }else{
    setStatus('Not connected', 'idle');
  }
}

function openModal(student){
  if(!modal || !modalTitle) return;
  activeStudentId = student.id;
  modalTitle.textContent = `Annotating ${student.name}`;
  ensureStudentPreview(student);
  modal.classList.remove('invisible', 'pointer-events-none');
  document.body.classList.add('overflow-hidden');
  if(teacherCanvasApp?.refreshLayout){
    requestAnimationFrame(() => teacherCanvasApp.refreshLayout());
  }
}

function closeModalView(){
  if(!modal) return;
  activeStudentId = null;
  modal.classList.add('invisible', 'pointer-events-none');
  document.body.classList.remove('overflow-hidden');
}

function startSession({ announce = true } = {}){
  const code = (sessionInput?.value || '').trim().toUpperCase();
  if(!code){
    setStatus('Enter a session code to start', 'error');
    return;
  }
  currentSession = code;
  if(sessionInput){
    sessionInput.value = currentSession;
  }
  try{
    localStorage.setItem(STORAGE_KEY, currentSession);
  }catch(err){
    console.warn('Failed to persist teacher session', err);
  }
  if(sessionInfo){
    sessionInfo.classList.remove('hidden');
  }
  if(sessionCodeEl){
    sessionCodeEl.textContent = currentSession;
  }
  pruneStudents();
  renderStudents();
  if(announce){
    requestPresence();
  }
}

if(startSessionBtn){
  startSessionBtn.addEventListener('click', () => startSession({ announce: true }));
}

if(sessionInput){
  sessionInput.addEventListener('keydown', (event) => {
    if(event.key === 'Enter'){
      event.preventDefault();
      startSession({ announce: true });
    }
  });
}

if(presenceChannel){
  presenceChannel.addEventListener('message', (event) => {
    const msg = event?.data;
    if(!msg) return;
    if(msg.type === 'student-joined' && msg.student){
      const { student } = msg;
      if(!student.id) return;
      const record = upsertStudent({ ...student, lastSeen: Date.now() });
      if(record){
        ensureStudentPreview(record);
        if(currentSession && record.session === currentSession){
          renderStudents();
        }
      }
    }else if(msg.type === 'student-left' && msg.student){
      const { student } = msg;
      if(!student.id) return;
      const existing = studentMap.get(student.id);
      studentMap.delete(student.id);
      removePreview(student.id);
      if(currentSession && existing?.session === currentSession){
        renderStudents();
      }
    }
  });
}

if(closeModalBtn){
  closeModalBtn.addEventListener('click', () => closeModalView());
}

if(modal){
  modal.addEventListener('click', (event) => {
    if(event.target === modal){
      closeModalView();
    }
  });
}

window.addEventListener('keydown', (event) => {
  if(event.key === 'Escape' && activeStudentId){
    closeModalView();
  }
});

window.addEventListener('beforeunload', () => {
  if(teacherCanvasApp?.destroy){
    teacherCanvasApp.destroy();
  }
});

const savedSession = (() => {
  try{
    return localStorage.getItem(STORAGE_KEY);
  }catch(err){
    return null;
  }
})();

if(savedSession){
  if(sessionInput){
    sessionInput.value = savedSession;
  }
  startSession({ announce: true });
}else{
  renderStudents();
}

export {}; // keep module scope

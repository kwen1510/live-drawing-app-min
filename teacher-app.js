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
  clearButton: document.getElementById('teacherClearBtn'),
  stylusToggle: document.getElementById('teacherStylusBtn'),
  sizeSlider: document.getElementById('teacherBrush'),
  sizeLabel: document.getElementById('teacherSizeLabel'),
  sizePreview: document.getElementById('teacherSizePreview'),
  statusElement: document.getElementById('teacherCanvasStatus'),
  statusText: document.getElementById('teacherCanvasStatusText'),
  role: 'teacher',
  remoteLabel: 'student',
  channelName: 'classroom-canvas',
});

let currentSession = null;
const studentMap = new Map();
let activeStudentId = null;

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
  nameEl.textContent = student.name;
  const detailEl = document.createElement('p');
  detailEl.className = 'text-sm text-slate-500';
  const timestamp = student.lastSeen || Date.now();
  detailEl.textContent = `Last seen ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  identity.appendChild(nameEl);
  identity.appendChild(detailEl);

  const badge = document.createElement('span');
  badge.className = 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700';
  badge.textContent = student.session;

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

  card.append(header, actionRow);
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
  modal.classList.remove('invisible', 'pointer-events-none');
  document.body.classList.add('overflow-hidden');
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
      studentMap.set(student.id, {
        ...student,
        lastSeen: Date.now(),
      });
      if(currentSession && student.session === currentSession){
        renderStudents();
      }
    }else if(msg.type === 'student-left' && msg.student){
      const { student } = msg;
      if(!student.id) return;
      studentMap.delete(student.id);
      if(currentSession){
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

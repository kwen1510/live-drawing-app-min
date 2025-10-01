import initCanvasApp from './canvas-app.js';

const loginForm = document.getElementById('loginForm');
const appContainer = document.getElementById('appContainer');
const loginBtn = document.getElementById('loginBtn');
const usernameInput = document.getElementById('usernameInput');
const sessionInput = document.getElementById('sessionInput');
const statusButton = document.getElementById('status');
const statusText = document.getElementById('statusText');
const connectionLabel = document.getElementById('connectionLabel');
const loginError = document.getElementById('loginError');

const STORAGE_KEY = 'liveDrawing.student';
const presenceChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('classroom-presence') : null;

const canvasApp = initCanvasApp({
  root: document.getElementById('studentCanvasApp'),
  stage: document.getElementById('studentStage'),
  canvas: document.getElementById('studentPad'),
  colorButtons: [...document.querySelectorAll('#studentCanvasApp [data-color]')],
  toolButtons: [...document.querySelectorAll('#studentCanvasApp [data-tool]')],
  undoButton: document.getElementById('studentUndoBtn'),
  redoButton: document.getElementById('studentRedoBtn'),
  clearButton: document.getElementById('studentClearBtn'),
  stylusToggle: document.getElementById('studentStylusBtn'),
  sizeSlider: document.getElementById('studentBrush'),
  sizeLabel: document.getElementById('studentSizeLabel'),
  sizePreview: document.getElementById('studentSizePreview'),
  statusElement: document.getElementById('studentCanvasStatus'),
  statusText: document.getElementById('studentCanvasStatusText'),
  role: 'student',
  remoteLabel: 'teacher',
  channelName: 'classroom-canvas',
});

let currentStudent = null;

function showApp(){
  if(loginForm){
    loginForm.classList.add('hidden');
  }
  if(appContainer){
    appContainer.classList.remove('hidden');
  }
}

function showLogin(){
  if(appContainer){
    appContainer.classList.add('hidden');
  }
  if(loginForm){
    loginForm.classList.remove('hidden');
  }
}

function setStatus(state, message){
  if(!statusButton) return;
  statusButton.classList.remove('status-dot--connected', 'status-dot--error');
  if(state === 'connected'){
    statusButton.classList.add('status-dot--connected');
  }else if(state === 'error'){
    statusButton.classList.add('status-dot--error');
  }
  if(statusButton){
    statusButton.setAttribute('aria-label', message);
    statusButton.setAttribute('title', message);
  }
  if(statusText){
    statusText.textContent = message;
  }
}

function setConnectionLabel(message){
  if(connectionLabel){
    connectionLabel.textContent = message;
  }
}

function reportError(message){
  if(loginError){
    loginError.textContent = message;
    loginError.classList.remove('hidden');
  }else{
    window.alert(message);
  }
  setStatus('error', message);
}

function clearError(){
  if(loginError){
    loginError.classList.add('hidden');
    loginError.textContent = '';
  }
}

function announcePresence(type){
  if(!presenceChannel || !currentStudent) return;
  presenceChannel.postMessage({
    type,
    student: {
      ...currentStudent,
      lastSeen: Date.now(),
    },
  });
}

function persistStudent(){
  if(!currentStudent) return;
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentStudent));
  }catch(err){
    console.warn('Failed to persist student state', err);
  }
}

function hydrateFromStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(parsed && typeof parsed === 'object' && parsed.name && parsed.session){
      return parsed;
    }
  }catch(err){
    console.warn('Failed to parse student storage', err);
  }
  return null;
}

function joinSession({ name, session, id }){
  const normalizedName = (name || '').trim();
  const normalizedSession = (session || '').trim().toUpperCase();
  if(!normalizedName || !normalizedSession){
    return;
  }
  currentStudent = {
    id: id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    name: normalizedName,
    session: normalizedSession,
    joinedAt: new Date().toISOString(),
  };
  persistStudent();
  clearError();
  if(usernameInput){
    usernameInput.value = currentStudent.name;
  }
  if(sessionInput){
    sessionInput.value = currentStudent.session;
  }
  showApp();
  setStatus('connected', `Connected to ${currentStudent.session}`);
  setConnectionLabel(`Connected to session ${currentStudent.session} as ${currentStudent.name}`);
  announcePresence('student-joined');
}

function handleLogin(){
  const name = (usernameInput?.value || '').trim();
  const sessionCode = (sessionInput?.value || '').trim().toUpperCase();
  if(name.length < 2){
    reportError('Please enter your name to join.');
    return;
  }
  if(!sessionCode){
    reportError('Enter the session code you were given.');
    return;
  }
  joinSession({
    name,
    session: sessionCode,
    id: currentStudent?.id,
  });
}

if(loginBtn){
  loginBtn.addEventListener('click', (event) => {
    event.preventDefault();
    handleLogin();
  });
}

if([usernameInput, sessionInput].every(Boolean)){
  [usernameInput, sessionInput].forEach((input) => {
    input.addEventListener('keydown', (event) => {
      if(event.key === 'Enter'){
        event.preventDefault();
        handleLogin();
      }
    });
    input.addEventListener('input', () => {
      if(loginError && !loginError.classList.contains('hidden')){
        clearError();
        setStatus('idle', 'Waiting');
      }
    });
  });
}

if(presenceChannel){
  presenceChannel.addEventListener('message', (event) => {
    const msg = event?.data;
    if(!msg) return;
    if(msg.type === 'teacher-sync-request' || msg.type === 'teacher-session-started'){
      if(!currentStudent) return;
      if(msg.session && msg.session !== currentStudent.session) return;
      announcePresence('student-joined');
    }
  });
}

window.addEventListener('beforeunload', () => {
  announcePresence('student-left');
  if(canvasApp?.destroy){
    canvasApp.destroy();
  }
});

const saved = hydrateFromStorage();
if(saved){
  usernameInput.value = saved.name;
  sessionInput.value = saved.session;
  joinSession(saved);
}else{
  showLogin();
  setStatus('idle', 'Waiting');
  setConnectionLabel('Enter your details to join the session.');
}

export {}; // ensure module context

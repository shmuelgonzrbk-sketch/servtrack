const API_URL = 'https://servtrack-api.onrender.com/api';

function getToken() {
  return localStorage.getItem('st_token');
}

function headers() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getToken()
  };
}


// ── AUTH ──
async function apiRegister(nombre, email, password, congregacion) {
  const res = await fetch(API_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password, congregacion })
  });
  return res.json();
}

async function apiLogin(email, password) {
  const res = await fetch(API_URL + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

// ── PERSONAS ──
async function apiGetPersonas() {
  const res = await fetch(API_URL + '/personas', { headers: headers() });
  return res.json();
}

async function apiCreatePersona(data) {
  const res = await fetch(API_URL + '/personas', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

async function apiUpdatePersona(id, data) {
  const res = await fetch(API_URL + '/personas/' + id, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDeletePersona(id) {
  const res = await fetch(API_URL + '/personas/' + id, {
    method: 'DELETE', headers: headers()
  });
  return res.json();
}

// ── PRECURSORADO ──
async function apiGetPrec() {
  const res = await fetch(API_URL + '/precursorado', { headers: headers() });
  return res.json();
}

async function apiUpdatePrec(tipo, meta_horas) {
  const res = await fetch(API_URL + '/precursorado', {
    method: 'PUT', headers: headers(), body: JSON.stringify({ tipo, meta_horas })
  });
  return res.json();
}

async function apiAddHoras(horas) {
  const res = await fetch(API_URL + '/precursorado/horas', {
    method: 'POST', headers: headers(), body: JSON.stringify({ horas })
  });
  return res.json();
}

async function apiResetHoras() {
  const res = await fetch(API_URL + '/precursorado/horas', {
    method: 'DELETE', headers: headers()
  });
  return res.json();
}

// ── ASIGNACIONES ──
async function apiGetAsignaciones() {
  const res = await fetch(API_URL + '/asignaciones', { headers: headers() });
  return res.json();
}

async function apiCreateAsignacion(data) {
  const res = await fetch(API_URL + '/asignaciones', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

async function apiUpdateAsignacion(id, data) {
  const res = await fetch(API_URL + '/asignaciones/' + id, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDeleteAsignacion(id) {
  const res = await fetch(API_URL + '/asignaciones/' + id, {
    method: 'DELETE', headers: headers()
  });
  return res.json();
}

// ── INFORMES ──
async function apiGetInformes() {
  const res = await fetch(API_URL + '/informes', { headers: headers() });
  return res.json();
}

async function apiSaveInforme(data) {
  const res = await fetch(API_URL + '/informes', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

async function apiEnviarInforme(id) {
  const res = await fetch(API_URL + '/informes/' + id + '/enviar', {
    method: 'PUT', headers: headers()
  });
  return res.json();
}

// ── EXPERIENCIAS ──
async function apiGetExperiencias() {
  const res = await fetch(API_URL + '/experiencias', { headers: headers() });
  return res.json();
}

async function apiCreateExperiencia(texto) {
  const res = await fetch(API_URL + '/experiencias', {
    method: 'POST', headers: headers(), body: JSON.stringify({ texto })
  });
  return res.json();
}

async function apiDeleteExperiencia(id) {
  const res = await fetch(API_URL + '/experiencias/' + id, {
    method: 'DELETE', headers: headers()
  });
  return res.json();
}

// ── AJUSTES ──
async function apiGetAjustes() {
  const res = await fetch(API_URL + '/ajustes', { headers: headers() });
  return res.json();
}

async function apiUpdateAjustes(data) {
  const res = await fetch(API_URL + '/ajustes', {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  return res.json();
}

// ── SESIÓN ──
function isLoggedIn() {
  return !!localStorage.getItem('st_token');
}

function saveSession(token, user) {
  localStorage.setItem('st_token', token);
  localStorage.setItem('st_user', JSON.stringify(user));
}

function getUser() {
  const u = localStorage.getItem('st_user');
  return u ? JSON.parse(u) : null;
}

function logout() {
  if (!confirm('¿Estás seguro que quieres cerrar sesión?')) return;
  localStorage.removeItem('st_token');
  localStorage.removeItem('st_user');
  location.reload();
}

// Socket para indicador de actividad
const _socket = io('https://servtrack-api.onrender.com');
window.addEventListener('load', () => {
  const user = getUser();
  if (user?.id) _socket.emit('user:activo', user.id);
});
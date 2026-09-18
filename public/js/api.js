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

// ── INTERCEPTOR DE ACTUALIZACIONES/AUTH ──
// Detecta de forma global si el backend rechazó la petición por un token obsoleto
async function handleApiResponse(res) {
  if (res.status === 401 || res.status === 403) {
    console.warn('[Auth] Sesión inválida detectada debido a actualización. Forzando renovación...');
    localStorage.removeItem('st_token');
    localStorage.removeItem('st_user');
    alert('Tu sesión ha expirado debido a una actualización del sistema. Por favor, vuelve a ingresar.');
    window.location.href = '/login';
    
    // Retornamos un error controlado para romper el flujo de ejecución limpio
    throw new Error('Sesión expirada');
  }
  return res;
}

// ── REPORTES ──
async function apiGetReportes() {
  const res = await fetch(API_URL + '/reportes', { headers: headers() });
  await handleApiResponse(res);
  if (!res.ok) throw new Error('Error ' + res.status);
  return res.json();
}
async function apiEnviarReporte(mensaje, categoria) {
  const res = await fetch(API_URL + '/reportes', {
    method: 'POST', headers: headers(), body: JSON.stringify({ mensaje, categoria })
  });
  await handleApiResponse(res);
  return res.json();
}
async function apiEditarReporte(id, mensaje) {
  const res = await fetch(API_URL + '/reportes/' + id, {
    method: 'PUT', headers: headers(), body: JSON.stringify({ mensaje })
  });
  await handleApiResponse(res);
  return res.json();
}
async function apiEliminarReporte(id, tipo) {
  const res = await fetch(API_URL + '/reportes/' + id + '?tipo=' + tipo, {
    method: 'DELETE', headers: headers()
  });
  await handleApiResponse(res);
  return res.json();
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
  return offlineFetch(API_URL + '/personas', { headers: headers() }, 'personas');
}

async function apiCreatePersona(data) {
  return offlineFetch(API_URL + '/personas', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }, null);
}

async function apiUpdatePersona(id, data) {
  return offlineFetch(API_URL + '/personas/' + id, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  }, null);
}

async function apiDeletePersona(id) {
  return offlineFetch(API_URL + '/personas/' + id, {
    method: 'DELETE', headers: headers()
  }, null);
}

// ── PRECURSORADO ──
async function apiGetPrec() {
  return offlineFetch(API_URL + '/precursorado', { headers: headers() }, 'precursorado');
}

async function apiUpdatePrec(tipo, meta_horas) {
  const res = await fetch(API_URL + '/precursorado', {
    method: 'PUT', headers: headers(), body: JSON.stringify({ tipo, meta_horas })
  });
  await handleApiResponse(res);
  return res.json();
}

async function apiAddHoras(horas) {
  return offlineFetch(API_URL + '/precursorado/horas', {
    method: 'POST', headers: headers(), body: JSON.stringify({ horas })
  }, null);
}

async function apiResetHoras() {
  const res = await fetch(API_URL + '/precursorado/horas', {
    method: 'DELETE', headers: headers()
  });
  await handleApiResponse(res);
  return res.json();
}

// ── ASIGNACIONES ──
async function apiGetAsignaciones() {
  return offlineFetch(API_URL + '/asignaciones', { headers: headers() }, 'asignaciones');
}

async function apiCreateAsignacion(data) {
  const res = await fetch(API_URL + '/asignaciones', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  await handleApiResponse(res);
  return res.json();
}

async function apiUpdateAsignacion(id, data) {
  const res = await fetch(API_URL + '/asignaciones/' + id, {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  await handleApiResponse(res);
  return res.json();
}

async function apiDeleteAsignacion(id) {
  const res = await fetch(API_URL + '/asignaciones/' + id, {
    method: 'DELETE', headers: headers()
  });
  await handleApiResponse(res);
  return res.json();
}

// ── INFORMES ──
async function apiGetInformes() {
  return offlineFetch(API_URL + '/informes', { headers: headers() }, 'informes');
}

async function apiSaveInforme(data) {
  const res = await fetch(API_URL + '/informes', {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  });
  await handleApiResponse(res);
  return res.json();
}

async function apiEnviarInforme(id) {
  const res = await fetch(API_URL + '/informes/' + id + '/enviar', {
    method: 'PUT', headers: headers()
  });
  await handleApiResponse(res);
  return res.json();
}

// ── EXPERIENCIAS ──
async function apiGetExperiencias() {
  const res = await fetch(API_URL + '/experiencias', { headers: headers() });
  await handleApiResponse(res);
  return res.json();
}

async function apiCreateExperiencia(texto) {
  const res = await fetch(API_URL + '/experiencias', {
    method: 'POST', headers: headers(), body: JSON.stringify({ texto })
  });
  await handleApiResponse(res);
  return res.json();
}

async function apiDeleteExperiencia(id) {
  const res = await fetch(API_URL + '/experiencias/' + id, {
    method: 'DELETE', headers: headers()
  });
  await handleApiResponse(res);
  return res.json();
}

// ── AJUSTES ──
async function apiGetAjustes() {
  return offlineFetch(API_URL + '/ajustes', { headers: headers() }, 'ajustes');
}

async function apiUpdateAjustes(data) {
  const res = await fetch(API_URL + '/ajustes', {
    method: 'PUT', headers: headers(), body: JSON.stringify(data)
  });
  await handleApiResponse(res);
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

async function refreshUserPicture() {
  const token = localStorage.getItem('st_token');
  if (!token) return;
  try {
    const res = await fetch(API_URL + '/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) return;
    const userData = await res.json();
    const current = getUser();
    if (current && userData.picture && current.picture !== userData.picture) {
      saveSession(token, { ...current, picture: userData.picture });
    }
  } catch(e) {}
}

function logout() {
  if (!confirm('¿Estás seguro que quieres cerrar sesión?')) return;
  localStorage.removeItem('st_token');
  localStorage.removeItem('st_user');
  window.location.href = '/login';
}

// Socket para indicador de actividad
const _socket = io('https://servtrack-api.onrender.com');
window.addEventListener('load', () => {
  const user = getUser();
  if (user?.id) _socket.emit('user:activo', user.id);
});

// Reinicio silencioso: el admin (o el cron semanal) puede pedir que esta pestaña
// recargue datos frescos. Como el token sigue en localStorage, no pide contraseña.
_socket.on('sesion:reiniciar', () => {
  window.location.reload();
});

async function apiGetHoras() {
  return offlineFetch(API_URL + '/precursorado/horas', { headers: headers() }, 'horas');
}

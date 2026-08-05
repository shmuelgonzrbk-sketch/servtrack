// Arrancar el sistema de notificaciones
(async function () {
  await notificationManager.init();

  // Cuando el usuario toca una notificación
  window.addEventListener('mm:notification-tapped', function (e) {
    var cardId = e.detail.cardId;
    console.log('Notificación tocada, cardId:', cardId);
    // acá navegas a la tarjeta que corresponda
  });
})();






'use strict';

/* ── URL DE COMPARTIR ── */
const SHARE_URL = 'https://assendapp.com/';

/* ── CAPACITOR PLUGINS ── */
let Cap = { Share:null, Prefs:null, Notif:null, SBar:null, App:null, Dialog:null };

(async () => {
  try { Cap.Share  = (await import('@capacitor/share')).Share; } catch(e){}
  try { Cap.Prefs  = (await import('@capacitor/preferences')).Preferences; } catch(e){}
  try { Cap.Notif  = (await import('@capacitor/local-notifications')).LocalNotifications; } catch(e){}
  try { Cap.SBar   = (await import('@capacitor/status-bar')).StatusBar; } catch(e){}
  try { Cap.App    = (await import('@capacitor/app')).App; } catch(e){}
  try { Cap.Dialog = (await import('@capacitor/dialog')).Dialog; } catch(e){}

  if (Cap.SBar) {
    try {
      await Cap.SBar.setOverlaysWebView({ overlay: true });
      await Cap.SBar.setBackgroundColor({ color: '#1a2b40' });
      await Cap.SBar.setStyle({ style: 'DARK' });
    } catch(e){}
  }

  if (Cap.Notif) {
    try {
      await Cap.Notif.createChannel({
        id: 'servtrack', name: 'AssendApp',
        description: 'Recordatorios de visitas',
        importance: 5, visibility: 1, vibration: true, sound: 'default',
      });
      await Cap.Notif.addListener('localNotificationActionPerformed', ev => {
        const id = ev.notification.extra?.cardId;
        if (id) openDet(id);
      });
    } catch(e){}
  }

  if (Cap.App) Cap.App.addListener('backButton', handleBack);

  try {
    const { Device } = await import('@capacitor/device');
    const { platform } = await Device.getInfo();
    if (platform === 'android' || platform === 'ios') {
      const el = document.getElementById('drawerPlayStore');
      if (el) el.style.display = 'none';
    }
  } catch(e){}
})();

function handleBack() {
  if (document.getElementById('asigFormBg').classList.contains('open')) { closeAsigForm(); return; }
  if (document.getElementById('formBg').classList.contains('open'))  { closeForm();   return; }
  if (document.getElementById('detBg').classList.contains('open'))   { closeDet();    return; }
  if (document.getElementById('drawer').classList.contains('open'))  { closeDrawer(); return; }
  if (currentView !== 'home') { goTo('home'); return; }
  Cap.App?.minimizeApp?.();
}

(function() {
  const hideFab = () => {
    const fab = document.getElementById('fabBtn');
    if (!fab || !window.visualViewport) return;
    fab.style.display = window.visualViewport.height < window.screen.height * 0.75 ? 'none' : '';
  };
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', hideFab);
    window.visualViewport.addEventListener('scroll', hideFab);
  }
  window.addEventListener('resize', hideFab);
})();

/* ================================================================
   ESTADO
================================================================ */
const DEMO = [];
let cards  = [];
let nextId = 100;
let tab    = 'all';
let q      = '';
let currentView = 'home';

let cfg = {
  diasAntes:  1,
  horasAntes: 2,
  activo:     true,
  vibrar:     true,
  sonido:     true,
  orden:      'fecha',
  idioma:     'es',
  scrollMode: 'normal',
};

let swReg = null;

async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register('/sw.js');
    navigator.serviceWorker.addEventListener('message', e => {
      if (e.data?.type === 'OPEN_CARD') openDet(e.data.cardId);
    });
  } catch(err) { console.warn('[SW]', err); }
}

function swPost(msg) {
  if (swReg?.active) swReg.active.postMessage(msg);
}


/* ================================================================
   TRADUCCIONES — Español / English
================================================================ */
const LANGS = {
  es: {
    app_name:'Mi Ministerio', sub:'Organiza tu campo',
    revisitas:'Revisitas', estudios:'Estudios', este_mes:'Este mes',
    buscar:'Buscar persona, dirección…', todos:'Todos', hoy:'Hoy', agregar:'Agregar persona',
    inicio:'Inicio', precursorado:'Precursorado',
    historial:'Historial', ajustes:'Ajustes', informe_titulo:'Mi Informe',
    nueva_persona:'Nueva persona', editar_persona:'Editar persona',
    guardar:'Guardar', guardar_cambios:'Guardar cambios', cancelar:'Cancelar',
    eliminar:'Eliminar', editar:'Editar', cerrar:'Cerrar',
    visita_completada:'✔ Visita completada', compartir:'Compartir contacto',
    como_llegar:'Cómo llegar', como_llegar_gps:'Cómo llegar (GPS exacto)',
    sin_personas:'Sin personas aquí',
    sin_personas_sub:'Toca + para agregar tu primera revisita o estudio.',
    sin_fecha:'Sin fecha', sin_dir:'Sin dirección',
    nombre_req:'El nombre es obligatorio',
    guardado:'Cambios guardados ✔', agregado:'Persona agregada ✔',
    eliminado:'Persona eliminada', visita_reg:'Visita registrada ✔',
    gps_ok:'GPS registrado ✔', gps_denied:'Permiso GPS denegado',
    datos_exp:'Datos exportados', enlace_copiado:'Enlace copiado',
    borrar_confirm:'¿Borrar todos los datos?',
    idioma_lbl:'Idioma', orden_lbl:'Ordenar lista',
    por_fecha:'Por fecha', por_nombre:'Por nombre',
    por_fecha_sub:'Próxima visita primero', por_nombre_sub:'Orden alfabético',
    vibrar:'Vibrar', vibrar_sub:'Vibración al recibir aviso',
    sonido:'Sonido', sonido_sub:'Sonido al recibir aviso',
    notif_on:'Notificaciones activadas ✔',
    alertas_lbl:'Alertas activas', alertas_sub:'Recibe avisos de tus visitas',
    notif_lbl:'Notificarme', notif_activar:'Activar / verificar permiso',
    toca_hora:'Toca para cambiar la hora',
    guardar_datos:'Guardar datos', guardar_datos_sub:'Exportar copia de seguridad (JSON)',
    agregar_datos:'Agregar datos', agregar_datos_sub:'Importar desde archivo (JSON)',
    borrar_datos:'Borrar todos los datos', borrar_sub:'Esta acción no se puede deshacer',
    orden_titulo:'Ordenar lista',
    personalizacion_lbl:'Personalización', color_tema:'Color del tema',
    color_custom:'Elegir color exacto',
    pendiente:'Pendiente', interesado:'Interesado/a',
    estudio_reg:'Estudio reg.', visitado:'Visitado',
    revisita:'Revisita', estudio:'Estudio bíblico',
    historial_vacio:'El historial muestra las visitas que marcaste como completadas.',
    proxima_visita:'Próx. visita', notas_lbl:'Notas', dir_lbl:'Dirección',
    tel_lbl:'Teléfono', pub_lbl:'Publicación', tipo_lbl:'Tipo',
    estado_lbl:'Estado', hora_lbl:'Hora', fecha_lbl:'Próxima visita',
    nombre_lbl:'Nombre completo *', detalle:'Detalle',
    informe_sub:'Informe mensual del ministerio',
    participe:'Participé en el ministerio', participacion:'Participación',
    cursos:'Cursos Bíblicos', revisitaciones:'Revisitas',
    horas_lbl:'Horas', horas_sub:'Sincronizado con Precursorado',
    enviar_informe:'Enviar Informe', informe_copiado:'Informe copiado ✔',
    informe_mes:'Informe de', informe_si:'Sí', informe_no:'No',
    auxiliar:'Auxiliar', regular:'Regular', especial:'Especial',
    prec_tipo:'Tipo de precursorado', prec_meta:'Meta personalizada',
    reiniciar:'Reiniciar horas del mes',
    publicador:'Publicador', publicador_sub:'Sin registro de horas',
    visita_reg_ok:'Visita registrada en historial ✔',
    nombre_completo:'Nombre completo *', dir_placeholder:'Calle, número, piso…',
    tel_placeholder:'Número de contacto', pub_placeholder:'Publicación o tema tratado',
    notas_placeholder:'Observaciones, preguntas, temas de interés…',
    gps_label:'Ubicación GPS', registrar_gps:'Registrar ubicación',
    tipo_revisita:'Revisita', tipo_estudio:'Estudio bíblico',
    st_pendiente:'Pendiente', st_interesado:'Interesado/a', st_estudio_reg:'Estudio regular',
    cancelar_btn:'Cancelar',
    estudios_lbl:'Cursos Bíblicos',
  },
  en: {
    app_name:'My Ministry', sub:'Organize your field',
    revisitas:'Return visits', estudios:'Studies', este_mes:'This month',
    buscar:'Search person, address…', todos:'All', hoy:'Today', agregar:'Add person',
    inicio:'Home', precursorado:'Precursor',
    historial:'History', ajustes:'Settings', informe_titulo:'My Report',
    nueva_persona:'New person', editar_persona:'Edit person',
    guardar:'Save', guardar_cambios:'Save changes', cancelar:'Cancel',
    eliminar:'Delete', editar:'Edit', cerrar:'Close',
    visita_completada:'✔ Visit completed', compartir:'Share contact',
    como_llegar:'Directions', como_llegar_gps:'Directions (exact GPS)',
    sin_personas:'No people here',
    sin_personas_sub:'Tap + to add your first return visit or study.',
    sin_fecha:'No date', sin_dir:'No address',
    nombre_req:'Name is required',
    guardado:'Changes saved ✔', agregado:'Person added ✔',
    eliminado:'Person deleted', visita_reg:'Visit recorded ✔',
    gps_ok:'GPS recorded ✔', gps_denied:'GPS permission denied',
    datos_exp:'Data exported', enlace_copiado:'Link copied',
    borrar_confirm:'Delete all data?',
    idioma_lbl:'Language', orden_lbl:'Sort list',
    por_fecha:'By date', por_nombre:'By name',
    por_fecha_sub:'Upcoming first', por_nombre_sub:'Alphabetical order',
    vibrar:'Vibrate', vibrar_sub:'Vibrate on notification',
    sonido:'Sound', sonido_sub:'Sound on notification',
    notif_on:'Notifications enabled ✔',
    alertas_lbl:'Active alerts', alertas_sub:'Receive visit reminders',
    notif_lbl:'Notify me', notif_activar:'Enable / verify permission',
    toca_hora:'Tap to change time',
    guardar_datos:'Save data', guardar_datos_sub:'Export backup (JSON)',
    agregar_datos:'Add data', agregar_datos_sub:'Import from file (JSON)',
    borrar_datos:'Delete all data', borrar_sub:'This action cannot be undone',
    orden_titulo:'Sort list',
    personalizacion_lbl:'Customization', color_tema:'Theme color',
    color_custom:'Choose exact color',
    pendiente:'Pending', interesado:'Interested',
    estudio_reg:'Regular study', visitado:'Visited',
    revisita:'Return visit', estudio:'Bible study',
    historial_vacio:'History shows visits you marked as completed.',
    proxima_visita:'Next visit', notas_lbl:'Notes', dir_lbl:'Address',
    tel_lbl:'Phone', pub_lbl:'Publication', tipo_lbl:'Type',
    estado_lbl:'Status', hora_lbl:'Time', fecha_lbl:'Next visit',
    nombre_lbl:'Full name *', detalle:'Detail',
    informe_sub:'Monthly ministry report',
    participe:'I participated in ministry', participacion:'Participation',
    cursos:'Bible Studies', revisitaciones:'Return Visits',
    horas_lbl:'Hours', horas_sub:'Synced with Pioneer service',
    enviar_informe:'Send Report', informe_copiado:'Report copied ✔',
    informe_mes:'Report of', informe_si:'Yes', informe_no:'No',
    auxiliar:'Auxiliary', regular:'Regular', especial:'Special',
    prec_tipo:'Pioneer type', prec_meta:'Custom goal',
    reiniciar:'Reset monthly hours',
    publicador:'Publisher', publicador_sub:'No hours tracked',
    visita_reg_ok:'Visit recorded in history ✔',
    nombre_completo:'Full name *', dir_placeholder:'Street, number, floor…',
    tel_placeholder:'Contact number', pub_placeholder:'Publication or topic discussed',
    notas_placeholder:'Observations, questions, topics of interest…',
    gps_label:'GPS Location', registrar_gps:'Record location',
    tipo_revisita:'Return visit', tipo_estudio:'Bible study',
    st_pendiente:'Pending', st_interesado:'Interested', st_estudio_reg:'Regular study',
    cancelar_btn:'Cancel',
    estudios_lbl:'Bible Studies',
  },
};

const LANG_META = {
  es: { flag:'🇵🇪', name:'Español', dir:'ltr' },
  en: { flag:'🇺🇸', name:'English', dir:'ltr' },
};

function t(key) { return (LANGS[cfg.idioma] || LANGS.es)[key] || key; }

function getSaludo() {
  const user = getUser();
  const nombre = user ? user.nombre.split(' ')[0] : '';
  const h = new Date().getHours();
  const saludos = {
    manana: ['Buenos días, ' + nombre, 'Buen día, ' + nombre, 'Hola de nuevo, ' + nombre, 'Que tengas un buen día, ' + nombre + ' :D'],
    tarde: ['Buenas tardes, ' + nombre, 'Hola de nuevo, ' + nombre, 'Como va tu día, ' + nombre + '?', 'Sigue dando lo mejor de tí, ' + nombre + ' :D', 'Gran trabajo hoy, ' + nombre, 'Tu esfuerzo vale la pena, ' + nombre],
    noche: ['Buenas noches, ' + nombre, 'Hola de nuevo, ' + nombre, 'Que tal tu día, ' + nombre + '?']
  };
  const periodo = h < 12 ? 'manana' : h < 18 ? 'tarde' : 'noche';
  const opciones = saludos[periodo];
  return opciones[Math.floor(Math.random() * opciones.length)];
}

function getViewTitle(v) {
  return {
    home: getSaludo(), precursorado: t('precursorado'),
    informe: t('informe_titulo'),asignaciones: 'Asignaciones', history: t('historial'), settings: t('ajustes'),
  }[v] || 'Mi Ministerio';
}

function applyLang() {
  const meta = LANG_META[cfg.idioma] || LANG_META.es;
  document.documentElement.setAttribute('dir', meta.dir);
  document.documentElement.setAttribute('lang', cfg.idioma);
  const ht = document.getElementById('hdrTitle');
  if (ht) ht.textContent = getViewTitle(currentView);
  const dn = document.querySelector('.drawer-app-name'); if(dn) dn.textContent = t('app_name');
  const ds = document.querySelector('.drawer-app-sub');  if(ds) ds.textContent = t('sub');
  const navMap = { home:'inicio', precursorado:'precursorado', informe:'informe_titulo', history:'historial', settings:'ajustes' };
  Object.entries(navMap).forEach(([view, key]) => {
    const el = document.querySelector('#dnav-' + view + ' span');
    if (el) el.textContent = t(key);
  });
  const si = document.getElementById('searchInput'); if(si) si.placeholder = t('buscar');
  const tabMap = { 'tab-all':'todos', 'tab-hoy':'hoy', 'tab-revisita':'revisitas', 'tab-estudio':'estudios' };
  Object.entries(tabMap).forEach(([id, key]) => { const el = document.getElementById(id); if(el) el.textContent = t(key); });
  const fab = document.getElementById('fabBtn');
  if (fab) { const svg = fab.querySelector('svg'); fab.innerHTML = ''; if(svg) fab.appendChild(svg); fab.appendChild(document.createTextNode(' ' + t('agregar'))); }
  const stLbls = document.querySelectorAll('.hstat-l');
  const stKeys = ['revisitas','estudios','este_mes'];
  stLbls.forEach((el, i) => { if(stKeys[i]) el.textContent = t(stKeys[i]); });
  // ── Formulario: labels ──
  const lbls = {
    'lbl-nombre':  'nombre_lbl',    'lbl-dir':    'dir_lbl',
    'lbl-gps':     'gps_label',     'lbl-tel':    'tel_lbl',
    'lbl-tipo':    'tipo_lbl',      'lbl-pub':    'pub_lbl',
    'lbl-fecha':   'fecha_lbl',     'lbl-hora':   'hora_lbl',
    'lbl-estado':  'estado_lbl',    'lbl-notas':  'notas_lbl',
  };
  Object.entries(lbls).forEach(([id,k]) => { const el=document.getElementById(id); if(el) el.textContent=t(k)||el.textContent; });
  // ── Formulario: placeholders ──
  const phs = {
    'fNombre': 'nombre_completo', 'fDir': 'dir_placeholder',
    'fTel':    'tel_placeholder', 'fPub': 'pub_placeholder',
    'fNotas':  'notas_placeholder',
  };
  Object.entries(phs).forEach(([id,k]) => { const el=document.getElementById(id); if(el&&t(k)!==k) el.placeholder=t(k); });
  // ── GPS button ──
  const gBtn=document.querySelector('.btn-gps');
  if(gBtn&&!gBtn.disabled&&gBtn.textContent.trim()!=='✔ Ubicación registrada') gBtn.textContent=t('registrar_gps')||gBtn.textContent;
  // ── Select tipo ──
  const oRev=document.getElementById('opt-revisita'); if(oRev) oRev.textContent=t('tipo_revisita');
  const oEst=document.getElementById('opt-estudio');  if(oEst) oEst.textContent=t('tipo_estudio');
  // ── Select estado ──
  const stOpts={'opt-pendiente':'st_pendiente','opt-interesado':'st_interesado','opt-regular':'st_estudio_reg'};
  Object.entries(stOpts).forEach(([id,k])=>{ const el=document.getElementById(id); if(el) el.textContent=t(k); });
  // ── Panel título Detalle ──
  const dt=document.getElementById('det-title'); if(dt) dt.textContent=t('detalle');
  // ── Panel botones fijos del form ──
  const saveBtn=document.getElementById('saveBtn');
  // solo si no está en modo edición (el título es "Nueva persona")
  const fTitle=document.getElementById('formTitle');
  if(fTitle && fTitle.textContent === t('nueva_persona')) { if(saveBtn) saveBtn.textContent=t('guardar'); }
  const cancelBtns=document.querySelectorAll('.btn-cancel');
  cancelBtns.forEach(btn=>{ if(btn.textContent.trim()==='Cancelar'||btn.textContent.trim()==='Cancel') btn.textContent=t('cancelar'); });
  if (currentView && currentView !== 'home') renderView(currentView);
  else renderList();
}

/* ── PRECURSORADO ── */
let prec = { tipo:'publicador', metaAux:30, metaReg:50, metaEsp:100, horas:0, mes:'', ultimoRegistro:null };

/* ── INFORME ── */
let informe = { participo:false, cursos:0, mes:'' };
let informeHist = [];

/* ================================================================
   STORAGE
================================================================ */
async function kSet(key, val) {
  const s = JSON.stringify(val);
  if (Cap.Prefs) { try { await Cap.Prefs.set({ key, value: s }); return; } catch(e){} }
  localStorage.setItem(key, s);
}
async function kGet(key) {
  if (Cap.Prefs) { try { const { value } = await Cap.Prefs.get({ key }); return value ? JSON.parse(value) : null; } catch(e){} }
  const v = localStorage.getItem(key); return v ? JSON.parse(v) : null;
}
async function saveCards()   { await kSet('st_cards', cards); await kSet('st_nid', nextId); }

async function loadCards() {
  try {
    const data = await apiGetPersonas();
    if (Array.isArray(data)) {
      cards = data.map(p => ({
        id: p.id,
        nombre: p.nombre,
        dir: p.direccion,
        lat: p.gps_lat,
        lng: p.gps_lng,
        tel: p.telefono,
        tipo: p.tipo,
        estado: p.estado,
        notas: p.notas,
        fecha: p.proxima_visita ? p.proxima_visita.split('T')[0] : '',
        hora:  p.proxima_visita_hora ? p.proxima_visita_hora.substring(0,5) : '',
        historial: []
      }));
      return true;
    }
    return false;
  } catch(err) {
    console.error('Error cargando personas:', err);
    return false;
  }
}

async function saveCfg() {
  await kSet('st_cfg', cfg);
  try {
    await apiUpdateAjustes({
      notificaciones: cfg.activo,
      vibrar: cfg.vibrar,
      sonido: cfg.sonido,
      minutos_antes: cfg.horasAntes * 60,
      orden_lista: cfg.orden,
      tema: localStorage.getItem('mm_color') || '#1a2b40'
    });
  } catch(err) {
    console.error('Error guardando ajustes:', err);
  }
}

async function loadCfg() {
  // Cargar scrollMode desde localStorage (no está en el API)
  const localCfg = await kGet('st_cfg');
  if (localCfg && localCfg.scrollMode) cfg.scrollMode = localCfg.scrollMode;
  try {
    const data = await apiGetAjustes();
    if (data && data.id) {
      cfg.activo = data.notificaciones;
      cfg.vibrar = data.vibrar;
      cfg.sonido = data.sonido;
      cfg.horasAntes = Math.round((data.minutos_antes || 60) / 60);
      cfg.orden = data.orden_lista || 'fecha';
    }
  } catch(err) {
    if(localCfg) cfg = {...cfg, ...localCfg};
  }
}

async function savePrec()    { await kSet('st_prec', prec); }

async function loadPrec() {
  try {
    const data = await apiGetPrec();
    if (data && data.tipo) {
      prec.tipo = data.tipo;
      prec.metaAux = data.meta_horas || 30;
      prec.horas = data.horas || 0;
    }
  } catch(err) {
    console.error('Error cargando precursorado:', err);
  }
}


async function saveInforme() { await kSet('st_informe', informe); }
async function loadInforme() {
  try {
    const data = await apiGetInformes();
    if (Array.isArray(data) && data.length > 0) {
      const mesActual = new Date().getMonth() + 1;
      const añoActual = new Date().getFullYear();
      const actual = data.find(i => i.mes === mesActual && i.año === añoActual);
      if (actual) {
        informe.cursos = actual.cursos_biblicos || 0;
        informe.participo = actual.revisitas > 0;
      }
    }
    informe.mes = mesKey();
  } catch(err) {
    console.error('Error cargando informe:', err);
    informe.mes = mesKey();
  }
}
async function saveInformeHist() { await kSet('st_informe_hist', informeHist); }
async function archivarInforme() {
  const mesActual  = mesKey();
  const yaExiste   = informeHist.find(i => i.mes === mesActual);
  if (yaExiste) return;

  const esPrecursor = prec.tipo === 'auxiliar' || prec.tipo === 'regular' || prec.tipo === 'especial';

  informeHist.push({
    mes:        mesActual,
    mesNombre:  mesNombre(),
    participo:  informe.participo,
    cursos:     informe.cursos,
    horas:      esPrecursor ? prec.horas : null,
    tipo:       prec.tipo,
    enviado:    false,
    guardadoEn: new Date().toISOString(),
  });

  await saveInformeHist();
}
async function loadInformeHist() {
  try {
    const data = await apiGetInformes();
    if (Array.isArray(data)) {
      const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      informeHist = data.map(i => ({
        mes: i.año + '-' + String(i.mes).padStart(2,'0'),
        mesNombre: M[i.mes - 1] + ' ' + i.año,
        cursos: i.cursos_biblicos,
        horas: i.horas,
        revisitas: i.revisitas,
        enviado: i.enviado,
        tipo: prec.tipo,
        participo: i.revisitas > 0
      }));
    }
  } catch(err) {
    console.error('Error cargando historial de informes:', err);
  }
}

/* ================================================================
   UTILIDADES
================================================================ */
function today()  { return new Date().toISOString().split('T')[0]; }
function mesKey() { return new Date().toISOString().substring(0, 7); }
function mesNombre() {
  const M = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const d = new Date(); return M[d.getMonth()] + ' ' + d.getFullYear();
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0]; }
function fmtDate(d, h) {
  if (!d) return t('sin_fecha');
  const [,m,dd] = d.split('-');
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return dd + ' ' + M[parseInt(m)-1] + (h ? ' · ' + h : '');
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return d.getDate() + ' ' + M[d.getMonth()] + ' · ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function whenLabel(fecha, hora) {
  if (!fecha) return { dot:null, tx:'' };
  const hoy = today(), v = new Date(fecha + 'T' + (hora||'00:00')), dh = (v - new Date()) / 3600000;
  if (fecha === hoy) {
    if (dh > 0 && dh <= 2) return { dot:'red', tx:'¡' + Math.round(dh*60) + 'min!' };
    if (dh > 0) return { dot:'blue', tx:(t('hoy')||'Hoy') + ' ' + hora };
    return { dot:null, tx:(t('hoy')||'Hoy') + ' ' + hora };
  }
  if (fecha === addDays(hoy, 1)) return { dot:'blue', tx:'Mañana ' + hora };
  return { dot:null, tx:fmtDate(fecha, hora) };
}
function initials(n) { return n.trim().split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function badge(est) {
  return ({
    pendiente:  ['b-pend',  t('pendiente')],
    interesado: ['b-inter', t('interesado')],
    regular:    ['b-reg',   t('estudio_reg')],
    visitado:   ['b-vis',   t('visitado')],
  })[est] || ['b-pend', est];
}

let _psClickCount = 0;
let _psLastClick = 0;
const PS_MESSAGES = [
  '🚀 Muy pronto disponible en Play Store',
  '👀 Ya la vas a poder descargar pronto',
  '😅 Tranquilo, ya casi está',
  '🙃 En serio, ya casi...',
  '😤 QUE ESPEREEES',
  '🥲 Ok ya, en serio en serio',
  '🫠 Bro por favor',
  ' Ya no tengo más mensajes chistosos',
  '🔁 ¿Vas a seguir tocando esto?',
  '🤝 Está bien, respeto tu dedicación',
];

function clickPlaystore() {
  const now = Date.now();
  const rapido = (now - _psLastClick) < 900; // menos de 900ms entre clicks = "insistiendo"
  _psLastClick = now;

  _psClickCount = rapido ? (_psClickCount + 1) : 0;

  const msg = PS_MESSAGES[Math.min(_psClickCount, PS_MESSAGES.length - 1)];
  toast(msg);

  const btn = document.getElementById('playstoreBtn');
  if (btn) {
    btn.style.animation = 'none';
    void btn.offsetWidth;
    btn.style.animation = 'psShake .4s ease';
  }
}

function toast(msg) {
  let el = document.getElementById('_toast');
  if (!el) { el = document.createElement('div'); el.id = '_toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ================================================================
   DRAWER / NAVEGACIÓN
================================================================ */
function toggleDrawer() {
  const drawer = document.getElementById('drawer');
  const isOpening = !drawer.classList.contains('open');
  drawer.classList.toggle('open');
  document.getElementById('drawerScrim').classList.toggle('open');
  const fab = document.getElementById('fabBtn');
  if (fab) {
    if (isOpening) {
      fab.classList.add('fab-hidden');
      setTimeout(updateFabVisibility, 280);
    } else {
      fab.classList.remove('fab-hidden');
      updateFabVisibility();
    }
  }
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerScrim').classList.remove('open');
  const fab = document.getElementById('fabBtn');
  if (fab) fab.classList.remove('fab-hidden');
  updateFabVisibility();
}

function goTo(view) {
  if (view === currentView) { closeDrawer(); return; }
  closeDrawer();
  const prevEl = document.getElementById('view-' + currentView);
  const nextEl = document.getElementById('view-' + view);
  document.getElementById('dnav-' + currentView)?.classList.remove('active');
  if (prevEl && prevEl.classList.contains('slide')) {
    prevEl.classList.add('leaving');
    setTimeout(() => prevEl.classList.remove('active','leaving'), 300);
  } else if (prevEl) { prevEl.classList.remove('active'); }

  if (currentView === 'home') {
    const list = document.getElementById('cardList');
    const oldSpacer = list?.querySelector('.stack-spacer');
    if (oldSpacer) oldSpacer.remove();

    document.querySelectorAll('#cardList .card').forEach(card => {
      card.style.position = '';
      card.style.top = '';
      card.style.zIndex = '';
    });

    const fab = document.getElementById('fabBtn');
    if (fab) fab.style.zIndex = '';
  }
  currentView = view;
  if (nextEl && nextEl.classList.contains('slide')) {
    nextEl.style.transition = 'none';
    nextEl.style.opacity    = '0';
    nextEl.style.transform  = 'translateX(28px)';
    nextEl.classList.add('active');
    void nextEl.offsetWidth;
    nextEl.style.transition = '';
    nextEl.style.opacity    = '';
    nextEl.style.transform  = '';
  } else if (nextEl) { nextEl.classList.add('active'); }
  document.getElementById('dnav-' + view)?.classList.add('active');
  document.getElementById('hdrTitle').textContent = getViewTitle(view);
  renderView(view);
  if (view === 'home') renderList();

  const fab = document.getElementById('fabBtn');
  if (fab) {
    fab.style.display = view === 'home' ? '' : 'none';
    fab.style.visibility = view === 'home' ? 'visible' : 'hidden';}
  
    window.location.hash = view;
}

function renderView(v) {
  if (v === 'precursorado') buildPrec();
  if (v === 'informe')      buildInforme();
  if (v === 'asignaciones') buildAsignaciones();
  if (v === 'history')      buildHistory();
  if (v === 'settings')     buildSettings();
}

/* ================================================================
   NOTIFICACIONES
================================================================ */
function notifId1(id) { return id*10+1; }
function notifId2(id) { return id*10+2; }

async function reqPermission() {
  if (Cap.Notif) {
    try {
      const { display } = await Cap.Notif.checkPermissions();
      if (display !== 'granted') await Cap.Notif.requestPermissions();
      await schedAll(); toast(t('notif_on'));
    } catch(e) { toast('Error al activar notificaciones'); }
  } else if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(p => { if (p==='granted') { schedAll(); toast(t('notif_on')); } });
  }
}

async function schedCard(card) {
  if (!card.fecha || !card.hora || !cfg.activo) return;
  const vMs = new Date(card.fecha + 'T' + card.hora).getTime();
  const now = Date.now();
  const nots = [];
  if (cfg.diasAntes > 0) {
    const at = vMs - cfg.diasAntes * 86400000;
    const lbl = cfg.diasAntes === 1 ? 'mañana' : 'en ' + cfg.diasAntes + ' días';
    if (at > now) nots.push({ id:notifId1(card.id), title:'AssendApp — Visita '+lbl, body:'Tienes visita con '+card.nombre+' '+lbl+' a las '+card.hora+(card.dir?'\n'+card.dir:''), schedule:{ at:new Date(at), allowWhileIdle:true }, extra:{ cardId:card.id }, channelId:'servtrack', smallIcon:'ic_stat_icon' });
  }
  if (cfg.horasAntes > 0) {
    const at = vMs - cfg.horasAntes * 3600000;
    const lbl = cfg.horasAntes === 1 ? '1 hora' : cfg.horasAntes + ' horas';
    if (at > now) nots.push({ id:notifId2(card.id), title:'AssendApp — En '+lbl, body:'Visita con '+card.nombre+' a las '+card.hora+(card.dir?'\n'+card.dir:''), schedule:{ at:new Date(at), allowWhileIdle:true }, extra:{ cardId:card.id }, channelId:'servtrack', smallIcon:'ic_stat_icon' });
  }
  if (Cap.Notif && nots.length) { try { await Cap.Notif.schedule({ notifications:nots }); } catch(e){} }
  else if ('Notification' in window && Notification.permission === 'granted') {
    nots.forEach(n => swPost({ type:'SCHEDULE_NOTIF', payload:{ id:n.id, cardId:card.id, title:n.title, body:n.body, fireAt:n.schedule.at.getTime(), vibrate:cfg.vibrar, sound:cfg.sonido } }));
  }
}

async function cancelCard(id) {
  if (Cap.Notif) { try { await Cap.Notif.cancel({ notifications:[{id:notifId1(id)},{id:notifId2(id)}] }); } catch(e){} }
  swPost({ type:'CANCEL_CARD', cardId:id });
}

async function schedAll() {
  if (Cap.Notif) { try { const {notifications:p} = await Cap.Notif.getPending(); if(p.length) await Cap.Notif.cancel({notifications:p}); } catch(e){} }
  if (!cfg.activo) return;
  for (const c of cards) await schedCard(c);
}

/* ================================================================
   GPS
================================================================ */
function captureGPS() {
  if (!navigator.geolocation) { toast('GPS no disponible'); return; }
  const btn = document.querySelector('[onclick="captureGPS()"]');
  if (btn) { btn.textContent = '⏳ Obteniendo…'; btn.disabled = true; }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude.toFixed(6), lng = pos.coords.longitude.toFixed(6);
    document.getElementById('fLat').value = lat;
    document.getElementById('fLng').value = lng;
    showMap(lat, lng);
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg> ✔ Ubicación registrada'; btn.disabled = false; }
    document.getElementById('mapClearBtn').style.display = 'inline-flex';
    toast(t('gps_ok'));
  }, err => {
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg> Registrar ubicación'; btn.disabled = false; }
    toast(err.code === 1 ? t('gps_denied') : 'No se pudo obtener el GPS');
  }, { enableHighAccuracy:true, timeout:10000 });
}
function showMap(lat, lng) {
  const f = document.getElementById('mapIframe');
  f.src = 'https://maps.google.com/maps?q=' + lat + ',' + lng + '&z=17&output=embed';
  f.style.display = 'block';
  document.getElementById('mapEmpty').style.display = 'none';
}
function clearGPS() {
  document.getElementById('fLat').value = '';
  document.getElementById('fLng').value = '';
  const f = document.getElementById('mapIframe');
  f.style.display = 'none'; f.src = '';
  document.getElementById('mapEmpty').style.display = 'flex';
  document.getElementById('mapClearBtn').style.display = 'none';
  const btn = document.querySelector('.btn-gps'); if(btn) btn.textContent = 'Registrar ubicación';
}
function resetMap() {
  clearGPS();
  const btnGps = document.querySelector('[onclick="captureGPS()"]');
  if (btnGps) btnGps.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg> Registrar ubicación';
}
function openNav(lat, lng, dir) {
  window.open('https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=' + (lat&&lng ? lat+','+lng : encodeURIComponent(dir)), '_blank');
}

function iniciarMapa(lat, lng, conMarcador) {
  _leafletMap = L.map('leafletMap').setView([lat, lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(_leafletMap);

  if (conMarcador) {
    _leafletMarker = L.marker([lat, lng]).addTo(_leafletMap);
    document.getElementById('confirmMapBtn').disabled = false;
    document.getElementById('confirmMapBtn').style.opacity = '1';
  }

  _leafletMap.on('click', function(e) {
    if (_leafletMarker) _leafletMap.removeLayer(_leafletMarker);
    _leafletMarker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(_leafletMap);
    document.getElementById('confirmMapBtn').disabled = false;
    document.getElementById('confirmMapBtn').style.opacity = '1';
  });
}


let _leafletMap = null;
let _leafletMarker = null;

function openMapPicker() {
  // Crear overlay del mapa
  const overlay = document.createElement('div');
  overlay.id = 'mapPickerOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;display:flex;flex-direction:column';

  overlay.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--navy);color:#fff">'
      + '<button onclick="closeMapPicker()" style="background:none;border:none;color:#fff;cursor:pointer;padding:0">'
        + '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>'
      + '</button>'
      + '<span style="font-size:16px;font-weight:600">Buscar ubicación</span>'
    + '</div>'
    + '<div style="padding:10px 16px;background:#f8f9fb;border-bottom:1px solid var(--border)">'
      + '<input id="mapSearchInput" type="text" placeholder="Buscar dirección..." style="'
        + 'width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;'
        + 'font-size:14px;font-family:var(--f-sans);box-sizing:border-box"'
        + ' onkeydown="if(event.key===\'Enter\') searchMapAddress()"/>'
      + '<button onclick="searchMapAddress()" style="'
        + 'margin-top:8px;width:100%;padding:10px;border-radius:10px;'
        + 'background:var(--navy);color:#fff;border:none;font-size:14px;'
        + 'font-weight:600;cursor:pointer">Buscar</button>'
    + '</div>'
    + '<div style="font-size:12px;color:var(--tx3);padding:8px 16px;background:#f8f9fb;border-bottom:1px solid var(--border)">'
      + 'Toca el mapa para marcar la ubicación exacta'
    + '</div>'
    + '<div id="leafletMap" style="flex:1"></div>'
    + '<div style="padding:12px 16px;background:#fff;border-top:1px solid var(--border)">'
      + '<button id="confirmMapBtn" onclick="confirmMapLocation()" style="'
        + 'width:100%;padding:14px;border-radius:12px;background:var(--navy);'
        + 'color:#fff;border:none;font-size:15px;font-weight:600;cursor:pointer;'
        + 'opacity:.4" disabled>Confirmar ubicación</button>'
    + '</div>';

  document.body.appendChild(overlay);

  // Inicializar mapa
  // Inicializar mapa
  setTimeout(() => {
    const latGuardada = document.getElementById('fLat').value;
    const lngGuardada = document.getElementById('fLng').value;

    // Si ya tiene coordenadas guardadas úsalas, si no pide ubicación actual
    if (latGuardada && lngGuardada) {
      iniciarMapa(parseFloat(latGuardada), parseFloat(lngGuardada), true);
      mostrarUbiUsuarioEnMapa();
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { iniciarMapa(pos.coords.latitude, pos.coords.longitude, false); mostrarUbiUsuarioEnMapa(); },
        ()  => iniciarMapa(-12.0464, -77.0428, false),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      iniciarMapa(-12.0464, -77.0428, false);
    }
  }, 100);
}

async function searchMapAddress() {
  const q = document.getElementById('mapSearchInput').value.trim();
  if (!q) return;

  try {
    const res  = await fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(q) + '&limit=1');
    const data = await res.json();
    if (!data.length) { toast('No se encontró esa dirección'); return; }
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    _leafletMap.setView([lat, lng], 17);
    if (_leafletMarker) _leafletMap.removeLayer(_leafletMarker);
    _leafletMarker = L.marker([lat, lng]).addTo(_leafletMap);
    document.getElementById('confirmMapBtn').disabled = false;
    document.getElementById('confirmMapBtn').style.opacity = '1';
  } catch(e) {
    toast('Error al buscar la dirección');
  }
}

function mostrarUbiUsuarioEnMapa() {
  if (!_leafletMap || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const userIcon = L.divIcon({
      className: 'user-location-dot',
      html: '<div style="width:16px;height:16px;background:#4285f4;border:3px solid #fff;border-radius:50%;box-shadow:0 0 8px rgba(66,133,244,0.5)"></div><div style="width:40px;height:40px;background:rgba(66,133,244,0.15);border-radius:50%;position:absolute;top:-12px;left:-12px"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([lat, lng], { icon: userIcon, interactive: false }).addTo(_leafletMap);
  }, () => {}, { enableHighAccuracy: true, timeout: 5000 });
}

function confirmMapLocation() {
  if (!_leafletMarker) return;
  const { lat, lng } = _leafletMarker.getLatLng();
  document.getElementById('fLat').value = lat.toFixed(6);
  document.getElementById('fLng').value = lng.toFixed(6);
  showMap(lat.toFixed(6), lng.toFixed(6));
  document.getElementById('mapClearBtn').style.display = 'inline-flex';
  const btnGps = document.querySelector('.btn-gps');
  if (btnGps) btnGps.textContent = '✔ Ubicación registrada';
  closeMapPicker();
  toast(t('gps_ok'));
  // Asegurarse que el formulario sigue visible
  document.getElementById('formBg').classList.add('open');
}

function closeMapPicker() {
  const overlay = document.getElementById('mapPickerOverlay');
  if (overlay) overlay.remove();
  if (_leafletMap) { _leafletMap.remove(); _leafletMap = null; }
  _leafletMarker = null;
}

/* ================================================================
   COMPARTIR
================================================================ */
/* ================================================================
   COMPARTIR
================================================================ */
function makeShareUrl(c) {
  const d = { nombre:c.nombre||'', dir:c.dir||'', lat:c.lat||'', lng:c.lng||'', tel:c.tel||'', tipo:c.tipo||'revisita', pub:c.pub||'', fecha:c.fecha||'', hora:c.hora||'', estado:c.estado||'pendiente', notas:c.notas||'' };
  return SHARE_URL + '?c=' + btoa(unescape(encodeURIComponent(JSON.stringify(d))));
}

async function shareCard(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  const url  = makeShareUrl(c);
  const text = 'Te comparto el contacto de ' + c.nombre + ' desde AssendApp.\nToca el enlace para agregarlo:';
  if (Cap.Share) { try { await Cap.Share.share({ title:'AssendApp — '+c.nombre, text, url, dialogTitle:t('compartir') }); return; } catch(e){} }
  if (navigator.share) { try { await navigator.share({ title:'AssendApp — '+c.nombre, text, url }); return; } catch(e){} }
  try { await navigator.clipboard.writeText(url); toast(t('enlace_copiado')); } catch(e) { toast('No se pudo compartir'); }
}

function checkUrlImport() {
  try {
    const b64 = new URLSearchParams(window.location.search).get('c');
    if (!b64) return;
    window.history.replaceState({}, '', window.location.pathname);
    const d = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (!d.nombre) return;
    showImportPanel(d);
  } catch(e) {}
}

let _pendingImport = null;
function showImportPanel(d) {
  _pendingImport = d;
  const fab = document.getElementById('fabAdd'); if (fab) fab.style.display = 'none';
  const addBtn = document.querySelector('.fab'); if (addBtn) addBtn.style.display = 'none';
  const tipo = d.tipo === 'estudio' ? t('estudio') : t('revisita');
  document.getElementById('det-title').textContent = 'Contacto recibido';
  document.getElementById('detBody').innerHTML =
    '<div style="font-size:11px;font-weight:600;color:var(--tx3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px">Compartido desde Mi Ministerio</div>'
    + '<div class="det-head">'
      + '<div class="det-ava">' + initials(d.nombre) + '</div>'
      + '<div>'
        + '<div class="det-name">' + d.nombre + '</div>'
        + '<div class="det-tipo">' + tipo + '</div>'
      + '</div>'
    + '</div>'
    + '<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:14px">'
      + (d.dir   ? drow('Dirección',    d.dir) : '')
      + (d.tel   ? drow('Teléfono',     d.tel) : '')
      + (d.pub   ? drow('Publicación',  d.pub) : '')
      + (d.fecha ? drow('Próx. visita', fmtDate(d.fecha, d.hora)) : '')
    + '</div>'
    + '<button class="btn-save" style="margin-top:20px" onclick="confirmImport()">Agregar a mi lista</button>'
    + '<button class="btn-cancel" onclick="closeDet()">' + t('cancelar') + '</button>';
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

async function confirmImport() {
  if (!_pendingImport) return;
  const existe = cards.find(c => c.nombre === _pendingImport.nombre && c.dir === _pendingImport.dir);
  if (existe) { toast('Ya está en tu lista'); }
  else {
    // Guardar en el backend
    try {
      const token = localStorage.getItem('st_token');
      if (token) {
        const body = {
          nombre: _pendingImport.nombre,
          direccion: _pendingImport.dir || '',
          telefono: _pendingImport.tel || '',
          tipo: _pendingImport.tipo || 'revisita',
          estado: _pendingImport.estado || 'pendiente',
          notas: _pendingImport.notas || '',
          proxima_visita: _pendingImport.fecha || null,
          proxima_visita_hora: _pendingImport.hora || null,
          pub: _pendingImport.pub || null
        };
        await fetch(API_BASE + '/api/personas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify(body)
        });
      }
    } catch(e) { console.error('Error guardando en BD:', e); }
    const nc = { id:nextId++, historial:[], ..._pendingImport };
    cards.push(nc); await saveCards(); await schedCard(nc);
    updateStats(); renderList(); toast('✔ ' + _pendingImport.nombre + ' agregado');
  }
  _pendingImport = null; closeDet();
  document.querySelectorAll('.fab, #fabAdd').forEach(f => f.style.display = '');
}
/* ================================================================
   JSON IMPORT / EXPORT
================================================================ */
function triggerJSON() {
  const el = document.getElementById('jsonInput');
  el.value = ''; el.click();
}
async function importJSON(input) {
  const file = input.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) { toast('Archivo inválido'); return; }
      let n = 0;
      for (const c of data) {
        if (!cards.find(x => x.nombre === c.nombre && x.dir === c.dir)) {
          const nc = { ...c, id:nextId++, historial:c.historial||[] };
          cards.push(nc); await schedCard(nc); n++;
        }
      }
      await saveCards(); updateStats(); renderList();
      toast(n > 0 ? '✔ ' + n + ' contacto(s) importado(s)' : 'No hay contactos nuevos');
    } catch(err) { toast('Error al leer el archivo'); }
  };
  r.readAsText(file);
}
function exportJSON() {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'servtrack_' + today() + '.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  toast(t('datos_exp'));
}

/* ================================================================
   STATS + LISTA HOME
================================================================ */
/* ── GPS PROXIMIDAD ── */
let _userLat = null, _userLng = null;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function formatDist(m) {
  if (m < 1000) return Math.round(m) + 'm';
  return (m/1000).toFixed(1) + 'km';
}

function updateUserPosition() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    pos => { _userLat = pos.coords.latitude; _userLng = pos.coords.longitude; if (tab === 'hoy') renderList(); },
    () => {},
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function updateStats() {
  const mes = mesKey();
  const statR = document.getElementById('statR');
  const statE = document.getElementById('statE');
  const statM = document.getElementById('statM');
  const badge = document.getElementById('todayBadge');
  if (statR) statR.textContent = cards.filter(c => c.tipo === 'revisita').length;
  if (statE) statE.textContent = cards.filter(c => c.tipo === 'estudio').length;
  if (statM) statM.textContent = cards.filter(c => c.fecha && c.fecha.startsWith(mes)).length;
  if (badge) badge.textContent = cards.filter(c => c.fecha === today()).length + ' ' + t('hoy');
}

function setTab(v) {
  tab = v;
  if (v === 'hoy') updateUserPosition();
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('on'));
  document.getElementById('tab-' + v)?.classList.add('on');
  renderList();
}

function onSearch(v) { q = v.toLowerCase().trim(); renderList(); }

function renderList() {
  const list = document.getElementById('cardList');
  const hoy  = today();
  let items = cards.filter(c => {
    if (q) {
      const txt = [(c.nombre||''),(c.dir||''),(c.tel||''),(c.pub||''),(c.notas||'')]
        .join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (!txt.includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g,''))) return false;
    }
    if (tab === 'revisita') return c.tipo === 'revisita';
    if (tab === 'estudio')  return c.tipo === 'estudio';
    if (tab === 'hoy')      return c.fecha === hoy;
    return true;
  }).sort((a, b) => {
    if (tab === 'hoy' && _userLat && _userLng) {
      const distA = (a.lat && a.lng) ? haversine(_userLat, _userLng, parseFloat(a.lat), parseFloat(a.lng)) : 999999;
      const distB = (b.lat && b.lng) ? haversine(_userLat, _userLng, parseFloat(b.lat), parseFloat(b.lng)) : 999999;
      return distA - distB;
    }
    if (cfg.orden === 'nombre') return (a.nombre||'').localeCompare(b.nombre||'');
    if (!a.fecha) return 1; if (!b.fecha) return -1;
    return a.fecha.localeCompare(b.fecha) || (a.hora||'').localeCompare(b.hora||'');
  });

  if (!items.length) {
    list.innerHTML = '<div class="empty-wrap">'
      + '<svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>'
      + '<div class="empty-title">' + t('sin_personas') + '</div>'
      + '<div class="empty-sub">' + t('sin_personas_sub') + '</div>'
      + '</div>';
      setTimeout(() => applyStackEffect(), 300);
    return;
    
  }

  list.innerHTML = items.map((c, index) => {
    const [bc, bl] = badge(c.estado);
    const wl = whenLabel(c.fecha, c.hora);
    const dot = wl.dot ? '<span class="dot' + (wl.dot==='red'?' red':'') + '"></span>' : '';
    const hasGps = c.lat && c.lng;
    const delay = 'style="--card-delay:' + (index * 0.06) + 's"';
    return '<div class="card" ' + delay + ' onclick="openDet(' + c.id + ')" oncontextmenu="event.preventDefault();shareCard(' + c.id + ')" ontouchstart="lp_start(' + c.id + ',event)" ontouchend="lp_end()" ontouchmove="lp_end()">'
      + '<div class="card-row1">'
        + '<div class="ava">' + initials(c.nombre) + '</div>'
        + '<div class="card-info">'
          + '<div class="card-name">' + c.nombre + '</div>'
          + '<div class="card-addr">' + (c.dir || t('sin_dir')) + '</div>'
        + '</div>'
        + '<span class="badge ' + bc + '">' + bl + '</span>'
      + '</div>'
      + '<div class="card-row2">'
        + '<span class="card-pub">' + (c.pub ? c.pub.substring(0,32)+(c.pub.length>32?'…':'') : c.tipo==='estudio'?t('estudio'):t('revisita')) + '</span>'
        + '<span class="card-when">' + dot + wl.tx + (tab === 'hoy' && _userLat && _userLng && c.lat && c.lng ? ' · ' + formatDist(haversine(_userLat, _userLng, parseFloat(c.lat), parseFloat(c.lng))) : '') + '</span>'
      + '</div>'
      + '<div class="card-row3">'
        + '<button class="btn-nav" onclick="event.stopPropagation();openNav(\'' + (c.lat||'') + '\',\'' + (c.lng||'') + '\',\'' + (c.dir||'').replace(/'/g,'') + '\')">'
          + '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
          + t(hasGps ? 'como_llegar_gps' : 'como_llegar')
        + '</button>'
      + '</div>'
    + '</div>';
  }).join('');
  setTimeout(() => applyStackEffect(), 300);



}


let _lpT = null, _lpEl = null;
function lp_start(id, e) {
  _lpEl = e.currentTarget; _lpEl.classList.add('pressing');
  _lpT = setTimeout(async () => { _lpEl?.classList.remove('pressing'); e.preventDefault(); await shareCard(id); }, 3000);
}
function lp_end() { clearTimeout(_lpT); _lpT = null; _lpEl?.classList.remove('pressing'); _lpEl = null; }

/* ================================================================
   DETALLE
================================================================ */
function drow(label, val) {
  return '<div class="det-row"><span class="det-lbl">' + label + '</span><span class="det-val">' + val + '</span></div>';
}

function openDet(id) {
  const c = cards.find(x => x.id === id); if (!c) return;
  const [bc, bl] = badge(c.estado);
  const hasGps = c.lat && c.lng;
  const mapH = hasGps
    ? '<div class="det-map"><iframe src="https://maps.google.com/maps?q=' + c.lat + ',' + c.lng + '&z=17&output=embed" width="100%" height="180" frameborder="0" allowfullscreen style="display:block"></iframe></div>'
    : '';
  document.getElementById('detBody').innerHTML =
    '<div class="det-head">'
      + '<div class="det-ava">' + initials(c.nombre) + '</div>'
      + '<div>'
        + '<div class="det-name">' + c.nombre + '</div>'
        + '<div class="det-tipo">' + (c.tipo==='estudio'?t('estudio'):t('revisita')) + ' &nbsp;<span class="badge ' + bc + '">' + bl + '</span></div>'
      + '</div>'
    + '</div>'
    + drow(t('dir_lbl'),         c.dir || '—')
    + drow(t('tel_lbl'),         c.tel ? '<a href="tel:' + c.tel + '" style="color:var(--accent)">' + c.tel + '</a>' : '—')
    + drow(t('pub_lbl'),         c.pub || '—')
    + drow(t('proxima_visita'),  fmtDate(c.fecha, c.hora))
    + drow(t('notas_lbl'),       c.notas || '—')
    + mapH
    + '<button class="btn-nav" style="margin:14px 0 6px" onclick="openNav(\'' + (c.lat||'') + '\',\'' + (c.lng||'') + '\',\'' + (c.dir||'').replace(/'/g,'') + '\')">'
      + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'
      + t(hasGps ? 'como_llegar_gps' : 'como_llegar')
    + '</button>'
    + '<button class="btn-outline" onclick="shareCard(' + id + ')">'
      + '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>'
      + t('compartir')
    + '</button>'
    + '<div class="det-actions">'
      + '<button class="btn-edit" onclick="editCard(' + id + ')">' + t('editar') + '</button>'
      + '<button class="btn-danger" style="margin-top:0" onclick="deleteCard(' + id + ')">' + t('eliminar') + '</button>'
    + '</div>'
    + '<button class="btn-save" style="margin-top:10px" onclick="markVisited(' + id + ')">' + t('visita_completada') + '</button>'
    + '<button class="btn-cancel" onclick="closeDet()">' + t('cerrar') + '</button>';
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

function closeDet() {
  document.getElementById('detBg').classList.remove('open', 'chat-fullscreen');
  updateFabVisibility();
}

async function markVisited(id) {
  const c = cards.find(x => x.id === id); if (!c) return;

  // 1. Registrar visita real en la BD (tabla visitas)
  try {
    await fetch(API_URL + '/personas/' + id + '/visitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('st_token') },
      body: JSON.stringify({ publicacion: c.pub || null, notas: c.notas || null })
    });
  } catch(e) { console.error('Error registrando visita:', e); }

  // 2. Limpiar proxima visita en la BD
  await apiUpdatePersona(id, {
    nombre: c.nombre,
    direccion: c.dir,
    telefono: c.tel,
    tipo: c.tipo,
    estado: c.estado,
    gps_lat: c.lat,
    gps_lng: c.lng,
    proxima_visita: null,
    proxima_visita_hora: null
  });

  // 3. Limpiar localmente también
  c.proxima_visita = null;
  c.hora = null;
  if (!c.historial) c.historial = [];
  c.historial.push({ fecha: today(), hora: '', nota: t('visita_reg_ok') || 'Visita realizada' });

  closeDet(); updateStats(); renderList();
  toast(t('visita_reg') || '✔ Visita registrada');

  // 4. Redirigir a historial/visitados
  setTimeout(() => goTo('history'), 600);
}
/* ================================================================
   FORMULARIO
================================================================ */
function openForm(editData) {
  resetMap();
  const title = document.getElementById('formTitle');
  const btn   = document.getElementById('saveBtn');
  if (!title || !btn) { 
    console.error('formPanel no tiene los elementos esperados');
    return; 
  }
  if (editData) {
    title.textContent = t('editar_persona'); btn.textContent = t('guardar_cambios');
    document.getElementById('fNombre').value = editData.nombre || '';
    document.getElementById('fDir').value    = editData.dir    || '';
    document.getElementById('fTel').value    = editData.tel    || '';
    document.getElementById('fTipo').value   = editData.tipo   || 'revisita';
    document.getElementById('fPub').value    = editData.pub    || '';
    document.getElementById('fFecha').value  = editData.fecha  || today();
    document.getElementById('fHora').value   = editData.hora   || '';
    document.getElementById('fEstado').value = editData.estado || 'pendiente';
    document.getElementById('fNotas').value  = editData.notas  || '';
    document.getElementById('fId').value     = editData.id;
    if (editData.lat && editData.lng) {
      document.getElementById('fLat').value = editData.lat;
      document.getElementById('fLng').value = editData.lng;
      showMap(editData.lat, editData.lng);
      document.getElementById('mapClearBtn').style.display = 'inline-flex';
      const btnGps = document.querySelector('[onclick="captureGPS()"]');
      if (btnGps) btnGps.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg> ✔ Ubicación registrada';
    }
  } else {
    title.textContent = t('nueva_persona'); btn.textContent = t('guardar');
    ['fNombre','fDir','fTel','fPub','fHora','fNotas'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('fFecha').value  = today();
    document.getElementById('fTipo').value   = 'revisita';
    document.getElementById('fEstado').value = 'pendiente';
    document.getElementById('fId').value     = '';
  }
  document.getElementById('formBg').classList.add('open');
  updateFabVisibility(); 
}

function closeForm() { document.getElementById('formBg').classList.remove('open'); updateFabVisibility(); }
function resetMap()  { clearGPS(); }
function editCard(id) { closeDet(); const c = cards.find(x => x.id === id); if(c) openForm(c); }

async function deleteCard(id) {
  await cancelCard(id);
  await apiDeletePersona(id);
  cards = cards.filter(x => x.id !== id);
  closeDet(); updateStats(); renderList();
  toast(t('eliminado'));
}

async function saveCard() {
  const nombre = document.getElementById('fNombre').value.trim();
  if (!nombre) { toast(t('nombre_req')); return; }
  const eid = document.getElementById('fId').value;
  const d = {
    nombre,
    direccion: document.getElementById('fDir').value.trim(),
    gps_lat:   document.getElementById('fLat').value || null,
    gps_lng:   document.getElementById('fLng').value || null,
    telefono:  document.getElementById('fTel').value.trim(),
    tipo:      document.getElementById('fTipo').value,
    estado:    document.getElementById('fEstado').value,
    notas:     document.getElementById('fNotas').value.trim(),
    proxima_visita:      document.getElementById('fFecha').value || null,
    proxima_visita_hora: document.getElementById('fHora').value || null,
  };

  // Mostrar loading
  const saveBtn = document.getElementById('saveBtn');
  const btnText = saveBtn ? saveBtn.textContent : '';
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="spinner-sm"></span> Guardando...'; }

  try {
    if (eid) {
      await apiUpdatePersona(eid, d);
    } else {
      await apiCreatePersona(d);
    }

    const personasData = await apiGetPersonas();
    if (Array.isArray(personasData)) {
      cards = personasData.map(p => ({
        id: p.id,
        nombre: p.nombre,
        dir: p.direccion,
        lat: p.gps_lat,
        lng: p.gps_lng,
        tel: p.telefono,
        tipo: p.tipo,
        estado: p.estado,
        notas: p.notas,
        fecha: p.proxima_visita ? p.proxima_visita.split('T')[0] : '',
        hora:  p.proxima_visita_hora ? p.proxima_visita_hora.substring(0,5) : '',
        historial: []
      }));
    }

    closeForm(); updateStats(); renderList();
    toast(eid ? t('guardado') : t('agregado'));
  } catch(e) {
    toast('Error al guardar. Intenta de nuevo.');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = btnText; }
  }
}
/* ================================================================
   PRECURSORADO
================================================================ */
function _precOption(label, meta, bg, color) {
  return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:' + bg + ';border-radius:10px">'
    + '<div style="width:36px;height:36px;border-radius:9px;background:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="' + color + '"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
    + '</div>'
    + '<div style="flex:1">'
      + '<div style="font-size:13px;font-weight:600;color:var(--navy)">' + label + '</div>'
      + '<div style="font-size:11px;color:var(--tx3)">' + meta + '</div>'
    + '</div>'
  + '</div>';
}


function buildPrec() {
  const esPrecursor = prec.tipo !== 'publicador';
  const meta = prec.tipo==='regular' ? prec.metaReg : prec.tipo==='especial' ? prec.metaEsp : prec.metaAux;
  const pct  = esPrecursor ? Math.min(100, Math.round(prec.horas / meta * 100)) : 0;
  const tipoLabel = {
    auxiliar:   t('auxiliar') + ' (Precursor)',
    regular:    t('regular')  + ' (Precursor)',
    especial:   t('especial') + ' (Precursor)',
    publicador: t('publicador') || 'Publicador',
  }[prec.tipo] || prec.tipo;

  const heroSection = esPrecursor
    ? '<div class="prec-big"><span id="precCounter">0</span><span class="prec-of"> / ' + meta + 'h</span></div>'
      + '<div class="prec-pct">' + pct + '% completado</div>'
      + '<div class="prog-track"><div class="prog-fill" style="width:' + pct + '%"></div></div>'
      + '<div class="prec-grid">'
        + '<button class="prec-btn" onclick="addH(0.5)">+ 30 min</button>'
        + '<button class="prec-btn" onclick="addH(1)">+ 1 hora</button>'
        + '<button class="prec-btn" onclick="addH(2)">+ 2 horas</button>'
        + '<button class="prec-btn-sub" onclick="subH()">− 1 hora</button>'
      + '</div>'
    : '<div style="padding:28px 20px">'
        + '<div style="font-size:16px;color:#4a4a4a;line-height:1.8;font-style:italic;font-family:Georgia,serif;margin-bottom:16px">'
          + 'El mejor día en el ministerio<br>podría ser hoy.'
        + '</div>'
        + '<div style="font-size:15px;font-weight:700;color:var(--navy);letter-spacing:.02em">'
          + 'Solo tienes que salir :D'
        + '</div>'
      + '</div>'
    + '</div>';
        

  document.getElementById('precBody').innerHTML =
    '<div class="prec-hero">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
        + '<div class="prec-month">' + mesNombre() + '</div>'
        + (prec.ultimoRegistro ? '<div style="font-size:10px;font-weight:500;color:var(--tx3);background:var(--bg);padding:3px 8px;border-radius:99px;border:1px solid var(--border)">' + fmtDateTime(prec.ultimoRegistro) + '</div>' : '')
      + '</div>'
      + '<div class="prec-type">' + tipoLabel + '</div>'
      + heroSection
    + '</div>'
    + '<div class="sec-lbl">' + t('prec_tipo') + '</div>'
    + '<div class="sc">'
      + tipoOpt('publicador', t('publicador')||'Publicador', t('publicador_sub')||'Sin registro de horas')
      + tipoOpt('auxiliar',   t('auxiliar'),  'Meta: ' + prec.metaAux + 'h / mes')
      + tipoOpt('regular',    t('regular'),   'Meta: ' + prec.metaReg + 'h / mes')
      + tipoOpt('especial',   t('especial'),  'Meta: ' + prec.metaEsp + 'h / mes')
    + '</div>'
    + (esPrecursor
      ? '<div class="sec-lbl">Meta personalizada</div>'
        + '<div class="sc">'
          + '<div class="sc-row">'
            + '<div><div class="sc-label">Meta ' + t(prec.tipo) + ' (h)</div><div class="sc-sub">Horas requeridas por mes</div></div>'
            + '<input type="number" min="1" max="300" value="' + meta + '" oninput="setMetaActual(this.value)" style="width:70px;padding:6px 8px;border:1.5px solid var(--border);border-radius:var(--r2);font-size:14px;font-family:var(--f-sans);text-align:center">'
          + '</div>'
        + '</div>'
        + '<button class="btn-outline" onclick="resetH()" style="margin-top:8px">Nuevo mes →</button>'
      : '')


    if (!window._precLoaded) {
      setTimeout(() => animateNumber('precCounter', 0, prec.horas), 100);
      window._precLoaded = true;
    } else {
      setTimeout(() => {
        const el = document.getElementById('precCounter');
        if (el) el.textContent = prec.horas;
      }, 50);
    }
  renderHistorialHoras();
}

async function renderHistorialHoras() {
  const contenedor = document.getElementById('historialHoras');
  if (!contenedor) return;
  try {
    const lista = await apiGetHoras();
    if (!Array.isArray(lista) || lista.length === 0) {
      contenedor.innerHTML = '<p style="color:var(--tx3);font-size:13px;text-align:center;padding:12px 0">Sin meses anteriores registrados.</p>';
      return;
    }
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const mesActual = new Date().getMonth() + 1;
    const anioActual = new Date().getFullYear();
    const anteriores = lista.filter(r => !(r.mes == mesActual && r.anio == anioActual));
    if (anteriores.length === 0) {
      contenedor.innerHTML = '<p style="color:var(--tx3);font-size:13px;text-align:center;padding:12px 0">Sin meses anteriores registrados.</p>';
      return;
    }
    contenedor.innerHTML = anteriores.map(r => {
      const meta = prec.tipo === 'regular' ? prec.metaReg : prec.tipo === 'especial' ? prec.metaEsp : prec.metaAux;
      const pct = meta > 0 ? Math.min(100, Math.round(r.horas / meta * 100)) : 0;
      return '<div class="sc" style="margin-bottom:10px">'
        + '<div class="sc-row">'
          + '<div>'
            + '<div class="sc-label">' + MESES[r.mes - 1] + ' ' + r.anio + '</div>'
            + '<div class="sc-sub">' + r.horas + 'h' + (meta > 0 ? ' / ' + meta + 'h (' + pct + '%)' : '') + '</div>'
          + '</div>'
          + '<div style="width:48px;height:48px;border-radius:50%;background:conic-gradient(var(--accent) ' + pct + '%, var(--surface2) 0);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
            + '<div style="width:34px;height:34px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--tx)">' + pct + '%</div>'
          + '</div>'
        + '</div>'
      + '</div>';
    }).join('');
  } catch(e) {
    contenedor.innerHTML = '';
  }
}

async function setMetaActual(v) {
  if (prec.tipo === 'auxiliar') prec.metaAux = parseInt(v) || 30;
  if (prec.tipo === 'regular')  prec.metaReg = parseInt(v) || 50;
  if (prec.tipo === 'especial') prec.metaEsp = parseInt(v) || 100;
  await apiUpdatePrec(prec.tipo, parseInt(v));
}

function tipoOpt(v, lbl, sub) {
  const sel = prec.tipo === v;
  return '<div class="sc-row" style="cursor:pointer" onclick="setTipo(\'' + v + '\')">'
    + '<div><div class="sc-label">' + lbl + '</div><div class="sc-sub">' + sub + '</div></div>'
    + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (sel ? 'var(--accent)' : 'var(--border-dk)') + ';background:' + (sel ? 'var(--accent)' : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + (sel ? '<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>' : '')
    + '</div>'
  + '</div>';
}

async function addH(n) {
  const result = await apiAddHoras(n);
  prec.horas = result.total;
  prec.ultimoRegistro = new Date().toISOString();
  buildPrec();
  requestAnimationFrame(() => {
    const el = document.getElementById('precCounter');
    if (el) {
      el.classList.remove('prec-pop');
      void el.offsetWidth;
      el.classList.add('prec-pop');
    }
  });
  toast('+' + n + 'h registrada');
}

async function subH() {
  const result = await apiAddHoras(-1);
  prec.horas = Math.max(0, result.total);
  prec.ultimoRegistro = new Date().toISOString();
  buildPrec();
}

async function setTipo(v) {
  prec.tipo = v;
  await apiUpdatePrec(v, prec.metaAux);
  buildPrec();
}

async function setMeta(k, v) {
  if (k==='aux') prec.metaAux = parseInt(v) || 30;
  if (k==='reg') prec.metaReg = parseInt(v) || 70;
  if (k==='esp') prec.metaEsp = parseInt(v) || 100;
  await savePrec();
}

async function resetH() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.innerHTML = `
    <div style="background:var(--surface);border-radius:20px;padding:28px 24px;width:100%;max-width:320px;text-align:center">
      <div style="width:52px;height:52px;background:var(--navy-light);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="var(--navy)"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
      </div>
      <div style="font-size:17px;font-weight:700;color:var(--tx);margin-bottom:8px">Nuevo mes</div>
      <div style="font-size:13px;color:var(--tx3);margin-bottom:6px;line-height:1.6">
        Las horas de <strong style="color:var(--tx)">${mesNombre()}</strong> se guardarán en tu historial de informes.
      </div>
      <div style="font-size:13px;color:var(--tx3);margin-bottom:24px;line-height:1.6">
        El contador volverá a <strong style="color:var(--tx)">0</strong> para el nuevo mes.
      </div>
      <button onclick="confirmarNuevoMes()" style="width:100%;padding:14px;background:var(--navy);color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:8px">Sí, iniciar nuevo mes</button>
      <button onclick="document.getElementById('nuevoMesModal').remove()" style="width:100%;padding:12px;background:transparent;color:var(--tx3);border:none;font-size:14px;cursor:pointer">Cancelar</button>
    </div>
  `;
  modal.id = 'nuevoMesModal';
  document.body.appendChild(modal);
}

async function confirmarNuevoMes() {
  await apiResetHoras();
  prec.horas = 0;
  document.getElementById('nuevoMesModal')?.remove();
  buildPrec();
  toast('Nuevo mes iniciado ✔');
}
/* ================================================================
   MI INFORME
================================================================ */
function buildInforme() {
  const mes          = mesKey();
  const esPrecursor  = prec.tipo === 'auxiliar' || prec.tipo === 'regular' || prec.tipo === 'especial';
  const meta         = prec.tipo==='regular' ? prec.metaReg : prec.tipo==='especial' ? prec.metaEsp : prec.metaAux;
  const pct          = Math.min(100, meta > 0 ? Math.round(prec.horas / meta * 100) : 0);
  const estudiosMes  = cards.filter(c => c.tipo==='estudio'  && c.fecha && c.fecha.startsWith(mes)).length;

  let html =
    '<div class="inf-header">'
      + '<div style="font-size:11px;font-weight:600;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Informe mensual</div>'
      + '<div style="font-family:var(--f-serif);font-size:28px;color:#fff;font-weight:500;letter-spacing:-.5px">' + mesNombre() + '</div>'
      + '<div style="margin-top:10px;height:1px;background:rgba(255,255,255,.12)"></div>'
      + '<div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.5)">Toca Enviar cuando estés listo</div>'
    + '</div>'

    // ── Participación — solo si NO es precursor ──
    + (!esPrecursor
      ? '<div class="cfg-card"><div class="cfg-row">'
          + '<div class="cfg-row-icon" style="background:#edf7ef"><svg viewBox="0 0 24 24" width="18" height="18" fill="#1e7e34"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></div>'
          + '<div class="cfg-row-info"><div class="cfg-row-label">' + t('participe') + '</div></div>'
          + '<div class="tog' + (informe.participo?' on':'') + '" onclick="toggleParticipo(this)"></div>'
        + '</div></div>'
      : '')

    // ── Estudios Bíblicos (contador manual) ──
    + '<div class="cfg-card"><div class="cfg-row">'
      + '<div class="cfg-row-icon" style="background:#fff8ee"><svg viewBox="0 0 24 24" width="18" height="18" fill="#a0660a"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg></div>'
      + '<div class="cfg-row-info"><div class="cfg-row-label">' + (t('estudios_lbl')||t('cursos')) + '</div><div class="cfg-row-sub">' + t('este_mes') + '</div></div>'
      + '<div class="inf-counter">'
        + '<button class="inf-btn" onclick="adjCursos(-1)">−</button>'
        + '<span class="inf-num" id="infCursos">' + informe.cursos + '</span>'
        + '<button class="inf-btn" onclick="adjCursos(1)">+</button>'
      + '</div>'
    + '</div></div>';

  // ── Horas: SOLO si es precursor ──
  if (esPrecursor) {
    html +=
      '<div class="cfg-card">'
        + '<div class="cfg-row">'
          + '<div class="cfg-row-icon" style="background:#f3e5f5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#7b1fa2"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg></div>'
          + '<div class="cfg-row-info"><div class="cfg-row-label">' + t('horas_lbl') + ' — ' + t(prec.tipo) + '</div><div class="cfg-row-sub">' + t('horas_sub') + '</div></div>'
          + '<span style="font-size:28px;font-weight:700;color:var(--navy);font-family:var(--f-serif)">' + prec.horas + '</span>'
        + '</div>'
        + '<div style="padding:0 14px 14px">'
          + '<div style="height:8px;background:var(--navy-light);border-radius:99px;overflow:hidden">'
            + '<div style="height:100%;width:' + pct + '%;background:var(--navy);border-radius:99px;transition:width .5s ease"></div>'
          + '</div>'
          + '<div style="font-size:11px;color:var(--tx3);margin-top:5px;display:flex;justify-content:space-between"><span>' + prec.horas + 'h / ' + meta + 'h</span><span>' + pct + '%</span></div>'
        + '</div>'
      + '</div>';
  }

  html += '<button class="btn-save" style="margin-top:8px" onclick="enviarInforme()"> ' + t('enviar_informe') + '</button>';
  document.getElementById('informeBody').innerHTML = html;
}

async function toggleParticipo(el) { informe.participo = !informe.participo; el.classList.toggle('on'); await saveInforme(); }
async function adjCursos(delta) {
  informe.cursos = Math.max(0, informe.cursos + delta);
  await saveInforme();
  const el = document.getElementById('infCursos'); if(el) el.textContent = informe.cursos;
}

async function enviarInforme() {
  const mes = mesNombre();
  const esPrecursor = prec.tipo==='auxiliar' || prec.tipo==='regular' || prec.tipo==='especial';
  const linea = '--------------------------------------------------';
  let txt = 'INFORME MENSUAL · ' + mes + '\n';
  txt += linea + '\n';
  if (esPrecursor) {
    txt += 'Precursor · ' + t(prec.tipo) + '\n';
    txt += 'Horas registradas: ' + prec.horas + 'h\n';
  } else {
    txt += 'Participación: ' + (informe.participo ? 'Sí' : 'No') + '\n';
  }
  txt += 'Cursos Bíblicos: ' + informe.cursos;

  if (Cap.Share) { try { await Cap.Share.share({ text: txt }); } catch(e){} }
  else if (navigator.share) { try { await navigator.share({ title:'Mi Informe - AssendApp', text:txt }); } catch(e){} }
  else { try { await navigator.clipboard.writeText(txt); toast(t('informe_copiado')); } catch(e) { alert(txt); } }

  const mesInforme = new Date().getMonth() + 1;
  const añoInforme = new Date().getFullYear();
  const informeData = await apiSaveInforme({
    mes: mesInforme, año: añoInforme,
    cursos_biblicos: informe.cursos,
    horas: esPrecursor ? prec.horas : 0,
    revisitas: cards.filter(c => c.tipo === 'revisita').length
  });
  if (informeData.id) await apiEnviarInforme(informeData.id);
  await archivarInforme();
  const entry = informeHist.find(i => i.mes === mesKey());
  if (entry) { entry.enviado = true; await saveInformeHist(); }
}

async function reenviarInforme(mes) {
  const inf = informeHist.find(i => i.mes === mes);
  if (!inf) return;
  const esPrecursor = inf.tipo === 'auxiliar' || inf.tipo === 'regular' || inf.tipo === 'especial';
  const linea = '--------------------------------------------------';
  let txt = 'INFORME MENSUAL · ' + inf.mesNombre + '\n';
  txt += linea + '\n';
  if (esPrecursor) {
    txt += 'Precursor · ' + inf.tipo.charAt(0).toUpperCase() + inf.tipo.slice(1) + '\n';
    txt += 'Horas registradas: ' + inf.horas + 'h\n';
  } else {
    txt += 'Participación: ' + (inf.participo ? 'Sí' : 'No') + '\n';
  }
  txt += 'Cursos Bíblicos: ' + inf.cursos;

  if (Cap.Share) { try { await Cap.Share.share({ text: txt }); return; } catch(e){} }
  if (navigator.share) { try { await navigator.share({ title:'Mi Informe', text:txt }); return; } catch(e){} }
  try { await navigator.clipboard.writeText(txt); toast('Informe copiado ✔'); } catch(e) { alert(txt); }

  inf.enviado = true;
  await saveInformeHist();
  renderHTab('informes');
}

async function borrarInformeHist(mes) {
  informeHist = informeHist.filter(i => i.mes !== mes);
  await saveInformeHist();
  renderHTab('informes');
  toast('Informe eliminado');
}

function editarInformeHist(mes) {
  const inf = informeHist.find(i => i.mes === mes);
  if (!inf) return;
  document.getElementById('det-title').textContent = 'Editar informe';
  document.getElementById('detBody').innerHTML =
    '<div style="font-size:13px;font-weight:600;color:var(--navy);margin-bottom:16px">' + inf.mesNombre + '</div>'
    + '<div class="fgroup"><label>Cursos Bíblicos</label>'
      + '<input type="number" id="editCursos" min="0" value="' + inf.cursos + '" style="width:80px"/>'
    + '</div>'
    + (inf.horas !== null
      ? '<div class="fgroup"><label>Horas</label>'
          + '<input type="number" id="editHoras" min="0" step="0.5" value="' + inf.horas + '" style="width:80px"/>'
        + '</div>'
      : '')
    + '<button class="btn-save" onclick="guardarEdicionInforme(\'' + mes + '\')">Guardar</button>'
    + '<button class="btn-cancel" onclick="closeDet()">Cancelar</button>';
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

async function guardarEdicionInforme(mes) {
  const inf = informeHist.find(i => i.mes === mes);
  if (!inf) return;
  inf.cursos = parseInt(document.getElementById('editCursos')?.value) || 0;
  const editHoras = document.getElementById('editHoras');
  if (editHoras) inf.horas = parseFloat(editHoras.value) || 0;
  await saveInformeHist();
  closeDet();
  renderHTab('informes');
  toast('Informe actualizado ✔');
}
/* ================================================================
   HISTORIAL
================================================================ */
function buildHistory() {
  document.getElementById('histBody').innerHTML =
    '<div style="display:flex;background:var(--surface);border-bottom:1px solid var(--border);padding:0 4px">'
    + '<button id="htab-visitados" onclick="setHTab(\'visitados\')" style="flex:1;padding:14px 8px;border:none;background:transparent;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--tx3);border-bottom:2.5px solid transparent;cursor:pointer;transition:color .15s,border-color .15s">Visitados</button>'
    + '<button id="htab-asignaciones" onclick="setHTab(\'asignaciones\')" style="flex:1;padding:14px 8px;border:none;background:transparent;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--tx3);border-bottom:2.5px solid transparent;cursor:pointer;transition:color .15s,border-color .15s">Asignaciones</button>'
    + '<button id="htab-informes" onclick="setHTab(\'informes\')" style="flex:1;padding:14px 8px;border:none;background:transparent;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--tx3);border-bottom:2.5px solid transparent;cursor:pointer;transition:color .15s,border-color .15s">Informes</button>'
    + '</div>'
    + '<div id="htab-content" style="padding:16px 14px"></div>';
  setHTab('visitados');
}

function setHTab(v) {
  _htab = v;
  document.querySelectorAll('#histBody button').forEach(el => {
    el.style.color = 'var(--tx3)';
    el.style.borderBottomColor = 'transparent';
  });
  const active = document.getElementById('htab-' + v);
  if (active) {
    active.style.color = 'var(--navy)';
    active.style.borderBottomColor = 'var(--navy)';
  }
  renderHTab(v);
}

function renderHTab(v) {
  const el = document.getElementById('htab-content');
  if (!el) return;

  if (v === 'visitados') {
    const todas = cards.filter(c => c.historial && c.historial.length)
      .flatMap(c => c.historial.map(h => ({ nombre:c.nombre, ...h })))
      .sort((a,b) => b.fecha.localeCompare(a.fecha));
    el.innerHTML = todas.length
      ? todas.map(h =>
          '<div class="card">'
            + '<div class="card-row1">'
              + '<div class="ava">' + initials(h.nombre) + '</div>'
              + '<div class="card-info">'
                + '<div class="card-name">' + h.nombre + '</div>'
                + '<div class="card-addr">' + fmtDate(h.fecha, h.hora) + '</div>'
              + '</div>'
              + '<button onclick="borrarVisita(\'' + h.nombre + '\',\'' + h.fecha + '\')" style="'
                + 'background:none;border:none;cursor:pointer;color:#9b2335;padding:8px;flex-shrink:0">'
                + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
              + '</button>'
            + '</div>'
            + (h.nota ? '<div class="card-row2"><span class="card-pub">' + h.nota + '</span></div>' : '')
          + '</div>'
        ).join('')
      : '<p style="color:var(--tx3);font-size:14px;padding:20px 0;line-height:1.7">' + t('historial_vacio') + '</p>';

  } else if (v === 'asignaciones') {
    const completadas = asignaciones.filter(a => a.completada)
      .sort((a,b) => b.fecha.localeCompare(a.fecha));
    if (!completadas.length) {
      el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;padding:48px 24px;gap:12px">'
        + '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity:.2"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>'
        + '<div style="font-size:15px;font-weight:500;color:var(--tx2)">Sin partes completadas</div>'
        + '<div style="font-size:13px;color:var(--tx3);text-align:center;line-height:1.6">Cuando completes una asignación aparecerá aquí</div>'
      + '</div>'

      return;
    }
    el.innerHTML = completadas.map(a => {
      const c        = TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' };
      const tieneRef = a.reflexion && (a.reflexion.estudio || a.reflexion.mejora || a.reflexion.predicacion);
      return '<div class="card" onclick="openAsigDet(' + a.id + ')">'
        + '<div class="card-row1">'
          + '<div class="ava" style="background:' + c.bg + ';color:' + c.color + ';display:flex;align-items:center;justify-content:center">' + TIPOS_SVG[a.tipo] + '</div>'
          + '<div class="card-info">'
            + '<div class="card-name">' + TIPOS_PARTE[a.tipo] + '</div>'
            + '<div class="card-addr"> ' + fmtDate(a.fecha) + (a.nota ? ' · ' + a.nota : '') + '</div>'
          + '</div>'
          + '<span class="badge b-reg">✔</span>'
        + '</div>'
        + (tieneRef
          ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
              + (a.reflexion.estudio ? '<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Estudio personal</div><div style="font-size:13px;color:var(--navy);margin-top:2px">' + a.reflexion.estudio + '</div></div>' : '')
              + (a.reflexion.mejora ? '<div style="margin-bottom:6px"><div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Aspecto a mejorar</div><div style="font-size:13px;color:var(--navy);margin-top:2px">' + a.reflexion.mejora + '</div></div>' : '')
              + (a.reflexion.predicacion ? '<div><div style="font-size:10px;font-weight:600;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em">Tips para la predicación</div><div style="font-size:13px;color:var(--navy);margin-top:2px">' + a.reflexion.predicacion + '</div></div>' : '')
            + '</div>'
          : '<div style="margin-top:8px;font-size:12px;color:var(--tx3)">Sin reflexión guardada</div>')
      + '</div>';
    }).join('');

  } else if (v === 'informes') {
    if (!informeHist.length) {
      el.innerHTML = '<p style="color:var(--tx3);font-size:14px;padding:20px 0">Aún no hay informes guardados.</p>';
      return;
    }
    el.innerHTML = informeHist
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .map(inf => {
        const esPrecursor = inf.tipo === 'auxiliar' || inf.tipo === 'regular' || inf.tipo === 'especial';
        return '<div class="card">'
          + '<div class="card-row1">'
            + '<div class="ava" style="background:#eef3fa;color:#2e6be6;display:flex;align-items:center;justify-content:center">'
              + '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>'
            + '</div>'
            + '<div class="card-info">'
              + '<div class="card-name">' + inf.mesNombre + '</div>'
              + '<div class="card-addr">' + (inf.enviado ? 'Enviado' : 'No enviado') + '</div>'
            + '</div>'
            + '<span class="badge ' + (inf.enviado ? 'b-reg' : 'b-pend') + '">' + (inf.enviado ? 'Enviado' : 'Pendiente') + '</span>'
          + '</div>'
          + '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;gap:16px;flex-wrap:wrap">'
            + (!esPrecursor ? '<div style="font-size:12px;color:var(--tx3)">Participé: <span style="color:var(--navy);font-weight:600">' + (inf.participo ? 'Sí' : 'No') + '</span></div>' : '')
            + '<div style="font-size:12px;color:var(--tx3)">Estudios: <span style="color:var(--navy);font-weight:600">' + inf.cursos + '</span></div>'
            + (esPrecursor ? '<div style="font-size:12px;color:var(--tx3)">Horas: <span style="color:var(--navy);font-weight:600">' + inf.horas + 'h</span></div>' : '')
          + '</div>'
          + '<div style="display:flex;gap:8px;margin-top:14px">'
            + '<button onclick="editarInformeHist(\'' + inf.mes + '\')" style="flex:1;padding:10px 0;border-radius:10px;border:1.5px solid var(--navy);background:var(--navy);color:#fff;font-size:13px;font-weight:600;cursor:pointer">Editar</button>'
            + '<button onclick="reenviarInforme(\'' + inf.mes + '\')" style="flex:1;padding:10px 0;border-radius:10px;border:1.5px solid var(--border);background:#fff;color:var(--navy);font-size:13px;font-weight:600;cursor:pointer">Reenviar</button>'
            + '<button onclick="borrarInformeHist(\'' + inf.mes + '\')" style="flex:1;padding:10px 0;border-radius:10px;border:1.5px solid #fce4e8;background:#fce4e8;color:#9b2335;font-size:13px;font-weight:600;cursor:pointer">Borrar</button>'
          + '</div>'
        + '</div>';
      }).join('');
  }
}
/* ================================================================
   AJUSTES
================================================================ */
function horasToTime(h) { return String(Math.min(23, Math.max(0, h||0))).padStart(2,'0') + ':00'; }
function timeToHoras(v) { if (!v) return 0; return parseInt(v.split(':')[0]) || 0; }

async function onNotifTimeChange(val) {
  const h = timeToHoras(val);
  cfg.horasAntes = h;
  await saveCfg(); await schedAll();
  const desc = document.getElementById('notifDesc');
  if (desc) desc.textContent = h===0 ? 'Desactivado' : h===1 ? '1 hora antes de la visita' : h + ' horas antes de la visita';
  toast('Guardado ✔');
}
async function borrarVisita(nombre, fecha) {
  const c = cards.find(x => x.nombre === nombre);
  if (!c) return;
  c.historial = c.historial.filter(h => h.fecha !== fecha);
  await saveCards();
  renderHTab('visitados');
  toast('Visita eliminada');
}


function buildSettings() {
  const fab = document.getElementById('fabBtn');
  if (fab) fab.style.display = 'none';
  const c = cfg;
  const saved = localStorage.getItem('mm_color') || '#1a2b40';
  const user = getUser();

  document.getElementById('settingsBody').innerHTML =

    /* ── PERFIL ── */
    '<div class="cfg-section-title">Perfil</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="editarPerfil()">'
        + (user && user.picture
            ? '<img src="' + user.picture + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">'
            : '<div style="width:40px;height:40px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:700;color:#fff;font-size:16px">' + (user ? user.nombre.charAt(0).toUpperCase() : '?') + '</div>')
        + '<div class="cfg-row-info"><div class="cfg-row-label">' + (user ? user.nombre : 'Usuario') + '</div><div class="cfg-row-sub">' + (user ? user.email : '') + (user && user.congregacion ? ' · ' + user.congregacion : '') + '</div></div>'
        + '<svg class="cfg-chev" viewBox="0 0 24 24" width="18" height="18"><path d="M9 18l6-6-6-6v12z"/></svg>'
      + '</div>'
    + '</div>'

    /* ── NOTIFICACIONES ── */
    + '<div class="cfg-section-title">Notificaciones</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="abrirAjustesNotificaciones()">'
        + '<div class="cfg-row-icon" style="background:#eef3fa"><svg viewBox="0 0 24 24" width="18" height="18" fill="#2e6be6"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Notificaciones</div><div class="cfg-row-sub">' + ("Notification" in window && Notification.permission === "granted" ? "Activadas" : "Toca para configurar") + '</div></div>'
        + '<svg class="cfg-chev" viewBox="0 0 24 24" width="18" height="18"><path d="M9 18l6-6-6-6v12z"/></svg>'
      + '</div>'
    + '</div>'

    /* ── PERSONALIZACIÓN ── */
    + '<div class="cfg-section-title">Personalización</div>'
    + '<div class="cfg-card" id="colorCard">'
      + '<div class="cfg-row cfg-row-tap" onclick="togglePalette()"><div id="colorSwatch" style="width:36px;height:36px;border-radius:9px;flex-shrink:0;border:2px solid rgba(0,0,0,.1);background:' + saved + '"></div><div class="cfg-row-info"><div class="cfg-row-label">Color del tema</div><div class="cfg-row-sub" id="colorName">' + getColorName(saved) + '</div></div><svg id="colorChev" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color:var(--tx3);transition:transform .25s;flex-shrink:0"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg></div>'
      + '<div class="pal-drawer" id="palDrawer">'
        + buildPaletteHTML()
        + '<div class="pal-custom"><div class="pal-group-lbl">Elegir color exacto</div>'
          + '<button class="pal-custom-btn" onclick="openColorPicker()" style="width:100%;text-align:left;border:none;cursor:pointer"><span id="customSwatch" style="width:30px;height:30px;border-radius:50%;background:' + saved + ';border:3px solid rgba(0,0,0,.15);flex-shrink:0;display:inline-block;vertical-align:middle"></span><span style="flex:1;font-size:13px;color:var(--tx2);margin-left:12px">Elegir color exacto</span></button>'
        + '</div>'
      + '</div>'
    + '</div>'

    + '<div class="cfg-card">'
      + '<div class="cfg-row">'
        + '<div class="cfg-row-icon" style="background:#1c2333"><svg viewBox="0 0 24 24" width="18" height="18" fill="#4a9eff"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Modo oscuro</div><div class="cfg-row-sub">Cambia la apariencia</div></div>'
        + '<div class="dark-toggle-track" onclick="toggleDarkMode()" id="darkBtn" style="cursor:pointer">'
          + '<div class="dark-toggle-thumb" id="darkThumb"></div>'
        + '</div>'
      + '</div>'
    + '</div>'

    /* ── SCROLL ── */
    + '<div class="cfg-section-title">Transicion de cards</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="toggleScrollOptions()">'
        + '<div class="cfg-row-icon" style="background:#f3e5f5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#7b1fa2"><path d="M4 18h16v-2H4v2zm0-5h16v-2H4v2zm0-7v2h16V6H4z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Animacion de scroll</div><div class="cfg-row-sub">' + ({normal:"Normal",apilado:"Apilado"}[cfg.scrollMode] || "Normal") + '</div></div>'
        + '<svg id="scrollChev" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color:var(--tx3);transition:transform .25s;flex-shrink:0"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
      + '</div>'
      + '<div id="scrollOptionsDrawer" style="max-height:0;overflow:hidden;transition:max-height .3s ease">'
        + scrollModeOption("normal", "Normal", "Scroll clasico, cada card en su lugar")
        + scrollModeOption("apilado", "Apilado", "Los cards se apilan uno encima de otro al scrollear")

      + '</div>'
    + '</div>'

    /* ── SOPORTE ── */
    + '<div class="cfg-section-title">Soporte</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="reportarProblema()">'
        + '<div class="cfg-row-icon" style="background:#fff8ee"><svg viewBox="0 0 24 24" width="18" height="18" fill="#a0660a"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Reportar un problema</div><div class="cfg-row-sub">Avísame si algo no funciona</div></div>'
        + '<svg class="cfg-chev" viewBox="0 0 24 24" width="18" height="18"><path d="M9 18l6-6-6-6v12z"/></svg>'
      + '</div>'
    + '</div>'

    /* ── CUENTA ── */
    + '<div class="cfg-section-title">Cuenta</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="showLogoutConfirm()">'
        + '<div class="cfg-row-icon" style="background:#fef0f2"><svg viewBox="0 0 24 24" width="18" height="18" fill="#9b2335"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label" style="color:#9b2335">Cerrar sesión</div></div>'
      + '</div>'
    + '</div>'

       /* ── APOYA EL PROYECTO ── */
    + '<div style="text-align:center;padding:16px 0 8px;cursor:pointer" onclick="abrirDonaciones()">'
      + '<span style="font-size:12px;color:var(--tx3);text-decoration:underline">Apoya este proyecto</span>'
    + '</div>'


}

function abrirDonaciones() {
  document.getElementById('det-title').textContent = 'Apoya el proyecto';
  document.getElementById('detBody').innerHTML =
    '<div class="donacion-panel">'
      + '<div class="donacion-subtitulo">Cada aporte ayuda a mantener el servidor y el dominio activos</div>'
      + '<p class="donacion-texto">Nos alegra mucho saber que <strong>AssendApp</strong> te está siendo de utilidad — esa es la razón por la que seguimos mejorando y manteniendo. Para que todo funcione bien invertimos tiempo y ganas de hacer las cosas cada vez mejor, y mantenerla activa también tiene un <strong>costo cada mes</strong> (el servidor, el guardado seguro de la información y el dominio de internet), que nosotros cubrimos para que tú la uses sin costo alguno. Si en algún momento quieres colaborar, <strong>toda donación será bienvenida</strong>. Aun así, esto es completamente voluntario: no es un requisito para seguir usando la aplicación con normalidad. Gracias por confiar en nosotros y darle uso a esta herramienta.</p>'
      + '<div class="donacion-card" onclick="toggleDonacionQR()">'
        + '<div class="donacion-card-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="#a0660a"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg></div>'
        + '<div class="donacion-card-info"><div class="donacion-card-label">Yape / Plin</div><div class="donacion-card-sub"><strong id="yapeNumero">929742215</strong> · toca para ver el código</div></div>'
        + '<svg class="donacion-card-chev" id="donacionChev" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
      + '</div>'
      + '<div class="donacion-qr-wrap" id="donacionQrWrap">'
        + '<div class="donacion-qr-label">Escanéalo desde tu app de Yape o Plin</div>'
        + '<img class="donacion-qr-img" src="img/qr.png" alt="QR Yape/Plin"/>'
        + '<div style="font-size:12px;color:var(--navy);margin-top:12px;cursor:pointer;font-weight:600" onclick="event.stopPropagation();copiarYape()">Copiar número: 929742215</div>'
      + '</div>'
      + '<div class="donacion-footer-note"><strong>Gracias por usar AssendApp</strong></div>'
    + '</div>';
  document.getElementById('detBg').classList.add('open');
}

function toggleDonacionQR() {
  const wrap = document.getElementById('donacionQrWrap');
  const chev = document.getElementById('donacionChev');
  wrap.classList.toggle('open');
  chev.classList.toggle('open');
}
function copiarYape() {
  const numero = document.getElementById('yapeNumero').textContent;
  navigator.clipboard.writeText(numero).then(() => toast('Número copiado'));
}

function scrollModeOption(mode, label, desc) {
  const sel = cfg.scrollMode === mode;
  return '<div class="cfg-divider"></div>'
    + '<div class="cfg-row cfg-row-tap" onclick="setScrollMode(\'' + mode + '\')" style="cursor:pointer;padding:12px 16px">'
      + '<div style="flex:1">'
        + '<div style="font-size:14px;font-weight:600;color:var(--tx)">' + label + '</div>'
        + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">' + desc + '</div>'
      + '</div>'
      + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (sel ? 'var(--accent)' : 'var(--border-dk)') + ';background:' + (sel ? 'var(--accent)' : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + (sel ? '<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>' : '')
      + '</div>'
    + '</div>';
}

function toggleScrollOptions() {
  const drawer = document.getElementById("scrollOptionsDrawer");
  const chev = document.getElementById("scrollChev");
  if (!drawer) return;
  const open = drawer.style.maxHeight === "0px" || !drawer.style.maxHeight;
  drawer.style.maxHeight = open ? "400px" : "0px";
  if (chev) chev.style.transform = open ? "rotate(180deg)" : "";
}

function editarPerfil() {
  const user = getUser();
  document.getElementById('det-title').textContent = 'Mi perfil';
  document.getElementById('detBody').innerHTML =
    '<div style="text-align:center;padding:8px 0 20px">'
      + (user && user.picture
        ? '<img src="' + user.picture + '" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--navy)">'
        : '<div style="width:64px;height:64px;border-radius:50%;background:var(--navy);display:flex;align-items:center;justify-content:center;margin:0 auto;font-weight:700;color:#fff;font-size:24px">' + (user ? user.nombre.charAt(0).toUpperCase() : '?') + '</div>')
      + '<div style="font-size:16px;font-weight:700;color:var(--tx);margin-top:12px">' + (user ? user.nombre : '') + '</div>'
      + '<div style="font-size:13px;color:var(--tx3);margin-top:4px">' + (user ? user.email : '') + '</div>'
    + '</div>'
    + '<div class="fgroup"><label>Congregacion</label>'
      + '<input id="perfilCongregacion" type="text" placeholder="" style="text-transform:uppercase"  value="' + (user && user.congregacion ? user.congregacion : '') + '"/>'
    + '</div>'
    + '<button class="btn-save" onclick="guardarPerfil()">Guardar</button>'
    + '<button class="btn-cancel" onclick="closeDet()">Cerrar</button>';
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

async function guardarPerfil() {
  const congregacion = document.getElementById('perfilCongregacion').value.trim();
  try {
    const token = getToken();
    await fetch(API_URL + '/auth/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ congregacion })
    });
    const user = getUser();
    if (user) {
      user.congregacion = congregacion;
      saveSession(token, user);
    }
    closeDet();
    buildSettings();
    toast('Perfil actualizado');
  } catch(e) {
    toast('Error al guardar');
  }
}

function abrirAjustesNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(p => {
      if (p === "granted") { toast("Notificaciones activadas"); buildSettings(); }
      else { toast("Permiso denegado. Activalas desde ajustes del navegador."); }
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    toast("Las notificaciones ya estan activadas");
  } else {
    toast("Activa las notificaciones desde los ajustes de tu navegador");
  }
}

async function setScrollMode(mode) {
  cfg.scrollMode = mode;
  await kSet('st_cfg', cfg);
  buildSettings();
  if (currentView === 'home') { renderList(); }
  const labels = {normal:'Scroll normal',apilado:'Cards apilados',cascada:'Efecto cascada',zoom:'Efecto zoom',fade:'Efecto desvanecimiento'};
  toast(labels[mode] || 'Listo');
}

async function toggleNotif(el)  { cfg.activo=!cfg.activo; el.classList.toggle('on'); await saveCfg(); await schedAll(); toast(cfg.activo?t('notif_on'):'Notificaciones desactivadas'); }
async function toggleVibrar(el) { cfg.vibrar=!cfg.vibrar; el.classList.toggle('on'); await saveCfg(); toast(cfg.vibrar?'Vibración activada':'Vibración desactivada'); }
async function toggleSonido(el) { cfg.sonido=!cfg.sonido; el.classList.toggle('on'); await saveCfg(); toast(cfg.sonido?'Sonido activado':'Sonido desactivado'); }
async function setOrden(v) { cfg.orden=v; await saveCfg(); renderList(); buildSettings(); }
async function setLang(v) { cfg.idioma=v; await saveCfg(); applyLang(); buildSettings(); toast((LANG_META[v]||LANG_META.es).flag+' '+(LANG_META[v]||LANG_META.es).name); }

function buildLangPicker() {
  return Object.entries(LANG_META).map(([code, meta]) => {
    const sel = cfg.idioma === code;
    return '<div class="cfg-row cfg-row-tap" onclick="setLang(\'' + code + '\')" style="gap:14px">'
      + '<div style="font-size:26px;width:38px;text-align:center">' + meta.flag + '</div>'
      + '<div class="cfg-row-info"><div class="cfg-row-label">' + meta.name + '</div></div>'
      + (sel ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--navy)"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '')
    + '</div>';
  }).join('<div class="cfg-divider"></div>');
}

async function borrarTodo() {
  let ok = false;
  if (Cap.Dialog) {
    try { const {value}=await Cap.Dialog.confirm({title:'Borrar todo',message:'¿Eliminar todos los contactos? Esta acción no se puede deshacer.',okButtonTitle:'Borrar',cancelButtonTitle:t('cancelar')}); ok=value; } catch(e){ ok=confirm(t('borrar_confirm')); }
  } else { ok = confirm(t('borrar_confirm')); }
  if (!ok) return;
  if (Cap.Notif) { try { const {notifications:p}=await Cap.Notif.getPending(); if(p.length) await Cap.Notif.cancel({notifications:p}); } catch(e){} }
  cards=[]; await saveCards(); updateStats(); renderList(); buildSettings();
  toast(t('eliminado'));
}

['formBg','detBg'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) { if(e.target===this) this.classList.remove('open'); });
});

/* ================================================================
   PALETA DE COLORES
================================================================ */
const PALETTE = [
  {color:'#1a2b40',name:'Azul noche',group:'Azules'},{color:'#1a3556',name:'Azul marino',group:'Azules'},{color:'#0d3349',name:'Petróleo',group:'Azules'},{color:'#1565c0',name:'Azul cobalto',group:'Azules'},{color:'#0277bd',name:'Azul cielo',group:'Azules'},{color:'#006064',name:'Cian oscuro',group:'Azules'},
  {color:'#1a3a2a',name:'Verde bosque',group:'Verdes'},{color:'#1b5e20',name:'Verde oscuro',group:'Verdes'},{color:'#2e7d32',name:'Verde',group:'Verdes'},{color:'#33691e',name:'Verde oliva',group:'Verdes'},{color:'#004d40',name:'Verde selva',group:'Verdes'},{color:'#37474f',name:'Pizarra',group:'Verdes'},
  {color:'#2d1a40',name:'Púrpura',group:'Morados'},{color:'#4a148c',name:'Morado',group:'Morados'},{color:'#6a1b9a',name:'Violeta',group:'Morados'},{color:'#880e4f',name:'Rosa oscuro',group:'Morados'},{color:'#ad1457',name:'Frambuesa',group:'Morados'},{color:'#c62828',name:'Rojo',group:'Morados'},
  {color:'#40221a',name:'Café oscuro',group:'Tierra'},{color:'#4e342e',name:'Marrón',group:'Tierra'},{color:'#5d4037',name:'Café',group:'Tierra'},{color:'#e65100',name:'Naranja',group:'Tierra'},{color:'#bf360c',name:'Teja',group:'Tierra'},{color:'#f57f17',name:'Ámbar',group:'Tierra'},
  {color:'#212121',name:'Negro suave',group:'Neutros'},{color:'#333333',name:'Antracita',group:'Neutros'},{color:'#455a64',name:'Azul grisáceo',group:'Neutros'},{color:'#546e7a',name:'Gris azul',group:'Neutros'},{color:'#616161',name:'Gris oscuro',group:'Neutros'},{color:'#78909c',name:'Gris claro',group:'Neutros'},
];

function togglePalette() {
  const drawer=document.getElementById('palDrawer'), chev=document.getElementById('colorChev');
  if (!drawer) return;
  const open=drawer.classList.toggle('open');
  if (chev) chev.style.transform=open?'rotate(180deg)':'';
}
function buildPaletteHTML() {
  const saved=localStorage.getItem('mm_color')||'#1a2b40';
  const groups=[...new Set(PALETTE.map(p=>p.group))];
  return groups.map(g=>{
    const dots=PALETTE.filter(p=>p.group===g).map(p=>{
      const sel=p.color.toLowerCase()===saved.toLowerCase()?' active':'';
      return '<button class="cdot'+sel+'" style="background:'+p.color+'" title="'+p.name+'" data-c="'+p.color+'" data-n="'+p.name+'" onclick="pickColor(this)"></button>';
    }).join('');
    return '<div class="pal-group"><div class="pal-group-lbl">'+g+'</div><div class="pal-dots">'+dots+'</div></div>';
  }).join('');
}
function getColorName(color) { const c=color.toLowerCase(); const f=PALETTE.find(p=>p.color.toLowerCase()===c); return f?f.name:'Personalizado'; }
function pickColor(btn) { applyThemeColor(btn.dataset.c); saveThemeColor(btn.dataset.c, btn.dataset.n); }
function applyThemeColor(color) {
  document.documentElement.style.setProperty('--navy', color);
  document.documentElement.style.setProperty('--navy-mid', color);
  const sw=document.getElementById('colorSwatch'); if(sw) sw.style.background=color;
  const cs=document.getElementById('customSwatch'); if(cs) cs.style.background=color;
  const cp=document.getElementById('colorPicker'); if(cp) cp.value=color;
}
function saveThemeColor(color, name) {
  localStorage.setItem('mm_color', color);
  const nm=document.getElementById('colorName'); if(nm) nm.textContent=name||getColorName(color);
  const sw=document.getElementById('colorSwatch'); if(sw) sw.style.background=color;
  document.querySelectorAll('.cdot').forEach(el=>el.classList.toggle('active',el.dataset.c.toLowerCase()===color.toLowerCase()));
}
function loadThemeColor() { const saved=localStorage.getItem('mm_color'); if(saved) applyThemeColor(saved); }


/* ================================================================
   COLOR PICKER PERSONALIZADO (reemplazo del <input type="color"> nativo)
================================================================ */
let _cpCanvas = null, _cpCtx = null, _cpHue = 220, _cpSat = 60, _cpVal = 40;

function hsvToHex(h, s, v) {
  s /= 100; v /= 100;
  const k = n => (n + h / 60) % 6;
  const f = n => v - v * s * Math.max(0, Math.min(k(n), 4 - k(n), 1));
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return '#' + toHex(f(5)) + toHex(f(3)) + toHex(f(1));
}
function hexToHsv(hex) {
  hex = hex.replace('#','');
  const r = parseInt(hex.substr(0,2),16)/255, g = parseInt(hex.substr(2,2),16)/255, b = parseInt(hex.substr(4,2),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g-b)/d) % 6);
    else if (max === g) h = 60 * ((b-r)/d + 2);
    else h = 60 * ((r-g)/d + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : (d/max)*100;
  const v = max*100;
  return { h, s, v };
}

function openColorPicker() {
  const saved = localStorage.getItem('mm_color') || '#1a2b40';
  const hsv = hexToHsv(saved);
  _cpHue = hsv.h; _cpSat = hsv.s; _cpVal = hsv.v;

  const overlay = document.createElement('div');
  overlay.id = 'colorPickerOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML =
    '<div style="background:var(--surface);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)">'
      + '<div style="width:36px;height:4px;background:var(--border-dk);border-radius:99px;margin:0 auto 18px"></div>'
      + '<div style="font-size:16px;font-weight:700;color:var(--tx);margin-bottom:16px">Elegir color exacto</div>'
      + '<canvas id="cpSquare" width="280" height="180" style="width:100%;height:160px;border-radius:12px;cursor:pointer;touch-action:none"></canvas>'
      + '<canvas id="cpHueBar" width="280" height="20" style="width:100%;height:20px;border-radius:99px;margin-top:14px;cursor:pointer;touch-action:none"></canvas>'
      + '<div style="display:flex;align-items:center;gap:12px;margin-top:18px">'
        + '<div id="cpPreview" style="width:44px;height:44px;border-radius:12px;flex-shrink:0;border:2px solid rgba(0,0,0,.1)"></div>'
        + '<input id="cpHexInput" type="text" maxlength="7" style="flex:1;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-family:monospace;background:var(--input-bg);color:var(--tx);outline:none" placeholder="#1a2b40">'
      + '</div>'
      + '<button class="btn-save" style="margin-top:16px" onclick="confirmColorPicker()">Aplicar color</button>'
      + '<button class="btn-cancel" onclick="closeColorPicker()">Cancelar</button>'
    + '</div>';
  document.body.appendChild(overlay);

  setTimeout(() => {
    _cpCanvas = document.getElementById('cpSquare');
    _cpCtx = _cpCanvas.getContext('2d');
    const hueCanvas = document.getElementById('cpHueBar');
    const hueCtx = hueCanvas.getContext('2d');

    drawHueBar(hueCtx, hueCanvas.width, hueCanvas.height);
    drawSquare();
    updateCpPreview();

    document.getElementById('cpHexInput').value = saved;

    let draggingSquare = false, draggingHue = false;

    const squarePos = e => {
      const r = _cpCanvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      _cpSat = Math.max(0, Math.min(100, (x / r.width) * 100));
      _cpVal = Math.max(0, Math.min(100, 100 - (y / r.height) * 100));
      drawSquare(); updateCpPreview();
    };
    const huePos = e => {
      const r = hueCanvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      _cpHue = Math.max(0, Math.min(360, (x / r.width) * 360));
      drawSquare(); updateCpPreview();
    };

    _cpCanvas.addEventListener('mousedown', e => { draggingSquare = true; squarePos(e); });
    _cpCanvas.addEventListener('touchstart', e => { draggingSquare = true; squarePos(e); });
    window.addEventListener('mousemove', e => { if (draggingSquare) squarePos(e); if (draggingHue) huePos(e); });
    window.addEventListener('touchmove', e => { if (draggingSquare) squarePos(e); if (draggingHue) huePos(e); }, { passive:true });
    window.addEventListener('mouseup', () => { draggingSquare = false; draggingHue = false; });
    window.addEventListener('touchend', () => { draggingSquare = false; draggingHue = false; });
    hueCanvas.addEventListener('mousedown', e => { draggingHue = true; huePos(e); });
    hueCanvas.addEventListener('touchstart', e => { draggingHue = true; huePos(e); });

    document.getElementById('cpHexInput').addEventListener('input', e => {
      const val = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const hsv2 = hexToHsv(val);
        _cpHue = hsv2.h; _cpSat = hsv2.s; _cpVal = hsv2.v;
        drawSquare(); updateCpPreview(false);
      }
    });
  }, 50);
}

function drawHueBar(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 6; i++) grad.addColorStop(i/6, hsvToHex(i*60, 100, 100));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawSquare() {
  if (!_cpCtx) return;
  const w = _cpCanvas.width, h = _cpCanvas.height;
  const satGrad = _cpCtx.createLinearGradient(0, 0, w, 0);
  satGrad.addColorStop(0, '#fff');
  satGrad.addColorStop(1, hsvToHex(_cpHue, 100, 100));
  _cpCtx.fillStyle = satGrad;
  _cpCtx.fillRect(0, 0, w, h);
  const valGrad = _cpCtx.createLinearGradient(0, 0, 0, h);
  valGrad.addColorStop(0, 'rgba(0,0,0,0)');
  valGrad.addColorStop(1, '#000');
  _cpCtx.fillStyle = valGrad;
  _cpCtx.fillRect(0, 0, w, h);

  const x = (_cpSat/100) * w, y = (1 - _cpVal/100) * h;
  _cpCtx.beginPath();
  _cpCtx.arc(x, y, 8, 0, Math.PI*2);
  _cpCtx.strokeStyle = '#fff'; _cpCtx.lineWidth = 3; _cpCtx.stroke();
  _cpCtx.strokeStyle = 'rgba(0,0,0,.3)'; _cpCtx.lineWidth = 1; _cpCtx.stroke();
}

function updateCpPreview(syncHex = true) {
  const hex = hsvToHex(_cpHue, _cpSat, _cpVal);
  const prev = document.getElementById('cpPreview');
  if (prev) prev.style.background = hex;
  if (syncHex) { const inp = document.getElementById('cpHexInput'); if (inp) inp.value = hex; }
}

function confirmColorPicker() {
  const hex = hsvToHex(_cpHue, _cpSat, _cpVal);
  applyThemeColor(hex);
  saveThemeColor(hex, 'Personalizado');
  closeColorPicker();
}

function closeColorPicker() {
  document.getElementById('colorPickerOverlay')?.remove();
  _cpCanvas = null; _cpCtx = null;
}



/* ================================================================
   ASIGNACIONES — Módulo completo
   Pegar ANTES de la función init()
================================================================ */
/* ================================================================
   ASIGNACIONES — Con navegación por tipo
   Reemplaza el bloque completo de asignaciones en script.js
================================================================ */

/* ── TIPOS ── */





const TIPOS_PARTE = {
  discurso10:   'Discurso de 10 min',
  perlas:       'Busquemos perlas escondidas',
  lectura:      'Lectura de la Biblia',
  conversacion: 'Empiece conversaciones',
  revisitas:    'Haga revisitas',
  discipulos:   'Haga discípulos',
  discurso:     'Explique sus creencias / Discurso',
};



const TIPOS_SVG = {
  discurso10: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
  perlas:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
  lectura:      '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
  conversacion: '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>',
  revisitas:    '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>',
  discipulos:   '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
  discurso:     '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
};

const TIPOS_COLOR = {
  lectura: { bg:'#eef7f8', color:'#2e7d8a' },
  conversacion: { bg:'#fff8ee', color:'#a0660a' },
  revisitas:    { bg:'#fff8ee', color:'#a0660a' },
  discipulos:   { bg:'#fff8ee', color:'#a0660a' },
  discurso:     { bg:'#fff8ee', color:'#a0660a' },
  discurso10: { bg:'#eef7f8', color:'#2e7d8a' },
  perlas:     { bg:'#eef7f8', color:'#2e7d8a' },
};

const NECESITA_AYUDANTE = ['conversacion', 'revisitas', 'discipulos'];

/* ── ESTADO ── */
let asignaciones      = [];
let nextAsigId        = 1;
let tiposPersonalizados = []; // ← aquí
let _asigEdit         = null;
let _tipoActivo       = null; // tipo seleccionado actualmente

/* ── STORAGE ── */
async function saveAsig() {
  await kSet('st_asig', { list: asignaciones, nid: nextAsigId });
}
async function loadAsig() {
  try {
    const data = await apiGetAsignaciones();
    if (Array.isArray(data)) {
      asignaciones = data.map(a => ({
        id: a.id,
        tipo: a.seccion,
        fecha: a.fecha_reunion ? a.fecha_reunion.split('T')[0] : '',
        nota: a.titulo,
        ayudante: a.notas || '',
        estado: a.estado,
        completada: a.estado === 'Completado',
        reflexion: null,
        eval: ''
      }));
    }
  } catch(err) {
    console.error('Error cargando asignaciones:', err);
  }
}
async function saveTiposPersonalizados() { await kSet('st_tipos_custom', tiposPersonalizados); }
async function loadTiposPersonalizados() { const v = await kGet('st_tipos_custom'); if(v) tiposPersonalizados = v; }

/* ================================================================
   PANTALLA PRINCIPAL — solo tarjetas de tipo
================================================================ */



function buildAsignaciones() {
  const fab = document.getElementById('fabBtn');
  if (fab) fab.style.display = 'none';
  _tipoActivo = null;
  document.getElementById('hdrTitle').textContent = 'Asignaciones';

  let html = '';

  /* Botón agregar */
  html += '<div style="padding:16px 16px 0">'
    + '<button onclick="goToAgregarAsignacion()" class="asig-btn-agregar" style="'
      + 'width:100%;padding:22px 16px;border-radius:14px;'
      + 'border:2px dashed #7ab8c8;background:var(--s2);'
      + 'color:#2e7d8a;font-size:15px;font-weight:600;'
      + 'cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px">'
      + '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
      + 'Agregar asignación'
    + '</button>'
  + '</div>';

  /* Secciones con asignaciones */
  const SECCIONES_INFO = [
    { id:'tesoros',   color:'#2e7d8a', bg:'#eef7f8', nombre:'Tesoros de la Biblia',      img:'img/tesoros.png' },
    { id:'maestros',  color:'#a0660a', bg:'#fff8ee', nombre:'Seamos Mejores Maestros',   img:'img/maestros.png' },
    { id:'cristiana', color:'#8b1a1a', bg:'#fdf0f0', nombre:'Nuestra Vida Cristiana',    img:'img/cristiana.png' },
  ];

  const TIPOS_SECCION = {
    lectura: 'tesoros', discurso10: 'tesoros', perlas: 'tesoros',
    conversacion: 'maestros', revisitas: 'maestros', discipulos: 'maestros', discurso: 'maestros',
  };

  const pendientes = asignaciones.filter(a => !a.completada)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (pendientes.length > 0) {
    SECCIONES_INFO.forEach(sec => {
      const items = pendientes.filter(a => {
        const tipoCustom = tiposPersonalizados.find(t => t.id === a.tipo);
        const seccionTipo = tipoCustom ? tipoCustom.seccion : TIPOS_SECCION[a.tipo];
        return seccionTipo === sec.id;
      });

      if (!items.length) return;

      html += '<div style="margin:16px 16px 0;border-radius:14px;overflow:hidden;border:1.5px solid ' + sec.color + '20">'
        + '<div class="asig-sec-' + sec.id + '" style="background:' + sec.bg + ';padding:10px 14px;display:flex;align-items:center;gap:10px">'
          + '<img src="' + sec.img + '" width="24" height="24" style="object-fit:contain"/>'
          + '<div style="font-size:12px;font-weight:700;color:' + sec.color + ';text-transform:uppercase;letter-spacing:.04em">' + sec.nombre + '</div>'
        + '</div>';

      items.forEach(a => {
        const diasFalta = diasHasta(a.fecha);
        const label     = diasFalta === 0 ? '¡Hoy!' : diasFalta === 1 ? 'Mañana' : 'En ' + diasFalta + ' días';
        const urgencia  = diasFalta <= 3 ? '#c0392b' : sec.color;
        const tipoCustom = tiposPersonalizados.find(t => t.id === a.tipo);
        const nombreTipo = tipoCustom ? tipoCustom.nombre : (TIPOS_PARTE[a.tipo] || a.tipo);

        html += '<div onclick="openAsigDet(' + a.id + ')" style="'
          + 'display:flex;align-items:center;gap:12px;padding:13px 14px;'
          + 'background:var(--surface);border-top:1px solid var(--border);cursor:pointer">'
          + '<div style="flex:1">'
            + '<div style="font-size:14px;font-weight:600;color:var(--navy)">' + nombreTipo + '</div>'
            + '<div style="font-size:12px;color:var(--tx3);margin-top:2px"> ' + fmtDate(a.fecha) + (a.ayudante ? ' · Con ' + a.ayudante : '') + '</div>'
          + '</div>'
          + '<span style="font-size:12px;font-weight:700;color:' + urgencia + ';white-space:nowrap">' + label + '</span>'
          + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="color:var(--tx3);flex-shrink:0"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>'
        + '</div>';
      });

      html += '</div>';
    });
  }

  document.getElementById('asigBody').innerHTML = html;
}


function goToAgregarAsignacion() {
  document.getElementById('hdrTitle').textContent = 'Nueva asignación';

  const SECCIONES = [
    { id:'tesoros',   img:'img/tesoros.png',   color:'#2e7d8a', bg:'#eef7f8', bgDark:'#0a1f22', tipos:['discurso10','perlas','lectura'] },
    { id:'maestros',  img:'img/maestros.png',  color:'#a0660a', bg:'#fff8ee', bgDark:'#1f1200', tipos:['conversacion','revisitas','discipulos','discurso'] },
    { id:'cristiana', img:'img/cristiana.png', color:'#8b1a1a', bg:'#fdf0f0', bgDark:'#1f0505', tipos:[] },
  ];

  let html = '<div style="padding:12px 16px 0">'
    + '<button onclick="buildAsignaciones()" style="display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--navy);font-size:13px;font-weight:600;cursor:pointer;padding:0">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>'
      + 'Asignaciones'
    + '</button>'
  + '</div>';

  html += '<div style="padding:16px;display:flex;flex-direction:column;gap:12px">';

  SECCIONES.forEach(sec => {
    html += '<div style="border-radius:16px;overflow:hidden;border:1.5px solid ' + sec.color + '20">'
      + '<div style="background:' + (document.documentElement.getAttribute('data-theme')==='dark' ? sec.bgDark : sec.bg) + ';padding:14px 16px;display:flex;align-items:center;gap:12px">'
        + '<img src="' + sec.img + '" width="32" height="32" style="object-fit:contain"/>'
        + '<div style="font-size:13px;font-weight:700;color:' + sec.color + ';text-transform:uppercase;letter-spacing:.04em;flex:1">'
          + (sec.id==='tesoros' ? 'Tesoros de la Biblia' : sec.id==='maestros' ? 'Seamos Mejores Maestros' : 'Nuestra Vida Cristiana')
        + '</div>'
      + '</div>';

    /* Tipos */
    sec.tipos.forEach((tipo, index) => {
      html += '<button onclick="openAsigForm(\'' + tipo + '\')" style="'
        + 'display:flex;align-items:center;gap:10px;padding:12px 16px;'
        + 'background:var(--surface);border:none;border-top:1px solid var(--border);'
        + 'cursor:pointer;text-align:left;width:100%">'
        + '<span style="font-size:13px;font-weight:700;color:' + sec.color + '">' + (index + 1) + '.</span>'
        + '<span style="font-size:14px;font-weight:600;color:' + sec.color + '">' + TIPOS_PARTE[tipo] + '</span>'
      + '</button>';
    });

    /* Tipos personalizados de esta sección */
    tiposPersonalizados.filter(t => t.seccion === sec.id).forEach(tipo => {
      html += '<div style="display:flex;align-items:center;border-top:1px solid var(--border);background:var(--surface)">'
        + '<button onclick="openAsigForm(\'' + tipo.id + '\')" style="'
          + 'flex:1;display:flex;align-items:center;gap:10px;padding:12px 16px;'
          + 'background:none;border:none;cursor:pointer;text-align:left">'
          + '<span style="font-size:13px;font-weight:700;color:' + sec.color + '">' + (sec.tipos.length + tiposPersonalizados.filter(x => x.seccion === sec.id).indexOf(tipo) + 1) + '.</span>'
          + '<span style="font-size:14px;font-weight:600;color:' + sec.color + '">' + tipo.nombre + '</span>'
        + '</button>'
        + '<button onclick="eliminarTipoPersonalizado(\'' + tipo.id + '\')" style="'
          + 'padding:12px 14px;background:none;border:none;cursor:pointer;color:#9b2335;flex-shrink:0">'
          + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
        + '</button>'
      + '</div>';
    });

    /* Botón agregar al final de cada sección */
    html += '<button onclick="abrirFormNuevoTipo(\'' + sec.id + '\')" style="'
      + 'display:flex;align-items:center;justify-content:center;gap:8px;'
      + 'width:100%;padding:13px 16px;background:' + (document.documentElement.getAttribute('data-theme')==='dark' ? sec.bgDark : sec.bg) + ';'
      + 'border:none;border-top:1px solid ' + sec.color + '20;'
      + 'cursor:pointer;font-size:13px;font-weight:600;color:' + sec.color + '">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
      + 'Agregar nueva asignación'
    + '</button>';

    html += '</div>';
  });

  html += '</div>';
  document.getElementById('asigBody').innerHTML = html;
}

function goToTipoSeccion(secId) {
  const tipos = secId==='tesoros' ? ['lectura'] : secId==='maestros' ? ['conversacion','revisitas','discipulos','discurso'] : [];
  if (!tipos.length) { toast('Sin tipos disponibles aún'); return; }
  if (tipos.length === 1) { openAsigForm(tipos[0]); return; }
  toast('Selecciona el tipo de parte arriba');
}


function abrirFormNuevoTipo(secId) {
  const secNombre = secId==='tesoros' ? 'Tesoros de la Biblia' : secId==='maestros' ? 'Seamos Mejores Maestros' : 'Nuestra Vida Cristiana';
  const secColor  = secId==='tesoros' ? '#2e7d8a' : secId==='maestros' ? '#a0660a' : '#8b1a1a';

  document.getElementById('det-title').textContent = 'Nueva asignación';
  document.getElementById('detBody').innerHTML =
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:16px">' + secNombre + '</div>'
    + '<div class="fgroup"><label>¿Qué asignación tienes?</label>'
      + '<input id="nuevoTipoNombre" type="text" placeholder="Ej: Oración, Discurso de 5 min..."/>'
    + '</div>'
    + '<div class="fgroup"><label>¿Es de dos personas?</label>'
      + '<select id="nuevoTipoAyudante">'
        + '<option value="0">No, es individual</option>'
        + '<option value="1">Sí, necesita ayudante</option>'
      + '</select>'
    + '</div>'
    + '<button class="btn-save" onclick="guardarNuevoTipo(\'' + secId + '\')">Crear asignación</button>'
    + '<button class="btn-cancel" onclick="closeDet()">Cancelar</button>';
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

async function guardarNuevoTipo(secId) {
  const nombre = document.getElementById('nuevoTipoNombre').value.trim();
  if (!nombre) { toast('Escribe el nombre de la asignación'); return; }

  const nuevoTipo = {
    id:              'custom_' + Date.now(),
    nombre,
    seccion:         secId,
    necesitaAyudante: document.getElementById('nuevoTipoAyudante').value === '1',
  };

  tiposPersonalizados.push(nuevoTipo);
  await saveTiposPersonalizados();
  closeDet();
  goToAgregarAsignacion();
  toast('Asignación creada ✔');
}

async function eliminarTipoPersonalizado(id) {
  tiposPersonalizados = tiposPersonalizados.filter(t => t.id !== id);
  await saveTiposPersonalizados();
  goToAgregarAsignacion();
  toast('Asignación eliminada');
}
/* ================================================================
   SUBSECCIÓN POR TIPO
================================================================ */
function goToTipo(tipo) {
  _tipoActivo = tipo;
  const c     = TIPOS_COLOR[tipo];
  document.getElementById('hdrTitle').textContent = TIPOS_PARTE[tipo];

  const items = asignaciones
    .filter(a => a.tipo === tipo && !a.completada)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const completadas = asignaciones
    .filter(a => a.tipo === tipo && a.completada)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  let html = '';

  /* Botón volver */
  html += '<div style="padding:12px 16px 0">'
    + '<button onclick="buildAsignaciones()" style="'
      + 'display:flex;align-items:center;gap:6px;background:none;border:none;'
      + 'color:var(--navy);font-size:13px;font-weight:600;cursor:pointer;padding:0">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>'
      + 'Asignaciones'
    + '</button>'
  + '</div>';

  /* Header tipo */
  html += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px 10px">'
    + '<div style="width:44px;height:44px;border-radius:12px;background:' + c.bg + ';color:' + c.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + TIPOS_SVG[tipo]
    + '</div>'
    + '<div>'
      + '<div style="font-size:16px;font-weight:700;color:var(--navy)">' + TIPOS_PARTE[tipo] + '</div>'
      + '<div style="font-size:12px;color:var(--tx3)">'
        + (NECESITA_AYUDANTE.includes(tipo) ? 'Parte de dos personas' : 'Parte individual')
        + ' · ' + items.length + ' pendiente' + (items.length !== 1 ? 's' : '')
      + '</div>'
    + '</div>'
  + '</div>';

  /* Lista pendientes */
  if (items.length === 0) {
    html += '<div class="empty-wrap" style="padding:32px 0">'
      + '<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity:.3"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>'
      + '<div class="empty-title" style="font-size:15px">Sin asignaciones</div>'
      + '<div class="empty-sub">Toca el botón para agregar tu primera parte.</div>'
    + '</div>';
  } else {
    html += '<div class="card-list">' + items.map(a => asigCard(a)).join('') + '</div>';
  }

  /* Completadas colapsadas */
  if (completadas.length > 0) {
    html += '<div style="padding:4px 16px 16px">'
      + '<button onclick="toggleCompletadas(this)" style="font-size:12px;color:var(--tx3);background:none;border:none;cursor:pointer;padding:8px 0;display:flex;align-items:center;gap:4px">'
        + '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
        + completadas.length + ' completada' + (completadas.length !== 1 ? 's' : '')
      + '</button>'
      + '<div id="completadasList" style="display:none">'
        + completadas.map(a => asigCardCompletada(a)).join('')
      + '</div>'
    + '</div>';
  }

  /* FAB agregar */
  html += '<button class="fab" onclick="openAsigForm(\'' + tipo + '\')" style="display:flex">'
    + '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
    + ' Agregar'
  + '</button>';

  document.getElementById('asigBody').innerHTML = html;
}

function toggleCompletadas(btn) {
  const list = document.getElementById('completadasList');
  if (!list) return;
  const open = list.style.display === 'none';
  list.style.display = open ? 'block' : 'none';
  btn.querySelector('svg').style.transform = open ? 'rotate(180deg)' : '';
}

/* ── Tarjeta pendiente ── */
function asigCard(a) {
  const diasFalta     = diasHasta(a.fecha);
  const label         = diasFalta === 0 ? '¡Hoy!' : diasFalta === 1 ? 'Mañana' : 'En ' + diasFalta + ' días';
  const urgencia      = diasFalta <= 3 ? 'b-pend' : 'b-inter';
  const c             = TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' };
  const tieneAyudante = NECESITA_AYUDANTE.includes(a.tipo) && a.ayudante;

  return '<div class="card" onclick="openAsigDet(' + a.id + ')">'
    + '<div class="card-row1">'
      + '<div class="ava" style="background:' + c.bg + ';color:' + c.color + ';display:flex;align-items:center;justify-content:center">' + TIPOS_SVG[a.tipo] + '</div>'
      + '<div class="card-info">'
        + '<div class="card-name"> ' + fmtDate(a.fecha) + '</div>'
        + '<div class="card-addr">' + (tieneAyudante ? 'Con ' + a.ayudante : NECESITA_AYUDANTE.includes(a.tipo) ? 'Sin ayudante asignado' : 'Parte individual') + '</div>'
      + '</div>'
      + '<span class="badge ' + urgencia + '">' + label + '</span>'
    + '</div>'
    + (a.nota ? '<div class="card-row2"><span class="card-pub">' + a.nota.substring(0, 40) + '</span></div>' : '')
    + (tieneAyudante && a.fechaPractica ? '<div class="card-row3"><span style="font-size:11px;color:var(--tx3)">Práctica: ' + fmtDate(a.fechaPractica) + '</span></div>' : '')
  + '</div>';
}

/* ── Tarjeta completada ── */
function asigCardCompletada(a) {
  return '<div class="card" style="opacity:.6" onclick="openAsigDet(' + a.id + ')">'
    + '<div class="card-row1">'
      + '<div class="card-info">'
        + '<div class="card-name" style="text-decoration:line-through"> ' + fmtDate(a.fecha) + '</div>'
        + '<div class="card-addr">' + (a.eval || 'Completada') + '</div>'
      + '</div>'
      + '<span class="badge b-reg">✔</span>'
    + '</div>'
  + '</div>';
}

/* ================================================================
   FORMULARIO
================================================================ */
function openAsigForm(tipo, editData) {
  const fab = document.getElementById('fabBtn');
  if (fab) fab.style.display = 'none';
  _asigEdit = editData || null;
  const tipoFinal  = editData ? editData.tipo : tipo;
  const tipoCustom = tiposPersonalizados.find(t => t.id === tipoFinal);
  const esDoble    = tipoCustom ? tipoCustom.necesitaAyudante : NECESITA_AYUDANTE.includes(tipoFinal);
  const label      = tipoCustom ? tipoCustom.nombre : (TIPOS_PARTE[tipoFinal] || tipoFinal);
  const secLabel   = tipoCustom
    ? (tipoCustom.seccion==='tesoros' ? 'Tesoros de la Biblia' : tipoCustom.seccion==='maestros' ? 'Seamos Mejores Maestros' : 'Nuestra Vida Cristiana')
    : '';
  const c = tipoCustom
    ? { bg: tipoCustom.seccion==='tesoros' ? '#eef7f8' : tipoCustom.seccion==='maestros' ? '#fff8ee' : '#fdf0f0',
        color: tipoCustom.seccion==='tesoros' ? '#2e7d8a' : tipoCustom.seccion==='maestros' ? '#a0660a' : '#8b1a1a' }
    : (TIPOS_COLOR[tipoFinal] || { bg:'#eef3fa', color:'#2e6be6' });

  const html = '<div class="panel-bar"></div>'
    + '<div class="panel-hdr">'
      + '<span class="panel-title">' + (editData ? 'Editar' : 'Nueva') + ' asignación</span>'
      + '<button class="panel-close" onclick="closeAsigForm()">✕</button>'
    + '</div>'
    + '<div class="form-body">'

      /* Header tipo */
      + '<div style="padding:14px 16px;background:' + c.bg + ';border-radius:12px;margin-bottom:20px">'
        + '<div style="font-size:16px;font-weight:700;color:' + c.color + '">' + label + '</div>'
        + (secLabel ? '<div style="font-size:11px;color:' + c.color + ';opacity:.7;margin-top:3px">' + secLabel + '</div>' : '')
      + '</div>'

      + '<input type="hidden" id="afTipo" value="' + tipoFinal + '"/>'
      + '<input type="hidden" id="afEsDoble" value="' + (esDoble ? '1' : '0') + '"/>'

      /* 1. Ayudante — solo si aplica */
      + (esDoble
        ? '<div class="fgroup"><label>¿Con quién tienes la parte?</label>'
            + '<input id="afAyudante" type="text" placeholder="Nombre del hermano/a" value="' + (editData ? editData.ayudante || '' : '') + '"/>'
          + '</div>'
        : '')

      /* 2. Nota */
      + '<div class="fgroup"><label>Nota (lección, tema…)</label>'
        + '<input id="afNota" type="text" placeholder="Ej: lmd lección 3, punto 2" value="' + (editData ? editData.nota || '' : '') + '"/>'
      + '</div>'

      /* 3. Fecha */
      + '<div class="fgroup"><label>¿Qué día tienes esta asignación?*</label>'
        + '<input id="afFecha" type="date" value="' + (editData ? editData.fecha : today()) + '"/>'
      + '</div>'

      + '<button class="btn-save" onclick="saveAsig_()">Guardar asignación</button>'
      + '<button class="btn-cancel" onclick="closeAsigForm()">Cancelar</button>'
    + '</div>';

  document.getElementById('asigFormPanel').innerHTML = html;
  document.getElementById('asigFormBg').classList.add('open');
  updateFabVisibility();
}

function closeAsigForm() {
  document.getElementById('asigFormBg').classList.remove('open');
  _asigEdit = null;
  updateFabVisibility();
}

['formBg','detBg','asigFormBg'].forEach(id => {
  document.getElementById(id)?.addEventListener('click', function(e) { if(e.target===this) this.classList.remove('open'); });
});


async function saveAsig_() {
  const tipo    = document.getElementById('afTipo').value;
  const fecha   = document.getElementById('afFecha').value;
  const esDoble = document.getElementById('afEsDoble').value === '1';
  if (!fecha) { toast('La fecha es obligatoria'); return; }

  const data = {
    tipo, fecha,
    nota:          document.getElementById('afNota').value.trim(),
    ayudante:      esDoble ? (document.getElementById('afAyudante')?.value.trim() || '') : '',
    fechaPractica: esDoble ? (document.getElementById('afFechaPractica')?.value || '') : '',
    completada:    false,
    eval:          '',
  };

  if (_asigEdit) {
    const result = await apiUpdateAsignacion(_asigEdit.id, {
      seccion: tipo,
      titulo: data.nota,
      fecha_reunion: fecha,
      estado: data.completada ? 'Completado' : 'Pendiente',
      notas: data.ayudante
    });
    const i = asignaciones.findIndex(a => a.id === _asigEdit.id);
    if (i !== -1) asignaciones[i] = { ...asignaciones[i], ...data };
  } else {
    const result = await apiCreateAsignacion({
      seccion: tipo,
      titulo: data.nota,
      fecha_reunion: fecha,
      estado: 'Pendiente',
      notas: data.ayudante
    });
    if (result.id) {
      const na = { id: result.id, ...data };
      asignaciones.push(na);
    }
  }

  closeAsigForm();
  goToAgregarAsignacion();
  toast(_asigEdit ? 'Asignación actualizada ✔' : 'Asignación guardada ✔');
  _asigEdit = null;
}
/* ================================================================
   DETALLE
================================================================ */
/* ================================================================
   CAMBIOS A APLICAR EN script.js
   1. Reemplaza openAsigDet()
   2. Agrega guardarReflexion()
   3. Reemplaza renderHTab()
================================================================ */

/* ================================================================
   1. REEMPLAZA openAsigDet()
================================================================ */
function openAsigDet(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;

  const diasFalta     = diasHasta(a.fecha);
  const tieneAyudante = NECESITA_AYUDANTE.includes(a.tipo) && a.ayudante;
  const c             = TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' };
  const pct           = Math.max(0, Math.min(100, Math.round((1 - diasFalta / 30) * 100)));

  let html = '<div class="det-head">'
    + '<div class="det-ava" style="background:' + c.bg + ';color:' + c.color + ';display:flex;align-items:center;justify-content:center">' + TIPOS_SVG[a.tipo] + '</div>'
    + '<div>'
      + '<div class="det-name">' + TIPOS_PARTE[a.tipo] + '</div>'
      + '<div class="det-tipo"> ' + fmtDate(a.fecha) + ' · ' + (diasFalta === 0 ? '¡Hoy!' : diasFalta < 0 ? 'Pasada' : 'En ' + diasFalta + ' días') + '</div>'
    + '</div>'
  + '</div>';

  if (a.nota) html += drow('Nota', a.nota);
  if (tieneAyudante) {
    html += drow('Ayudante', a.ayudante);
    if (a.fechaPractica) html += drow('Práctica juntos', fmtDate(a.fechaPractica));
  }

  /* Barra progreso — solo si no está completada */


  /* Compartir con ayudante */
  if (tieneAyudante) {
    html += '<button class="btn-outline" style="margin-top:8px" onclick="compartirConAyudante(' + id + ')">'
      + '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/></svg>'
      + ' Avisar a ' + a.ayudante
    + '</button>';
  }

  /* ── REFLEXIÓN POST-PARTE ── */
  if (diasFalta <= 0) {

    /* Si ya tiene reflexión guardada → mostrarla */
    if (a.reflexion && (a.reflexion.estudio || a.reflexion.mejora || a.reflexion.predicacion)) {
      html += '<div style="margin:16px 0;padding:14px;background:var(--navy-light, #f0f4f8);border-radius:14px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--navy);letter-spacing:.06em;text-transform:uppercase;margin-bottom:10px">Reflexión post-parte</div>'
        + (a.reflexion.estudio
          ? '<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--tx3);margin-bottom:3px">📚 Estudio personal</div><div style="font-size:13px;color:var(--navy)">' + a.reflexion.estudio + '</div></div>'
          : '')
        + (a.reflexion.mejora
          ? '<div style="margin-bottom:8px"><div style="font-size:11px;color:var(--tx3);margin-bottom:3px">🎯 Aspecto a mejorar</div><div style="font-size:13px;color:var(--navy)">' + a.reflexion.mejora + '</div></div>'
          : '')
        + (a.reflexion.predicacion
          ? '<div><div style="font-size:11px;color:var(--tx3);margin-bottom:3px">🗣️ Tips para la predicación</div><div style="font-size:13px;color:var(--navy)">' + a.reflexion.predicacion + '</div></div>'
          : '')
        + '<button class="btn-outline" style="margin-top:12px;font-size:12px" onclick="editarReflexion(' + id + ')">✏️ Editar reflexión</button>'
      + '</div>';

    /* Si no tiene reflexión → mostrar campos para escribir */
    } else {
      html += '<div style="margin:16px 0;padding:14px;background:var(--navy-light, #f0f4f8);border-radius:14px">'
        + '<div style="font-size:11px;font-weight:700;color:var(--navy);letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px">Reflexión post-parte</div>'
        + '<div class="fgroup" style="margin-bottom:10px">'
          +'<label style="font-size:12px">Estudio personal</label>'
          + '<textarea id="rfEstudio" placeholder="¿Qué estudiaste o aprendiste para esta parte?" style="min-height:60px;font-size:13px">' + (a.reflexion?.estudio || '') + '</textarea>'
        + '</div>'
        + '<div class="fgroup" style="margin-bottom:10px">'
          + '<label style="font-size:12px">Aspecto a mejorar</label>'
          + '<textarea id="rfMejora" placeholder="¿Qué mejorarías para la próxima vez?" style="min-height:60px;font-size:13px">' + (a.reflexion?.mejora || '') + '</textarea>'
        + '</div>'
        + '<div class="fgroup" style="margin-bottom:12px">'
          + '<label style="font-size:12px">Tips para la predicación</label>'
          + '<textarea id="rfPredicacion" placeholder="¿Cómo puedes aplicar esto en el campo?" style="min-height:60px;font-size:13px">' + (a.reflexion?.predicacion || '') + '</textarea>'
        + '</div>'
        + '<button class="btn-save" style="margin-top:0" onclick="guardarReflexion(' + id + ')">Guardar reflexión</button>'
      + '</div>';
    }
  }

  /* Completada */
  

  /* Acciones */
  html += '<div class="det-actions">'
    + '<button class="btn-edit" onclick="closeDet();openAsigForm(null, asignaciones.find(x=>x.id===' + id + '))">Editar</button>'
    + '<button class="btn-danger" style="margin-top:0" onclick="deleteAsig(' + id + ')">Eliminar</button>'
  + '</div>';
  

  if (!a.completada) {
    html += '<button onclick="marcarAsigCompletada(' + id + ')" style="'
      + 'width:100%;padding:12px;margin-top:8px;border-radius:10px;'
      + 'border:1.5px solid #1e7e34;background:#edf7ef;'
      + 'color:#1e7e34;font-size:14px;font-weight:600;cursor:pointer">'
      + '✔ Marcar como completada'
    + '</button>';
  } else {
    html += '<div style="margin:12px 0;padding:10px 14px;background:#edf7ef;border-radius:10px;font-size:13px;color:#1e7e34">✔ Parte completada</div>';
  }

  html += '<button class="btn-cancel" onclick="closeDet()">Cerrar</button>';

  document.getElementById('det-title').textContent = 'Detalle';
  document.getElementById('detBody').innerHTML = html;
  document.getElementById('detBg').classList.add('open');
  updateFabVisibility();
}

/* ================================================================
   2. AGREGA guardarReflexion() y editarReflexion()
================================================================ */
async function guardarReflexion(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;

  const estudio    = document.getElementById('rfEstudio')?.value.trim()    || '';
  const mejora     = document.getElementById('rfMejora')?.value.trim()     || '';
  const predicacion= document.getElementById('rfPredicacion')?.value.trim()|| '';

  if (!estudio && !mejora && !predicacion) {
    toast('Escribe al menos un campo'); return;
  }

  a.reflexion = { estudio, mejora, predicacion };
  await saveAsig();
  openAsigDet(id); // refresca el detalle
  toast('Reflexión guardada ✔');
}

function editarReflexion(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;
  // Borrar reflexión temporalmente para mostrar campos de edición
  const respaldo = a.reflexion;
  a.reflexion = null;
  openAsigDet(id);
  // Restaurar valores en los campos
  setTimeout(() => {
    const rfE = document.getElementById('rfEstudio');
    const rfM = document.getElementById('rfMejora');
    const rfP = document.getElementById('rfPredicacion');
    if (rfE) rfE.value = respaldo?.estudio     || '';
    if (rfM) rfM.value = respaldo?.mejora      || '';
    if (rfP) rfP.value = respaldo?.predicacion || '';
    a.reflexion = respaldo; // restaurar en memoria
  }, 50);
}

/* ================================================================
   3. REEMPLAZA renderHTab() — historial con tarjetas de reflexión
================================================================ */


/* ================================================================
  NOTIFICACIONES PROGRESIVAS
================================================================ */
async function schedAsigNotifs(a) {
  const fechaMs = new Date(a.fecha + 'T09:00:00').getTime();
  const ahora   = Date.now();
  const dias    = diasHasta(a.fecha);
  const nots    = [];
  const tipo    = TIPOS_PARTE[a.tipo];
  const semanas = Math.floor(dias / 7);

  if (semanas >= 4) {
    pushNot(nots, a.id, 1, fechaMs - 28*864e5, tipo, '¿Ya pensaste en el tema de tu parte? Tienes tiempo, ¡empieza a planificar!', ahora);
    pushNot(nots, a.id, 2, fechaMs - 21*864e5, tipo, '¿Cómo vas con la preparación? Esta semana es buen momento para investigar.', ahora);
    pushNot(nots, a.id, 3, fechaMs - 14*864e5, tipo, '¿Ya tienes el bosquejo o los puntos principales? ¡Vas muy bien!', ahora);
    pushNot(nots, a.id, 4, fechaMs - 7*864e5,  tipo, '¡Una semana! Es hora de practicar en voz alta.', ahora);
  } else if (semanas >= 3) {
    pushNot(nots, a.id, 2, fechaMs - 21*864e5, tipo, '¿Cómo vas con la preparación? Esta semana es buen momento para investigar.', ahora);
    pushNot(nots, a.id, 3, fechaMs - 14*864e5, tipo, '¿Ya tienes los puntos principales? ¡Vas muy bien!', ahora);
    pushNot(nots, a.id, 4, fechaMs - 7*864e5,  tipo, '¡Una semana! Es hora de practicar en voz alta.', ahora);
  } else if (semanas >= 2) {
    pushNot(nots, a.id, 3, fechaMs - 14*864e5, tipo, '¿Ya tienes los puntos principales? ¡Vas muy bien!', ahora);
    pushNot(nots, a.id, 4, fechaMs - 7*864e5,  tipo, '¡Una semana! Es hora de practicar en voz alta.', ahora);
  } else if (semanas >= 1) {
    pushNot(nots, a.id, 4, fechaMs - 7*864e5,  tipo, '¡Una semana! Es hora de practicar en voz alta.', ahora);
  }

  pushNot(nots, a.id, 5, fechaMs - 3*864e5, tipo, '¡Últimos 3 días! Últimos ensayos — tú puedes.', ahora);
  pushNot(nots, a.id, 6, fechaMs - 2*864e5, tipo, 'Faltan 2 días. Repasa tus puntos principales.', ahora);
  pushNot(nots, a.id, 7, fechaMs - 1*864e5, tipo, '¡Mañana es tu parte! Descansa y confía en tu preparación.', ahora);
  pushNot(nots, a.id, 8, fechaMs,            tipo, '¡Hoy es tu día! Mucho éxito.', ahora);

  if (a.ayudante && a.fechaPractica) {
    const pracMs = new Date(a.fechaPractica + 'T09:00:00').getTime();
    pushNot(nots, a.id, 9,  pracMs - 864e5, 'Práctica mañana', '¿Ya coordinaron todo con ' + a.ayudante + ' para mañana?', ahora);
    pushNot(nots, a.id, 10, pracMs,          '¡Hoy practican!', 'Hoy es el día de practicar con ' + a.ayudante + '. ¡Mucho éxito!', ahora);
  }

  for (const n of nots) {
    try { await notificationManager.scheduleNotification(n); } catch(e) {}
  }
}

function pushNot(arr, asigId, subId, fireAt, title, body, ahora) {
  if (fireAt > ahora) {
    arr.push({
      id:      parseInt(String(asigId) + String(subId)),
      title, body, fireAt,
      cardId:  'asig-' + asigId,
      vibrate: cfg.vibrar !== false,
      sound:   cfg.sonido !== false,
    });
  }
}

async function cancelAsigNotifs(asigId) {
  try { await notificationManager.cancelByCard('asig-' + asigId); } catch(e) {}
}



async function schedInformeNotif() {
  const ahora     = new Date();
  const ultimoDia = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 20, 0, 0);
  const fireAt    = ultimoDia.getTime();

  if (fireAt <= Date.now()) return;

  try {
    await notificationManager.scheduleNotification({
      id:      99901,
      title:   'Informe mensual',
      body:    'No olvides enviar tu informe de ' + mesNombre() + ' antes de que termine el mes.',
      fireAt,
      cardId:  'informe-mensual',
      vibrate: true,
      sound:   true,
    });
  } catch(e) { console.warn('[Informe] Notif error:', e); }
}

/* ── Utilidad ── */
function diasHasta(fecha) {
  if (!fecha) return 999;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const dest = new Date(fecha + 'T00:00:00');
  return Math.round((dest - hoy) / 864e5);
}
async function compartirConAyudante(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;
  const msg = 'Buenos días ' + a.ayudante + '! Te quería comentar que tenemos la parte de "'
    + TIPOS_PARTE[a.tipo] + '" el ' + fmtDate(a.fecha) + '.'
    + (a.fechaPractica ? ' ¿Te parece si nos reunimos el ' + fmtDate(a.fechaPractica) + ' para practicar?' : ' Te estaré confirmando el día para reunirnos y practicar.');

  if (Cap.Share) { try { await Cap.Share.share({ text: msg }); return; } catch(e){} }
  if (navigator.share) { try { await navigator.share({ text: msg }); return; } catch(e){} }
  try { await navigator.clipboard.writeText(msg); toast('Mensaje copiado ✔'); } catch(e) { alert(msg); }
}

async function marcarAsigCompletada(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;
  a.completada = true;
  try { await cancelAsigNotifs(id); } catch(e){}
  await apiUpdateAsignacion(id, {
    seccion: a.tipo,
    titulo: a.nota,
    fecha_reunion: a.fecha,
    estado: 'Completado',
    notas: a.ayudante
  });
  closeDet();
  if (_tipoActivo) goToTipo(_tipoActivo);
  else buildAsignaciones();
  toast('¡Parte completada! ✔');
}

async function deleteAsig(id) {
  try { await cancelAsigNotifs(id); } catch(e){}
  await apiDeleteAsignacion(id);
  asignaciones = asignaciones.filter(x => x.id !== id);
  closeDet();
  if (_tipoActivo) goToTipo(_tipoActivo);
  else buildAsignaciones();
  toast('Asignación eliminada');
}

const CATEGORIAS_REPORTE = {
  problema: { label: '🐛 Reportar un problema', color: '#9b2335', bg: '#fef0f2' },
  mejora:   { label: '💡 Sugerir una mejora',   color: '#a0660a', bg: '#fff8ee' },
  duda:     { label: '❓ Tengo una duda',        color: '#2e6be6', bg: '#eef3fa' },
};
let _chatMensajes = [];
let _chatCategoriaElegida = null;

async function reportarProblema() {
  document.getElementById('detBg').classList.add('open', 'chat-fullscreen');
  document.getElementById('detBody').innerHTML =
    '<div class="chat-header">'
      + '<img src="img/logotipo.png" alt="AssendApp" class="chat-header-logo">'
      + '<div class="chat-header-info">'
        + '<div class="chat-header-title">Asistente Virtual</div>'
        + '<div class="chat-header-status"><span class="chat-status-dot"></span>AssendApp Soporte</div>'
      + '</div>'
      + '<button class="chat-header-close" onclick="closeDet()">✕</button>'
    + '</div>'
    + '<div id="chatMensajes" class="chat-messages"></div>'

    + '<div class="chat-input-row" id="chatInputRow">'
        + '<textarea id="chatInput" placeholder="Escribe tu mensaje..." class="chat-input" rows="1" oninput="autoGrowChat(this)" onfocus="setTimeout(()=>{this.scrollIntoView({block:&quot;center&quot;});},300)" onkeydown="if(event.key===\'Enter\' && !event.shiftKey){event.preventDefault();enviarMensajeChat();}"></textarea>'
        + '<button onclick="enviarMensajeChat()" class="chat-send-btn">'
        + '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
      + '</button>'
    + '</div>';
  updateFabVisibility();
  await cargarChat();
  setTimeout(() => {
    const input = document.getElementById('chatInput');
    if (input) input.focus();
  }, 350);
  ajustarChatPorTeclado();
}

function ajustarChatPorTeclado() {
  const panel = document.querySelector('#detBg.chat-fullscreen .panel');
  const inputRow = document.getElementById('chatInputRow');
  const mensajes = document.getElementById('chatMensajes');
  if (!panel) return;

  function ajustar() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const alturaVisible = vv.height;
    const offsetTop = vv.offsetTop;

    // Ajustar el panel al viewport visual (sin teclado)
    panel.style.height = alturaVisible + 'px';
    panel.style.top = offsetTop + 'px';
    panel.style.bottom = 'auto';

    // Scroll al último mensaje
    if (mensajes) setTimeout(() => { mensajes.scrollTop = mensajes.scrollHeight; }, 50);
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', ajustar);
    window.visualViewport.addEventListener('scroll', ajustar);
  }

  // También ajustar al enfocar el input
  const chatInput = document.getElementById('chatInput');
  if (chatInput) {
    chatInput.addEventListener('focus', () => { setTimeout(ajustar, 300); });
    chatInput.addEventListener('blur', () => {
      if (panel) { panel.style.height = ''; panel.style.top = ''; panel.style.bottom = ''; }
    });
  }

  const closeBtn = document.querySelector('.chat-header-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', ajustar);
        window.visualViewport.removeEventListener('scroll', ajustar);
      }
      if (panel) { panel.style.height = ''; panel.style.top = ''; panel.style.bottom = ''; }
    }, { once: true });
  }
}

function autoGrowChat(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

async function cargarChat() {
  const cont = document.getElementById('chatMensajes');
  try {
    _chatMensajes = await apiGetReportes();
    pintarChat();
  } catch(err) {
    console.error('Error cargando chat:', err);
    if (cont) cont.innerHTML = '<div style="text-align:center;color:#9b2335;font-size:12px;padding:20px">Error al cargar el chat. Intenta cerrar y abrir de nuevo.</div>';
  }
}





function pintarChat() {
  const cont = document.getElementById('chatMensajes');
  if (!cont) return;

  if (!_chatMensajes.length) {
    cont.innerHTML = '<div style="text-align:center;color:var(--tx3);font-size:13px;padding:24px 12px;line-height:1.6">👋 ¡Hola! ¿En qué te podemos ayudar?<br>Escribí tu mensaje abajo.</div>';
  } else {
    cont.innerHTML = _chatMensajes.map((m, i) => {
      const esUsuario = m.remitente === 'usuario';
      const hora = new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const cat = m.categoria ? CATEGORIAS_REPORTE[m.categoria] : null;
      const avatar = !esUsuario ? '<img src="img/logotipo.png" class="chat-bubble-avatar">' : '';
      return '<div class="chat-row ' + (esUsuario ? 'chat-row-user' : 'chat-row-admin') + '" style="animation-delay:' + Math.min(i * 0.03, 0.3) + 's">'
        + avatar
        + '<div onclick="abrirMenuMensaje(' + m.id + ',' + esUsuario + ')" class="chat-bubble ' + (esUsuario ? 'chat-bubble-user' : 'chat-bubble-admin') + '">'
          + (cat ? '<div class="chat-bubble-cat">' + cat.label + '</div>' : '')
          + m.mensaje
          + '<div class="chat-bubble-time">' + hora + (m.editado ? ' · editado' : '') + '</div>'
        + '</div>'
      + '</div>';
    }).join('');
    cont.scrollTop = cont.scrollHeight;
  }
}

function elegirCategoria(key) {
  _chatCategoriaElegida = key;
  const cat = CATEGORIAS_REPORTE[key];
  const inputRow = document.querySelector('.chat-input-row');
  const input = document.getElementById('chatInput');
  if (inputRow) {
    inputRow.style.background = cat.bg;
    inputRow.style.borderTop = '2px solid ' + cat.color;
  }
  if (input) {
    input.style.borderColor = cat.color;
    input.focus();
  }
}

async function enviarMensajeChat() {
  const input = document.getElementById('chatInput');
  const texto = input.value.trim();
  if (!texto) return;
  input.value = '';
  input.style.height = 'auto';
  const categoriaUsada = 'soporte';

  const inputRow = document.getElementById('chatInputRow');
  if (inputRow) { inputRow.style.background = ''; inputRow.style.borderTop = ''; }
  input.style.borderColor = '';

  try {
    _chatMensajes = await apiGetReportes(); // trae lo que había antes de enviar
    pintarChat();
    mostrarEscribiendo();

    await apiEnviarReporte(texto, categoriaUsada);

    setTimeout(async () => {
      ocultarEscribiendo();
      await cargarChat();
    }, 1200);
  } catch(err) { toast('Error al enviar el mensaje'); }
}

function mostrarEscribiendo() {
  const cont = document.getElementById('chatMensajes');
  if (!cont) return;
  const div = document.createElement('div');
  div.id = 'chatEscribiendo';
  div.className = 'chat-row chat-row-admin';
  div.innerHTML = '<img src="img/logotipo.png" class="chat-bubble-avatar">'
    + '<div class="chat-bubble chat-bubble-admin"><span class="chat-typing"><span></span><span></span><span></span></span></div>';
  cont.appendChild(div);
  cont.scrollTop = cont.scrollHeight;
}

function ocultarEscribiendo() {
  document.getElementById('chatEscribiendo')?.remove();
}

function abrirMenuMensaje(id, esUsuario) {
  if (!esUsuario) return; // solo puedes editar/eliminar tus propios mensajes
  const msg = _chatMensajes.find(m => m.id === id);
  if (!msg) return;

  const modal = document.createElement('div');
  modal.id = 'chatMsgMenu';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99999;display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:400px;border-radius:16px 16px 0 0;padding:8px 0 calc(env(safe-area-inset-bottom,0px) + 8px)">
      <button onclick="iniciarEdicionMensaje(${id})" style="width:100%;text-align:left;padding:14px 20px;border:none;background:none;font-size:14px;color:var(--tx);cursor:pointer">✏️ Editar mensaje</button>
      <div style="height:1px;background:var(--border)"></div>
      <button onclick="eliminarMensajeChat(${id},'mio')" style="width:100%;text-align:left;padding:14px 20px;border:none;background:none;font-size:14px;color:var(--tx);cursor:pointer">🙈 Eliminar para mí</button>
      <div style="height:1px;background:var(--border)"></div>
      <button onclick="eliminarMensajeChat(${id},'todos')" style="width:100%;text-align:left;padding:14px 20px;border:none;background:none;font-size:14px;color:#9b2335;cursor:pointer">🗑️ Eliminar para todos</button>
      <div style="height:1px;background:var(--border)"></div>
      <button onclick="document.getElementById('chatMsgMenu').remove()" style="width:100%;text-align:center;padding:14px 20px;border:none;background:none;font-size:14px;color:var(--tx3);cursor:pointer">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function iniciarEdicionMensaje(id) {
  document.getElementById('chatMsgMenu')?.remove();
  const msg = _chatMensajes.find(m => m.id === id);
  if (!msg) return;

  const modal = document.createElement('div');
  modal.id = 'chatEditModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99999;display:flex;align-items:flex-end;justify-content:center';
  modal.innerHTML = `
    <div style="background:var(--surface);width:100%;max-width:400px;border-radius:16px 16px 0 0;padding:20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)">
      <div style="font-size:15px;font-weight:700;color:var(--tx);margin-bottom:12px">Editar mensaje</div>
      <textarea id="chatEditInput" style="width:100%;min-height:80px;padding:12px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:inherit;background:var(--input-bg);color:var(--tx);outline:none;resize:none">${msg.mensaje}</textarea>
      <button class="btn-save" style="margin-top:12px" onclick="confirmarEdicionMensaje(${id})">Guardar cambios</button>
      <button class="btn-cancel" onclick="document.getElementById('chatEditModal').remove()">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('chatEditInput')?.focus(), 50);
}

async function confirmarEdicionMensaje(id) {
  const nuevo = document.getElementById('chatEditInput').value.trim();
  if (!nuevo) return;
  document.getElementById('chatEditModal')?.remove();
  await apiEditarReporte(id, nuevo);
  await cargarChat();
}

async function eliminarMensajeChat(id, tipo) {
  document.getElementById('chatMsgMenu')?.remove();
  await apiEliminarReporte(id, tipo);
  await cargarChat();
}


function showLogoutConfirm() {
  const modal = document.createElement('div');
  modal.id = 'logoutModal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:28px 24px;width:100%;max-width:320px;text-align:center">
      <div style="width:52px;height:52px;background:#fef0f2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#9b2335"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
      </div>
      <div style="font-size:17px;font-weight:700;color:#18170f;margin-bottom:8px">¿Cerrar sesión?</div>
      <div style="font-size:13px;color:#9c9a92;margin-bottom:24px;line-height:1.5">Tu información está guardada en la nube y podrás volver a acceder cuando quieras.</div>
      <button onclick="confirmLogout()" style="width:100%;padding:14px;background:#9b2335;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:8px">Sí, cerrar sesión</button>
      <button onclick="document.getElementById('logoutModal').remove()" style="width:100%;padding:14px;background:transparent;color:#9c9a92;border:none;font-size:14px;cursor:pointer">Cancelar</button>
    </div>
  `;
  document.body.appendChild(modal);
}

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('mm_theme', newTheme);
  const icon = document.getElementById('darkIcon');
  if (icon) {
    icon.innerHTML = newTheme === 'dark'
      ? '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2v-2H2v2zm18 0h2v-2h-2v2zM11 2v2h2V2h-2zm0 18v2h2v-2h-2zM5.99 4.58l-1.42 1.42 1.42 1.42 1.41-1.42-1.41-1.42zm12.02 12.02l-1.41 1.41 1.41 1.42 1.42-1.42-1.42-1.41zM5.99 19.42l1.42-1.41-1.42-1.42-1.41 1.42 1.41 1.41zM18.01 4.58l-1.42 1.42 1.42 1.41 1.41-1.41-1.41-1.42z"/>'
      : '<path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>';
  }
}

function loadTheme() {
  const saved = localStorage.getItem('mm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function confirmLogout() {
  localStorage.removeItem('st_token');
  localStorage.removeItem('st_user');
  window._precLoaded = false;
  location.reload();
}

function animateNumber(elementId, from, to, duration = 600) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = performance.now();
  const update = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * ease;
    el.textContent = Math.round(current * 10) / 10;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}






function applyThemeColor(color) {
  document.documentElement.style.setProperty('--navy', color);
  document.documentElement.style.setProperty('--navy-mid', color);
  document.documentElement.style.setProperty('--header-bg', color);
  const drawerHead = document.querySelector('.drawer-head');
  if (drawerHead) drawerHead.style.background = color;
  const sw = document.getElementById('colorSwatch'); if(sw) sw.style.background = color;
  const cs = document.getElementById('customSwatch'); if(cs) cs.style.background = color;
  const cp = document.getElementById('colorPicker'); if(cp) cp.value = color;

  // Re-aplicar sticky si estamos en home
  if (currentView === 'home') {
    const list = document.getElementById('cardList');
    if (list) {
      list._stackBound = false;
      const cards = list.querySelectorAll('.card');
      cards.forEach((card, i) => {
        card.style.position = 'sticky';
        card.style.top = '8px';
        card.style.zIndex = i + 1;
      });
    }
  }
}

function updateFabVisibility() {
  const fab = document.getElementById('fabBtn');
  if (!fab) return;
  const anyOpen = ['formBg','detBg','asigFormBg','drawer'].some(id => document.getElementById(id)?.classList.contains('open'));
  fab.style.zIndex = anyOpen ? '5' : '999';
}


function applyStackEffect() {
  if (currentView !== 'home') return;
  const list = document.getElementById('cardList');
  if (!list) return;
  const cardEls = list.querySelectorAll('.card');
  if (!cardEls.length) return;

  // Limpiar spacer viejo
  const oldSp = list.querySelector('.stack-spacer');
  if (oldSp) oldSp.remove();

  // Limpiar estilos previos
  cardEls.forEach(card => {
    card.style.position = '';
    card.style.top = '';
    card.style.zIndex = '';
    card.style.opacity = '';
    card.style.transform = '';
    card.style.transition = '';
    card.style.animation = '';
    card.classList.remove('card-cascade', 'card-fade-in');
  });

  if (cfg.scrollMode === 'apilado') {
    const cardHeight = cardEls[0]?.offsetHeight || 120;
    cardEls.forEach((card, i) => {
      card.style.position = 'sticky';
      card.style.top = '8px';
      card.style.zIndex = i + 11;
    });
    if (cardEls.length > 1) {
      const spacer = document.createElement('div');
      spacer.className = 'stack-spacer';
      spacer.style.height = (cardHeight * (cardEls.length - 1)) + 'px';
      spacer.style.flexShrink = '0';
      list.appendChild(spacer);
    }
  } else if (cfg.scrollMode === 'cascada') {
    cardEls.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateX(80px)';
      card.style.transition = 'none';
    });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        cardEls.forEach((card, i) => {
          card.style.transition = 'opacity 0.5s cubic-bezier(0.16,1,0.3,1), transform 0.5s cubic-bezier(0.16,1,0.3,1)';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateX(0)';
          }, i * 100);
        });
      });
    });
  } else if (cfg.scrollMode === 'zoom') {
    if (window._zoomHandler) window.removeEventListener('scroll', window._zoomHandler);
    const onScroll = () => {
      const viewCenter = window.innerHeight / 2;
      cardEls.forEach(card => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const dist = Math.abs(viewCenter - cardCenter);
        const maxDist = window.innerHeight / 2;
        const scale = Math.max(0.88, 1 - (dist / maxDist) * 0.12);
        const opacity = Math.max(0.5, 1 - (dist / maxDist) * 0.5);
        card.style.transform = 'scale(' + scale + ')';
        card.style.opacity = String(opacity);
        card.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        card.style.transformOrigin = 'center center';
      });
    };
    window._zoomHandler = onScroll;
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(onScroll, 50);
  } else if (cfg.scrollMode === 'fade') {
    if (window._fadeObserver) window._fadeObserver.disconnect();
    window._fadeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0) scale(1)';
          }, 50);
          window._fadeObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    cardEls.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px) scale(0.97)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1)';
      card.style.transitionDelay = (i * 0.05) + 's';
      window._fadeObserver.observe(card);
    });
  }

  const fab = document.getElementById('fabBtn');
  if (fab) fab.style.zIndex = '999';
}

/* ================================================================
   INIT
================================================================ */

function updateDrawerUser() {
  const user = getUser();
  if (!user) return;
  const pic = document.getElementById('drawerUserPic');
  const initial = document.getElementById('drawerUserInitial');
  const name = document.getElementById('drawerUserName');
  const email = document.getElementById('drawerUserEmail');
  if (name) name.textContent = user.nombre || '';
  if (email) email.textContent = user.email || '';
  if (pic && user.picture) {
    pic.innerHTML = '<img src="' + user.picture + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover">';
  } else if (initial) {
    initial.textContent = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';
  }
}

function mostrarBienvenida() {
  const user = getUser();
  if (!user) return;
  const nombre = user.nombre.split(' ')[0];
  document.getElementById('det-title').textContent = '';
  document.getElementById('detBody').innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;padding:32px 24px 24px;text-align:center">'
      + '<img src="img/logoapp.png" style="width:64px;height:64px;margin-bottom:20px;border-radius:16px;box-shadow:0 4px 20px rgba(26,43,64,0.15)">'
      + '<div style="font-size:24px;font-weight:800;color:var(--navy);margin-bottom:4px">Hola, ' + nombre + '!</div>'
      + '<div style="font-size:20px;font-weight:600;color:var(--tx);margin-bottom:16px">Bienvenido a AssendApp</div>'
      + '<div style="font-size:14px;color:var(--tx3);line-height:1.7;max-width:300px">'
        + 'Nos alegra mucho que estes aqui. AssendApp fue creada pensando en ti, para que puedas llevar un registro ordenado de tus revisitas, controlar tus horas y asignaciones, y enviar tus informes sin complicaciones. Todo en un solo lugar.'
      + '</div>'
      + '<div style="display:flex;gap:12px;margin:24px 0;justify-content:center">'
        + '<div style="text-align:center;padding:14px 12px;background:var(--navy-light,#f0f4f8);border-radius:12px;min-width:80px">'
          + '<div style="width:28px;height:28px;border-radius:8px;background:var(--navy);margin:0 auto 6px;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg></div>'
          + '<div style="font-size:11px;font-weight:600;color:var(--navy)">Revisitas</div>'
        + '</div>'
        + '<div style="text-align:center;padding:14px 12px;background:var(--navy-light,#f0f4f8);border-radius:12px;min-width:80px">'
          + '<div style="width:28px;height:28px;border-radius:8px;background:var(--navy);margin:0 auto 6px;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg></div>'
          + '<div style="font-size:11px;font-weight:600;color:var(--navy)">Horas</div>'
        + '</div>'
        + '<div style="text-align:center;padding:14px 12px;background:var(--navy-light,#f0f4f8);border-radius:12px;min-width:80px">'
          + '<div style="width:28px;height:28px;border-radius:8px;background:var(--navy);margin:0 auto 6px;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="#fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>'
          + '<div style="font-size:11px;font-weight:600;color:var(--navy)">Informes</div>'
        + '</div>'
      + '</div>'
    + '</div>'
    + '<div style="padding:0 24px 24px">'
      + '<div style="font-size:14px;font-weight:700;color:var(--tx);margin-bottom:8px">Cuentanos, de que congregacion eres?</div>'
      + '<input id="bienvenidaCongregacion" type="text" placeholder="" style="text-transform:uppercase;width:100%;padding:14px 16px;border:1.5px solid var(--border);border-radius:14px;font-size:14px;font-family:inherit;background:var(--input-bg);color:var(--tx);outline:none;box-sizing:border-box" />'
      + '<button class="btn-save" style="margin-top:16px;border-radius:14px;padding:16px;font-size:15px" onclick="guardarBienvenida()">Comenzar</button>'
    + '</div>';
  document.getElementById('detBg').classList.add('open');
  const fab = document.getElementById('fabBtn'); if (fab) fab.style.display = 'none';
}

async function guardarBienvenida() {
  const congregacion = document.getElementById('bienvenidaCongregacion').value.trim();
  if (congregacion) {
    try {
      const token = getToken();
      await fetch(API_URL + '/auth/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ congregacion })
      });
      const user = getUser();
      if (user) { user.congregacion = congregacion; saveSession(token, user); }
    } catch(e) {}
  }
  localStorage.setItem('st_welcomed', '1');
  closeDet();
  updateDrawerUser();
  const fab = document.getElementById('fabBtn'); if (fab) fab.style.display = '';
}

async function init() {
  loadTheme();
  await loadCfg();
  prec.mes    = mesKey();
  informe.mes = mesKey();
  await loadPrec();
  await loadInforme();
  await loadInformeHist();
  await loadAsig();
  await loadTiposPersonalizados();
  const loaded = await loadCards();
  if (!loaded) { cards = DEMO; nextId = 100; await saveCards(); }
  loadThemeColor();
  applyLang();

  // ← CAMBIA goTo('home') POR ESTO:
  const hash = window.location.hash.replace('#', '');
  if (hash && ['home','precursorado','informe','asignaciones','history','settings'].includes(hash)) {
    goTo(hash);
  } else {
    goTo('home');
  }

  updateStats();
  renderList();
  schedInformeNotif();
  updateUserPosition();
  updateDrawerUser();
  if (!localStorage.getItem('st_welcomed')) { setTimeout(() => mostrarBienvenida(), 800); }
  
  const splash = document.getElementById('splashLoader');
  if (splash) { splash.style.transition = 'opacity .3s'; splash.style.opacity = '0'; setTimeout(() => splash.remove(), 300); }

  window.addEventListener('mm:notification-tapped', function(e) {
    const cardId = e.detail.cardId;
    
    if (!cardId) return;

    // Asignaciones
    if (cardId.startsWith('asig-')) {
      const id = parseInt(cardId.replace('asig-', ''));
      goTo('asignaciones');
      setTimeout(() => openAsigDet(id), 300);
      return;
    }

    // Recordatorio de horas / informe mensual
    if (cardId === 'informe-mensual' || cardId.startsWith('horas-')) {
      goTo('precursorado');
      return;
    }

    // Revisitas o estudios — va a inicio y abre la card
    if (!isNaN(parseInt(cardId))) {
      goTo('home');
      setTimeout(() => openDet(parseInt(cardId)), 300);
      return;
    }
  });

  setTimeout(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      if (p === 'granted') { await schedAll(); toast(t('notif_on')); }
    }
  }, 4000);
}

function refreshUserPicture() {}

// Guardar parametro de compartir antes del login
const pendingShare = new URLSearchParams(window.location.search).get('c');
if (pendingShare) localStorage.setItem('pendingShare', pendingShare);

if (!isLoggedIn()) {
  document.getElementById('splashLoader')?.remove();
  showAuthScreen();
} else {
  registerSW().then(() => {
    init();
    subscribeToPush();
    refreshUserPicture();
    // Verificar si hay un share pendiente (de antes del login)
    const saved = localStorage.getItem('pendingShare');
    if (saved) {
      localStorage.removeItem('pendingShare');
      window.history.replaceState({}, '', window.location.pathname);
      try {
        const d = JSON.parse(decodeURIComponent(escape(atob(saved))));
        if (d.nombre) showImportPanel(d);
      } catch(e) {}
    } else {
      checkUrlImport();
    }
  });
}
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
let currentView = 'dashboard';

let cfg = {
  diasAntes:  1,
  horasAntes: 2,
  activo:     true,
  vibrar:     true,
  sonido:     true,
  orden:      'fecha',
  idioma:     'es',
  scrollMode: 'normal',
  cardColorLetra: false,
  mostrarDir: true,
  mostrarDist: true,
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
    inicio:'Inicio', cursos_revisitas:'Cursos y Revisitas', precursorado:'Precursorado',
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
    inicio:'Home', cursos_revisitas:'Courses & Return Visits', precursorado:'Precursor',
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
    dashboard: 'Mi Ministerio', home: t('cursos_revisitas'), precursorado: t('precursorado'),
    informe: t('informe_titulo'),asignaciones: 'Asignaciones', calendario: 'Calendario', history: t('historial'), settings: t('ajustes'),
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
  const navMap = { dashboard:'inicio', home:'cursos_revisitas', precursorado:'precursorado', informe:'informe_titulo', history:'historial', settings:'ajustes' };
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
    const token = localStorage.getItem('st_token');
    const [data, historialCompleto] = await Promise.all([
      apiGetPersonas(),
      fetch(API_URL + '/personas/visitas/historial', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(function(r){ return r.ok ? r.json() : []; })
        .catch(function(e){ console.error('Error cargando historial de visitas:', e); return []; })
    ]);

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
        recordatorio_tipo: p.recordatorio_tipo || 'una_vez',
        territorio: p.territorio || '',
        historial: []
      }));

      historialCompleto.forEach(function(v) {
        const card = cards.find(function(c){ return c.id === v.persona_id; });
        if (card) {
          card.historial.push({
            fecha: v.fecha ? v.fecha.split('T')[0] : '',
            hora: v.hora ? v.hora.substring(0,5) : '',
            nota: v.notas || 'Visita realizada',
            resultado: v.resultado || 'visitado'
          });
        }
      });

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
      recordatorios_minutos: cfg.recordatoriosMinutos || [60],
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
  if (localCfg && localCfg.cardColorLetra !== undefined) cfg.cardColorLetra = localCfg.cardColorLetra;
  if (localCfg && localCfg.mostrarDir !== undefined) cfg.mostrarDir = localCfg.mostrarDir;
  if (localCfg && localCfg.mostrarDist !== undefined) cfg.mostrarDist = localCfg.mostrarDist;
  try {
    const data = await apiGetAjustes();
    if (data && data.id) {
      cfg.activo = data.notificaciones;
      cfg.vibrar = data.vibrar;
      cfg.sonido = data.sonido;
      cfg.horasAntes = Math.round((data.minutos_antes || 60) / 60);
      cfg.recordatoriosMinutos = Array.isArray(data.recordatorios_minutos) && data.recordatorios_minutos.length ? data.recordatorios_minutos : [60];
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
function aplicarInforme(data) {
  try {
    const autoCursos = contarCursosVisitadosEsteMes();
    if (Array.isArray(data) && data.length > 0) {
      const mesActual = new Date().getMonth() + 1;
      const añoActual = new Date().getFullYear();
      const actual = data.find(i => i.mes === mesActual && i.anio === añoActual);
      if (actual) {
        informe.cursos = Math.max(actual.cursos_biblicos || 0, autoCursos);
        informe.participo = actual.revisitas > 0;
      } else {
        informe.cursos = autoCursos;
      }
    } else {
      informe.cursos = autoCursos;
    }
    informe.mes = mesKey();
  } catch(err) {
    console.error('Error cargando informe:', err);
    informe.mes = mesKey();
  }
}
async function loadInforme() { aplicarInforme(await apiGetInformes().catch(function(){ return []; })); }
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
function aplicarInformeHist(data) {
  try {
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
async function loadInformeHist() { aplicarInformeHist(await apiGetInformes().catch(function(){ return []; })); }

async function avanzarRecordatoriosSemanal() {
  const hoy = today();
  const hoyD = new Date(); hoyD.setHours(0,0,0,0);
  for (const c of cards) {
    if (c.recordatorio_tipo === 'semanal' && c.fecha && c.fecha < hoy) {
      let fecha = new Date(c.fecha + 'T00:00:00');
      while (fecha < hoyD) fecha.setDate(fecha.getDate() + 7);
      const nueva = fecha.getFullYear() + '-' + String(fecha.getMonth()+1).padStart(2,'0') + '-' + String(fecha.getDate()).padStart(2,'0');
      try {
        await apiUpdatePersona(c.id, {
          nombre: c.nombre, direccion: c.dir, telefono: c.tel,
          gps_lat: c.lat, gps_lng: c.lng, tipo: c.tipo, estado: c.estado,
          notas: c.notas, proxima_visita: nueva, proxima_visita_hora: c.hora || null,
          pub: c.pub, recordatorio_tipo: 'semanal'
        });
        c.fecha = nueva;
      } catch(e) { console.error('Error avanzando recordatorio semanal:', e); }
    }
  }
}

/* ================================================================
   UTILIDADES
================================================================ */
function today()  { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function mesKey() { var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
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
function avaColor(n) {
  var colors = {
    A:'#2e6be6', B:'#7b1fa2', C:'#27ae60', D:'#e65100', E:'#c62828',
    F:'#1565c0', G:'#00838f', H:'#558b2f', I:'#6a1b9a', J:'#ef6c00',
    K:'#283593', L:'#00695c', M:'#ad1457', N:'#4527a0', O:'#2e7d32',
    P:'#d84315', Q:'#1a237e', R:'#bf360c', S:'#00897b', T:'#6d4c41',
    U:'#5c6bc0', V:'#8e24aa', W:'#43a047', X:'#e53935', Y:'#f4511e',
    Z:'#3949ab'
  };
  var letter = n.trim().charAt(0).toUpperCase();
  return colors[letter] || '#1a2b40';
}
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
  var drawer = document.getElementById('drawer');
  var scrim = document.getElementById('drawerScrim');
  drawer.classList.toggle('open');
  scrim.classList.toggle('open');
}
function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawerScrim').classList.remove('open');
  const fab = document.getElementById('fabBtn');
  if (fab) fab.classList.remove('fab-hidden');
  updateFabVisibility();
}

const RUTA_POR_VISTA = {
  dashboard: 'inicio', home: 'cursos-y-revisitas', precursorado: 'precursorado/horas',
  informe: 'informe', asignaciones: 'asignaciones', history: 'historial',
  settings: 'ajustes', calendario: 'calendario', horario: 'precursorado/horario'
};
const VISTA_POR_RUTA = {};
Object.keys(RUTA_POR_VISTA).forEach(function(v){ VISTA_POR_RUTA[RUTA_POR_VISTA[v]] = v; });

function goTo(view, skipHistoryPush) {
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
  const enMoreSheet = ['precursorado','history','settings'].includes(view);
  document.getElementById('dnav-more')?.classList.toggle('active', enMoreSheet);
  document.getElementById('hdrTitle').textContent = getViewTitle(view);
  renderView(view);
  if (view === 'home') renderList();

  const fab = document.getElementById('fabBtn');
  if (fab) {
    fab.style.display = view === 'home' ? '' : 'none';
    fab.style.visibility = view === 'home' ? 'visible' : 'hidden';}

    const rutaNueva = RUTA_POR_VISTA[view] || view;
    if (!skipHistoryPush) {
      history.pushState({ view: view }, '', '/' + rutaNueva);
    }
    setTimeout(enforceViewVisibility, 320);
}

let _dbCalMes = new Date().getMonth();
let _dbCalAnio = new Date().getFullYear();
let _dbCalAnimarEntrada = false;

function dbCalNav(dir) {
  _dbCalMes += dir;
  if (_dbCalMes > 11) { _dbCalMes = 0; _dbCalAnio++; }
  if (_dbCalMes < 0)  { _dbCalMes = 11; _dbCalAnio--; }
  _dbCalAnimarEntrada = true;
  buildDashboard();
  _dbCalAnimarEntrada = false;

  requestAnimationFrame(function(){
    const calCard = document.getElementById('dbCalCard');
    if (calCard) {
      calCard.style.transition = 'transform .3s cubic-bezier(.34,1.1,.64,1), opacity .3s ease';
      calCard.style.transform = 'translateY(0)';
      calCard.style.opacity = '1';
    }
  });

  setTimeout(function(){
    const carr = document.getElementById('dbCarrusel');
    if (carr) carr.scrollLeft = carr.offsetWidth;
  }, 30);
}

function dbAbrirDiaCal(fecha) {
  const visitas = cards.filter(function(c){ return c.fecha === fecha; });
  const histDia = [];
  cards.forEach(function(c){ if (c.historial) c.historial.forEach(function(h){ if (h.fecha === fecha) histDia.push({c:c, h:h}); }); });
  let asigDia = [];
  try { asigDia = asignaciones.filter(function(a){ return a.fecha === fecha; }); } catch(e){}

  const partes = fecha.split('-');
  const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaFmt = parseInt(partes[2]) + ' de ' + MESES_L[parseInt(partes[1])-1] + ' ' + partes[0];

  let contenido = '';

  if (visitas.length) {
    contenido += '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Visitas programadas</div>';
    visitas.forEach(function(c){
      const bInfo = badge(c.estado);
      contenido += '<div style="display:flex;align-items:center;gap:9px;padding:9px;background:var(--bg);border-radius:11px;margin-bottom:7px;cursor:pointer" onclick="dbCerrarModalDia();setTimeout(function(){openDet(' + c.id + ');},200)">'
        + '<div class="ava" style="width:28px;height:28px;font-size:11px;background:' + avaColor(c.nombre) + '">' + initials(c.nombre) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--tx)">' + c.nombre + '</div><div style="font-size:10px;color:var(--tx3)">' + (c.hora||'sin hora') + '</div></div>'
        + '<span class="badge ' + bInfo[0] + '" style="font-size:8px">' + bInfo[1] + '</span>'
      + '</div>';
    });
  }

  if (histDia.length) {
    contenido += '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Visitas realizadas</div>';
    histDia.forEach(function(item){
      contenido += '<div style="display:flex;align-items:center;gap:9px;padding:9px;background:#edf7ef;border-radius:11px;margin-bottom:7px;cursor:pointer" onclick="dbCerrarModalDia();setTimeout(function(){openDet(' + item.c.id + ');},200)">'
        + '<div class="ava" style="width:28px;height:28px;font-size:11px;background:' + avaColor(item.c.nombre) + '">' + initials(item.c.nombre) + '</div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--tx)">' + item.c.nombre + '</div><div style="font-size:10px;color:var(--tx3)">' + (item.h.nota||'Visitado') + '</div></div>'
      + '</div>';
    });
  }

  if (asigDia.length) {
    contenido += '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Asignaciones</div>';
    asigDia.forEach(function(a){
      const tipoCustomDia = tiposPersonalizados.find(t => t.id === a.tipo);
      const nombreDia = tipoCustomDia ? tipoCustomDia.nombre : (TIPOS_PARTE[a.tipo] || a.tipo);
      const cc = tipoCustomDia
        ? { bg: tipoCustomDia.seccion==='tesoros' ? '#eef7f8' : tipoCustomDia.seccion==='maestros' ? '#fff8ee' : tipoCustomDia.seccion==='cristiana' ? '#fdf0f0' : '#f1f2f4' }
        : (TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' });
      contenido += '<div style="display:flex;align-items:center;gap:9px;padding:9px;background:var(--bg);border-radius:11px;margin-bottom:7px;cursor:pointer" onclick="dbCerrarModalDia();setTimeout(function(){openAsigDet(' + a.id + ');},200)">'
        + '<div style="width:28px;height:28px;border-radius:9px;background:' + cc.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:5px;overflow:hidden"><img src="' + dbImgAsig(a) + '" style="width:100%;height:100%;object-fit:contain"/></div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:var(--tx)">' + nombreDia + '</div></div>'
        + (a.completada ? '<span class="badge b-reg" style="font-size:8px">✔</span>' : '')
      + '</div>';
    });
  }

  let recDia = [];
  try { recDia = recordatoriosPersonales.filter(function(r){ return r.fecha && r.fecha.split('T')[0] === fecha; }); } catch(e){}

  if (recDia.length) {
    contenido += '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin:10px 0 6px">Personal</div>';
    recDia.forEach(function(r){
      const ic = RECORDATORIO_ICONOS[r.icono] || RECORDATORIO_ICONOS.pin;
      contenido += '<div style="display:flex;align-items:center;gap:9px;padding:9px;background:' + ic.bg + ';border-radius:11px;margin-bottom:7px">'
        + '<div style="width:28px;height:28px;border-radius:9px;background:var(--card-bg);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="15" height="15" fill="' + ic.color + '">' + ic.svg + '</svg></div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;color:' + ic.color + '">' + r.titulo + '</div>' + (r.descripcion ? '<div style="font-size:10px;color:var(--tx3)">' + r.descripcion + '</div>' : '') + '</div>'
      + '</div>';
    });
  }

  if (!visitas.length && !histDia.length && !asigDia.length && !recDia.length) {
    contenido = '<div style="text-align:center;padding:16px 4px;color:var(--tx3);font-size:12.5px">Sin actividad</div>';
  }

  const old = document.getElementById('dbDiaModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'dbDiaModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(2px);padding:24px';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;width:100%;max-width:320px;max-height:78vh;overflow-y:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:dcPopIn .25s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:12px">' + fechaFmt + '</div>'
    + contenido
    + '<div style="display:flex;gap:8px;margin-top:14px">'
      + '<button onclick="dbElegirTipoAgregar(&quot;' + fecha + '&quot;)" style="flex:1;padding:12px;border:none;background:var(--navy);color:#fff;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">Agregar</button>'
      + '<button onclick="dbCerrarModalDia()" style="flex:1;padding:12px;border:1.5px solid #e53935;background:transparent;color:#e53935;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">Cancelar</button>'
    + '</div>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}

function dbCerrarModalDia() {
  const m = document.getElementById('dbDiaModal');
  if (m) m.remove();
}

function dbElegirTipoAgregar(fecha) {
  dbCerrarModalDia();
  const old = document.getElementById('dbTipoModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'dbTipoModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(2px);padding:24px';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;width:100%;max-width:300px;padding:20px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:dcPopIn .25s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:4px">¿Qué quieres agregar?</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:16px">' + fecha + '</div>'
    + '<button onclick="document.getElementById(&quot;dbTipoModal&quot;).remove();openForm();setTimeout(function(){var f=document.getElementById(&quot;fFecha&quot;);if(f)f.value=&quot;' + fecha + '&quot;;},50)" style="width:100%;padding:13px;border:none;background:var(--navy-light);color:var(--navy);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px">Revisita / Estudio</button>'
    + '<button onclick="dbElegirTipoAsignacion(&quot;' + fecha + '&quot;)" style="width:100%;padding:13px;border:none;background:#f3e5f5;color:#7b1fa2;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px">Asignación</button>'
    + '<button onclick="document.getElementById(&quot;dbTipoModal&quot;).remove();dbAbrirOtraAsignacion(&quot;' + fecha + '&quot;)" style="width:100%;padding:13px;border:none;background:#fff3e0;color:#e65100;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:8px">Otra asignación</button>'
    + '<button onclick="document.getElementById(&quot;dbTipoModal&quot;).remove()" style="width:100%;padding:11px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function dbElegirTipoAsignacion(fecha) {
  document.getElementById('dbTipoModal')?.remove();
  const SECCIONES = [
    { id:'tesoros', nombre:'Tesoros de la Biblia', color:'#2e7d8a', bg:'#eef7f8', tipos:['discurso10','perlas','lectura'] },
    { id:'maestros', nombre:'Seamos Mejores Maestros', color:'#a0660a', bg:'#fff8ee', tipos:['conversacion','revisitas','discipulos','discurso'] },
  ];
  let lista = '';
  SECCIONES.forEach(function(sec){
    lista += '<div style="font-size:10px;font-weight:700;color:' + sec.color + ';text-transform:uppercase;letter-spacing:.04em;margin:10px 0 6px;text-align:left">' + sec.nombre + '</div>';
    sec.tipos.forEach(function(tipo){
      lista += '<button onclick="document.getElementById(&quot;dbAsigTipoModal&quot;).remove();openAsigForm(&quot;' + tipo + '&quot;,null,&quot;' + fecha + '&quot;)" style="width:100%;text-align:left;padding:10px 12px;border:none;background:' + sec.bg + ';color:' + sec.color + ';border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;margin-bottom:6px">' + TIPOS_PARTE[tipo] + '</button>';
    });
    (tiposPersonalizados || []).filter(function(t){ return t.seccion === sec.id; }).forEach(function(t){
      lista += '<button onclick="document.getElementById(&quot;dbAsigTipoModal&quot;).remove();openAsigForm(&quot;' + t.id + '&quot;,null,&quot;' + fecha + '&quot;)" style="width:100%;text-align:left;padding:10px 12px;border:none;background:' + sec.bg + ';color:' + sec.color + ';border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;margin-bottom:6px">' + t.nombre + '</button>';
    });
  });
  const modal = document.createElement('div');
  modal.id = 'dbAsigTipoModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(2px);padding:24px';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;width:100%;max-width:320px;max-height:78vh;overflow-y:auto;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:dcPopIn .25s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:2px">Tipo de asignación</div>'
    + lista
    + '<button onclick="document.getElementById(&quot;dbAsigTipoModal&quot;).remove()" style="width:100%;padding:11px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;margin-top:6px">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

let _dbHorasDiariasCachePorMes = {};
let _dbMesVista = null;
let _dbAnioVista = null;
async function dbCargarHorasDiarias(mesParam, anioParam) {
  const hoyD = new Date();
  const mesObj = mesParam || (hoyD.getMonth()+1);
  const anioObj = anioParam || hoyD.getFullYear();
  const claveMes = anioObj + '-' + String(mesObj).padStart(2,'0');
  if (_dbHorasDiariasCachePorMes[claveMes]) return;
  try {
    const token = localStorage.getItem('st_token');
    const res = await fetch(API_URL + '/precursorado/horas/diario?mes=' + mesObj + '&anio=' + anioObj, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { console.warn('[Dashboard] endpoint horas/diario no disponible todavía (status ' + res.status + ')'); return; }
    const data = await res.json();
    const map = {};
    if (Array.isArray(data)) {
      data.forEach(function(r){
        const f = String(r.fecha || '').split('T')[0];
        map[f] = parseFloat(r.horas) || 0;
      });
    }
    _dbHorasDiariasCachePorMes[claveMes] = map;
    if (currentView === 'dashboard' && !document.getElementById('splashLoader')) {
      const carr1El = document.getElementById('dbCarrusel');
      const carr2El = document.getElementById('dbCarrusel2');
      const scroll1 = carr1El ? carr1El.scrollLeft : 0;
      const scroll2 = carr2El ? carr2El.scrollLeft : 0;
      buildDashboard();
      setTimeout(function(){
        const c1 = document.getElementById('dbCarrusel'); if (c1) c1.scrollLeft = scroll1;
        const c2 = document.getElementById('dbCarrusel2'); if (c2) c2.scrollLeft = scroll2;
      }, 20);
    }
  } catch(err) {
    console.error('Error cargando horas diarias:', err);
  }
}

let _dbAnioCalSel = null;

function dbAbrirSelectorMes() {
  const hoyD = new Date();
  _dbAnioCalSel = _dbAnioVista || hoyD.getFullYear();
  dbRenderSelectorMes();
}

function dbNavAnioSel(dir) {
  _dbAnioCalSel += dir;
  dbRenderSelectorMes();
}

function dbRenderSelectorMes() {
  const hoyD = new Date();
  const MESES_ABR = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const mesActualReal = hoyD.getMonth()+1, anioActualReal = hoyD.getFullYear();
  const anioMax = anioActualReal;

  let grid = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px">';
  for (let m = 1; m <= 12; m++) {
    const esFuturo = (_dbAnioCalSel > anioMax) || (_dbAnioCalSel === anioMax && m > mesActualReal);
    const esActual = (m === mesActualReal && _dbAnioCalSel === anioActualReal);
    const esSel = _dbMesVista ? (_dbMesVista === m && _dbAnioVista === _dbAnioCalSel) : esActual;
    let bg = 'var(--bg)', color = 'var(--tx)', border = '1px solid var(--border)';
    if (esFuturo) { color = 'var(--border-dk)'; }
    if (esSel) { bg = 'var(--navy)'; color = '#fff'; border = '1px solid var(--navy)'; }
    else if (esActual) { border = '1.5px solid var(--navy)'; color = 'var(--navy)'; }
    grid += '<div ' + (esFuturo ? '' : 'onclick="dbSeleccionarMes(' + m + ',' + _dbAnioCalSel + ')"') + ' style="padding:14px 4px;border-radius:12px;background:'+bg+';color:'+color+';border:'+border+';text-align:center;font-size:13px;font-weight:700;cursor:'+(esFuturo?'default':'pointer')+'">' + MESES_ABR[m-1] + '</div>';
  }
  grid += '</div>';

  const old = document.getElementById('dbMesModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'dbMesModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(2px);padding:24px';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;width:100%;max-width:320px;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:dcPopIn .25s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="padding:16px 16px 4px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
        + '<div style="font-size:15px;font-weight:700;color:var(--tx)">Seleccionar mes</div>'
        + '<button onclick="document.getElementById(\'dbMesModal\').remove()" style="width:28px;height:28px;border-radius:50%;border:none;background:var(--s2);color:var(--tx2);cursor:pointer;font-size:13px;flex-shrink:0">✕</button>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--tx3);margin-top:4px">Solo el gráfico de horas y su total cambian</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">'
        + '<button onclick="dbNavAnioSel(-1)" style="width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--tx)"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>'
        + '<div style="font-size:16px;font-weight:800;color:var(--tx)">' + _dbAnioCalSel + '</div>'
        + '<button onclick="dbNavAnioSel(1)" ' + (_dbAnioCalSel >= anioMax ? 'style="opacity:.3;pointer-events:none"' : '') + ' style="width:32px;height:32px;border-radius:9px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--tx)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>'
      + '</div>'
    + '</div>'
    + '<div style="padding:0 16px 18px">' + grid + '</div>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}

function dbSeleccionarMes(mes, anio) {
  const hoyD = new Date();
  if (mes === hoyD.getMonth()+1 && anio === hoyD.getFullYear()) {
    _dbMesVista = null; _dbAnioVista = null;
  } else {
    _dbMesVista = mes; _dbAnioVista = anio;
  }
  // Sincronizar también el "Calendario rápido" con el mismo mes seleccionado
  _dbCalMes = mes - 1;
  _dbCalAnio = anio;
  const modal = document.getElementById('dbMesModal');
  if (modal) modal.remove();
  buildDashboard();
}

let _horasCalMes = new Date().getMonth();
let _horasCalAnio = new Date().getFullYear();

function dbNavCalendarioHoras(dir) {
  _horasCalMes += dir;
  if (_horasCalMes > 11) { _horasCalMes = 0; _horasCalAnio++; }
  if (_horasCalMes < 0)  { _horasCalMes = 11; _horasCalAnio--; }
  dbAbrirCalendarioHoras(true);
}

async function dbAbrirCalendarioHoras(mantenerMes) {
  if (!mantenerMes) {
    _horasCalMes = new Date().getMonth();
    _horasCalAnio = new Date().getFullYear();
  }
  const claveMesCal = _horasCalAnio + '-' + String(_horasCalMes+1).padStart(2,'0');
  if (!_dbHorasDiariasCachePorMes[claveMesCal]) {
    await dbCargarHorasDiarias(_horasCalMes+1, _horasCalAnio);
  }
  const anio = _horasCalAnio;
  const mesN = _horasCalMes;
  const diasSemana = ['L','M','M','J','V','S','D'];
  let primerDia = new Date(anio, mesN, 1).getDay();
  primerDia = primerDia === 0 ? 6 : primerDia - 1;
  const diasEnMes = new Date(anio, mesN+1, 0).getDate();
  const hoyStr = today();
  const cache = _dbHorasDiariasCachePorMes[claveMesCal] || {};

  let grid = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-top:10px">';
  diasSemana.forEach(function(d){ grid += '<div style="text-align:center;font-size:10px;font-weight:700;color:var(--tx3)">'+d+'</div>'; });
  for (let i=0;i<primerDia;i++) grid += '<div></div>';
  for (let d=1; d<=diasEnMes; d++) {
    const key = anio+'-'+String(mesN+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const esFuturo = key > hoyStr;
    const horasDia = cache[key] || 0;
    const esHoy = key === hoyStr;
    let bg = 'transparent', color = 'var(--tx)';
    if (esFuturo) { color = 'var(--border-dk)'; }
    else if (horasDia > 0) { bg = '#f3e5f5'; color = '#7b1fa2'; }
    if (esHoy) { bg = 'var(--navy)'; color = '#fff'; }
    grid += '<div ' + (esFuturo ? '' : 'onclick="dbSeleccionarDiaHoras(&quot;'+key+'&quot;)"') + ' style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:9px;font-size:11px;font-weight:'+(esHoy?'800':'600')+';background:'+bg+';color:'+color+';cursor:'+(esFuturo?'default':'pointer')+'">'
      + d
      + (horasDia > 0 ? '<span style="font-size:7px;font-weight:700;opacity:.8">'+horasDia+'h</span>' : '')
    + '</div>';
  }
  grid += '</div>';

  const MESES_CAL_HORAS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const esMesActualCal = (anio === new Date().getFullYear() && mesN === new Date().getMonth());
  const headerNavCal = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">'
    + '<button onclick="dbNavCalendarioHoras(-1)" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="14" height="14" fill="var(--tx)"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>'
    + '<div style="font-size:13px;font-weight:800;color:var(--tx)">' + MESES_CAL_HORAS[mesN] + ' ' + anio + '</div>'
    + '<button onclick="dbNavCalendarioHoras(1)" ' + (esMesActualCal ? 'style="opacity:.3;pointer-events:none;width:30px;height:30px"' : 'style="width:30px;height:30px;border-radius:8px;border:1px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center"') + '><svg viewBox="0 0 24 24" width="14" height="14" fill="var(--tx)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>'
  + '</div>';

  const detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Registrar horas';
  const accesosRapidos = esMesActualCal
    ? ('<div style="display:flex;gap:8px;margin-top:12px">'
        + '<button onclick="closeDet();addH(2)" style="flex:1;padding:12px;border:1.5px solid var(--navy-bd);background:var(--navy-light);color:var(--navy);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">+ 2 horas</button>'
        + '<button onclick="closeDet();addH(3)" style="flex:1;padding:12px;border:1.5px solid var(--navy-bd);background:var(--navy-light);color:var(--navy);border-radius:12px;font-size:13px;font-weight:700;cursor:pointer">+ 3 horas</button>'
      + '</div>'
      + '<button onclick="dbSeleccionarDiaHoras(&quot;' + hoyStr + '&quot;)" style="width:100%;margin-top:8px;padding:12px;border:1.5px dashed var(--border);background:transparent;color:var(--tx2);border-radius:12px;font-size:13px;font-weight:600;cursor:pointer">Registrar manual</button>')
    : '';
  document.getElementById('detBody').innerHTML =
    headerNavCal
    + accesosRapidos
    + '<div style="font-size:12px;color:var(--tx3);margin-top:12px">Toca un día para registrar u agregar horas</div>'
    + '<div style="border-top:1px solid var(--border);margin:14px 0"></div>'
    + grid
    + '<div style="border-top:1px solid var(--border);margin:16px 0 4px"></div>'
    + '<button class="btn-cancel" onclick="closeDet()">Cerrar</button>';
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  detBg.classList.add('open');
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
  updateFabVisibility();
}

function dbSeleccionarDiaHoras(fecha) {
  const partes = fecha.split('-');
  const MESES_L = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaFmt = parseInt(partes[2]) + ' de ' + MESES_L[parseInt(partes[1])-1];

  const ITEM_H = 44;
  const horasVals = []; for (let i=0;i<=12;i++) horasVals.push(i);
  const minutosVals = []; for (let i=0;i<60;i+=5) minutosVals.push(i);

  function filaHtml(v, align) {
    return '<div class="notif-rueda-item" data-val="' + v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:' + align + ';padding:0 14px;font-size:19px;font-weight:600;color:var(--tx3);scroll-snap-align:center">' + (typeof v === 'number' && v < 10 ? '0'+v : v) + '</div>';
  }
  const filasHoras = horasVals.map(function(v){ return filaHtml(v, 'flex-end'); }).join('');
  const filasMinutos = minutosVals.map(function(v){ return filaHtml(v, 'flex-start'); }).join('');

  document.getElementById('detBody').innerHTML =
    '<div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:14px">' + fechaFmt + '</div>'
    + '<div style="background:var(--card-bg);border-radius:14px;overflow:hidden">'
      + '<div style="position:relative;display:flex;align-items:center;justify-content:center">'
        + '<div style="position:absolute;top:' + ITEM_H + 'px;left:8px;right:8px;height:' + ITEM_H + 'px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);pointer-events:none;z-index:1"></div>'
        + '<div id="horasDiaRuedaH" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:70px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="0">' + filasHoras + '</div>'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx3);padding:0 4px">h</div>'
        + '<div id="horasDiaRuedaM" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:70px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="0">' + filasMinutos + '</div>'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx3);padding:0 10px 0 4px">min</div>'
      + '</div>'
      + '<button onclick="dbRegistrarHorasDiaDesdeRueda(&quot;'+fecha+'&quot;)" style="width:calc(100% - 24px);margin:12px;padding:12px;border:none;background:var(--navy);color:#fff;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Agregar</button>'
    + '</div>'
    + '<button class="btn-cancel" onclick="dbAbrirCalendarioHoras()">← Volver al calendario</button>';

  ['horasDiaRuedaH', 'horasDiaRuedaM'].forEach(function(id){
    const el = document.getElementById(id);
    el.addEventListener('scroll', function(){
      dbActualizarRuedaSeleccion(el);
    }, { passive: true });
    setTimeout(function(){ dbActualizarRuedaSeleccion(el); }, 50);
  });
}

async function dbRegistrarHorasDiaDesdeRueda(fecha) {
  const h = parseInt(document.getElementById('horasDiaRuedaH').dataset.valor || '0');
  const m = parseInt(document.getElementById('horasDiaRuedaM').dataset.valor || '0');
  const total = Math.round((h + m/60) * 100) / 100;
  if (total <= 0) { toast('Elige al menos algo de tiempo'); return; }
  await dbRegistrarHorasDia(fecha, total);
}

async function dbRegistrarHorasDia(fecha, horas) {
  try {
    const token = localStorage.getItem('st_token');
    const res = await fetch(API_URL + '/precursorado/horas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ horas: horas, fecha: fecha })
    });
    const data = await res.json();
    if (fecha.startsWith(mesKey()) && data && typeof data.total === 'number') {
      prec.horas = data.total;
    }
    delete _dbHorasDiariasCachePorMes[fecha.slice(0,7)];
    toast('✔ ' + horas + 'h registradas el ' + fecha.split('-')[2] + '/' + fecha.split('-')[1]);
    closeDet();
    await dbCargarHorasDiarias();
    if (currentView === 'dashboard') buildDashboard();
  } catch(err) {
    toast('Error al registrar horas');
    console.error(err);
  }
}

function buildDashboard() {
  const el = document.getElementById('dashboardBody');
  if (!el) return;

  const mes = mesKey();
  const hoy = today();
  const _metaPublicadorActivaDb = localStorage.getItem('metaPublicadorActiva') === '1';
  const esPrecursor = prec.tipo === 'auxiliar' || prec.tipo === 'regular' || prec.tipo === 'especial' || _metaPublicadorActivaDb;
  const metaHoras = prec.tipo==='regular' ? prec.metaReg : prec.tipo==='especial' ? prec.metaEsp : prec.tipo==='auxiliar' ? prec.metaAux : (parseInt(localStorage.getItem('metaPublicadorHoras')) || 20);
  const pctHoras = esPrecursor ? Math.min(100, metaHoras>0 ? Math.round(prec.horas/metaHoras*100) : 0) : 0;

  const revisitasPend = cards.filter(function(c){return c.tipo==='revisita';}).length;
  const estudiosActivos = cards.filter(function(c){return c.tipo==='estudio';}).length;
  let asigCompMes = 0;
  try { asigCompMes = asignaciones.filter(function(a){return a.completada && a.fecha && a.fecha.startsWith(mes);}).length; } catch(e){}

  /* ── 1. GRÁFICO DONUT ── */
  const segmentos = [];
  if (esPrecursor && prec.horas > 0) segmentos.push({val:prec.horas, id:'dbH', label:'Horas', color:'#7b1fa2', num: prec.horas + '<span style="font-size:11px;font-weight:600;color:var(--tx3)">h</span>', grad:'linear-gradient(135deg,#ab47bc,#7b1fa2)', shadow:'rgba(123,31,162,.25)'});
  if (revisitasPend > 0) segmentos.push({val:revisitasPend, id:'dbR', label:'Revisitas', color:'#1565c0', num:''+revisitasPend, grad:'linear-gradient(135deg,#42a5f5,#1565c0)', shadow:'rgba(21,101,192,.25)'});
  if (estudiosActivos > 0) segmentos.push({val:estudiosActivos, id:'dbE', label:'Estudios', color:'#1b5e20', num:''+estudiosActivos, grad:'linear-gradient(135deg,#66bb6a,#1b5e20)', shadow:'rgba(27,94,32,.25)'});
  if (asigCompMes > 0) segmentos.push({val:asigCompMes, id:'dbA', label:'Partes', color:'#e65100', num:''+asigCompMes, grad:'linear-gradient(135deg,#ffb74d,#e65100)', shadow:'rgba(230,81,0,.25)'});

  const totalDonut = segmentos.reduce(function(a,s){return a+s.val;}, 0);

  function dbPolar(cx, cy, r, angleDeg) {
    const a = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  function dbWedge(cx, cy, r, startAngle, endAngle) {
    if (endAngle - startAngle >= 359.9) {
      return "M " + cx + " " + (cy - r) + " A " + r + " " + r + " 0 1 1 " + (cx - 0.01) + " " + (cy - r) + " Z";
    }
    const start = dbPolar(cx, cy, r, startAngle);
    const end   = dbPolar(cx, cy, r, endAngle);
    const largeArc = endAngle - startAngle > 180 ? "1" : "0";
    return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArc, 1, end.x, end.y, "Z"].join(" ");
  }

  let donutHtml;
  if (totalDonut === 0) {
    donutHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:22px;padding:32px 20px;text-align:center">'
      + '<svg viewBox="0 0 24 24" width="40" height="40" fill="var(--tx3)" style="opacity:.3;margin-bottom:10px"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>'
      + '<div style="font-size:13px;color:var(--tx3)">Registra tu primera actividad para ver tu resumen aquí</div>'
    + '</div>';
  } else {
    const cx=21, cy=21, r=21;
    const gapDeg = segmentos.length > 1 ? 3 : 0;
    const usable = 360 - (gapDeg * segmentos.length);
    let angle = 0, svgSegs = '';
    segmentos.forEach(function(seg,i){
      const sweep = (seg.val/totalDonut) * usable;
      svgSegs += '<path d="' + dbWedge(cx,cy,r,angle,angle+sweep) + '" fill="url(#' + seg.id + ')" stroke="var(--card-bg)" stroke-width="1.5" style="opacity:0" class="db-wedge"/>';
      angle += sweep + gapDeg;
    });
    const legend = segmentos.map(function(s){
      const pctSeg = Math.round(s.val/totalDonut*100);
      return '<div style="display:flex;align-items:center;gap:7px;padding:5px 2px">'
        + '<div style="width:9px;height:9px;border-radius:3px;background:' + s.grad + ';flex-shrink:0"></div>'
        + '<div style="flex:1;font-size:11px;font-weight:600;color:var(--tx)">' + s.label + '</div>'
        + '<div style="font-size:11px;font-weight:800;color:' + s.color + '">' + s.num + ' <span style="font-weight:600;opacity:.7">(' + pctSeg + '%)</span></div>'
      + '</div>';
    }).join('');
    donutHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.04)">'
      + '<div style="font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px">Distribución de actividades</div>'
      + '<div style="display:flex;align-items:center;gap:10px">'
        + '<div style="position:relative;width:84px;height:84px;flex-shrink:0">'
          + '<svg viewBox="0 0 42 42" style="width:84px;height:84px;filter:drop-shadow(0 4px 10px rgba(0,0,0,.08))">'
            + '<defs>'
              + '<linearGradient id="dbH" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab47bc"/><stop offset="100%" stop-color="#7b1fa2"/></linearGradient>'
              + '<linearGradient id="dbR" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#42a5f5"/><stop offset="100%" stop-color="#1565c0"/></linearGradient>'
              + '<linearGradient id="dbE" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#1b5e20"/></linearGradient>'
              + '<linearGradient id="dbA" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#e65100"/></linearGradient>'
            + '</defs>'
            + svgSegs
            + '<circle cx="21" cy="21" r="10" fill="var(--card-bg)" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.06))"/>'
          + '</svg>'
          + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
            + '<div style="font-size:15px;font-weight:900;color:var(--tx);line-height:1;letter-spacing:-.5px" id="dbPieTotal" data-target="' + ((esPrecursor && prec.horas > 0) ? prec.horas : totalDonut) + '">0</div>'
            + '<div style="font-size:6.5px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.8px;margin-top:2px;opacity:.5">' + ((esPrecursor && prec.horas > 0) ? 'horas' : 'total') + '</div>'
          + '</div>'
        + '</div>'
        + '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">' + legend + '</div>'
      + '</div>'
    + '</div>';
  }

  /* ── 1.5 PROGRESO MENSUAL (datos reales por día; estimado como fallback mientras carga) ── */
  const hoyReal = new Date();
  const _dbAnioObjetivo = _dbAnioVista || hoyReal.getFullYear();
  const _dbMesObjetivo = _dbMesVista || (hoyReal.getMonth()+1);
  const esMesActualDash = (_dbAnioObjetivo === hoyReal.getFullYear() && _dbMesObjetivo === (hoyReal.getMonth()+1));
  const mesKeyDash = _dbAnioObjetivo + '-' + String(_dbMesObjetivo).padStart(2,'0');
  const diasEnMesDash = new Date(_dbAnioObjetivo, _dbMesObjetivo, 0).getDate();
  const MESES_L_DASH = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesNombreDash = MESES_L_DASH[_dbMesObjetivo-1] + ' ' + _dbAnioObjetivo;
  dbCargarHorasDiarias(_dbMesObjetivo, _dbAnioObjetivo);
  const diaHoyG = esMesActualDash ? hoyReal.getDate() : diasEnMesDash;
  const diasEnMesG = diasEnMesDash;
  const _dbCacheMesDash = _dbHorasDiariasCachePorMes[mesKeyDash];
  const usaDatosRealesMes = !!_dbCacheMesDash;
  const horasDelMesVisto = esMesActualDash
    ? (esPrecursor ? (prec.horas || 0) : 0)
    : (function(){ const h = informeHist.find(function(x){ return x.mes === mesKeyDash; }); return h ? (h.horas || 0) : 0; })();
  let progDiario;
  if (!esPrecursor) {
    progDiario = [];
    for (let d = 1; d <= diaHoyG; d++) progDiario.push({ dia: d, val: 0 });
    if (progDiario.length < 2) progDiario.push({ dia: diaHoyG + 1, val: 0 });
  } else if (usaDatosRealesMes) {
    progDiario = [];
    let _dbAcumulado = 0;
    for (let d = 1; d <= diaHoyG; d++) {
      const keyDia = mesKeyDash + '-' + String(d).padStart(2,'0');
      _dbAcumulado += (_dbCacheMesDash[keyDia] || 0);
      progDiario.push({ dia: d, val: Math.round(_dbAcumulado*100)/100 });
    }
    if (progDiario.length < 2) progDiario.push({ dia: diaHoyG + 1, val: _dbAcumulado });
  } else {
    const totalHorasMes = horasDelMesVisto;
    progDiario = [];
    for (let d = 1; d <= diaHoyG; d++) {
      progDiario.push({ dia: d, val: totalHorasMes * (d / diaHoyG) });
    }
    if (progDiario.length < 2) progDiario.push({ dia: diaHoyG + 1, val: totalHorasMes });
  }
  const totalHorasRealesG = usaDatosRealesMes
    ? Object.keys(_dbCacheMesDash).reduce(function(a,k){ return a + (_dbCacheMesDash[k]||0); }, 0)
    : horasDelMesVisto;
  const maxMomentumG = Math.max.apply(null, progDiario.map(function(p){ return p.val; }));
  const ESCALA_PASO = { auxiliar: 5, regular: 10, especial: 20 };
  let pasoY;
  if (esPrecursor && ESCALA_PASO[prec.tipo]) {
    pasoY = ESCALA_PASO[prec.tipo];
  } else if (esPrecursor && prec.tipo === 'publicador') {
    // Meta personal de Publicador: pasos de 5 en 5 (o menos si la meta es chica)
    pasoY = metaHoras >= 20 ? 5 : Math.max(1, Math.round(metaHoras / 4));
  } else {
    pasoY = Math.max(1, Math.ceil(maxMomentumG/3) || 1);
  }
  const pisoEje = (esPrecursor && metaHoras > 0) ? metaHoras : pasoY*2;
  const ejeMax = maxMomentumG > pisoEje
    ? pasoY * Math.ceil((maxMomentumG*1.1) / pasoY || 1)
    : pisoEje;
  const maxValDia = ejeMax;

  function dbPtsDia(w, h, padL, padR, padT, padB) {
    return progDiario.map(function(p) {
      const x = padL + (diasEnMesG > 1 ? ((p.dia-1)/(diasEnMesG-1)) : 0) * (w - padL - padR);
      const y = padT + (h - padT - padB) * (1 - (p.val / maxValDia));
      return { x: x, y: y };
    });
  }
  function dbSmoothPath(pts) {
    if (pts.length < 2) return 'M ' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
    let d = 'M ' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i-1];
      const p1 = pts[i];
      const p2 = pts[i+1];
      const p3 = pts[i+2 < pts.length ? i+2 : i+1];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ' C ' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) + ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) + ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);
    }
    return d;
  }

  const mchW=340, mchH=230, mpL=30, mpR=10, mpT=44, mpB=44;
  const ptsMes = dbPtsDia(mchW, mchH, mpL, mpR, mpT, mpB);
  const ultimoPtMes = ptsMes[ptsMes.length-1];
  const smoothPathMes = dbSmoothPath(ptsMes);
  const areaPathMes = smoothPathMes + ' L ' + ultimoPtMes.x.toFixed(1) + ',' + (mchH-mpB) + ' L ' + ptsMes[0].x.toFixed(1) + ',' + (mchH-mpB) + ' Z';

  // Cuadrícula + etiquetas del eje vertical: pasos redondos (5/10/20h según tipo de precursorado)
  let gridSvg = '';
  for (let v = 0; v <= ejeMax + 0.01; v += pasoY) {
    const y = mpT + (mchH-mpT-mpB) * (1 - (v/ejeMax));
    gridSvg += '<line x1="'+mpL+'" y1="'+y.toFixed(1)+'" x2="'+(mchW-mpR)+'" y2="'+y.toFixed(1)+'" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3"/>';
    gridSvg += '<text x="'+(mpL-6)+'" y="'+(y+3).toFixed(1)+'" font-size="9" fill="var(--tx3)" text-anchor="end">'+Math.round(v)+'h</text>';
  }

  // Línea de ritmo objetivo (meta mensual ÷ días del mes), solo si es precursor
  let metaLineSvg = '';
  let ritmoTxt = '';
  if (esPrecursor && metaHoras > 0) {
    const metaProrateada = metaHoras * (diaHoyG / diasEnMesG);
    const yMeta = mpT + (mchH-mpT-mpB) * (1 - Math.min(1, metaProrateada / ejeMax));
    metaLineSvg = '<line x1="'+mpL+'" y1="'+yMeta.toFixed(1)+'" x2="'+(mchW-mpR)+'" y2="'+yMeta.toFixed(1)+'" stroke="#e65100" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6"/>';
    const pctRitmo = totalHorasRealesG / Math.max(0.01, metaProrateada);
    if (usaDatosRealesMes) {
      if (pctRitmo >= 0.95) ritmoTxt = 'Ritmo estimado: vas por buen camino 🚀';
      else if (pctRitmo >= 0.6) ritmoTxt = 'Ritmo estimado: vas avanzando, sigue así 💪';
      else ritmoTxt = 'Ritmo estimado: cada hora suma, tú puedes 🔥';
    }
  }

  // Puntos clave a resaltar: cuando el momentum cruza un hito redondo (5/10/20h), + hoy
  let calloutIdxs = [];
  let siguienteMeta = pasoY;
  progDiario.forEach(function(p, i) {
    if (p.val >= siguienteMeta) {
      calloutIdxs.push(i);
      while (p.val >= siguienteMeta) siguienteMeta += pasoY;
    }
  });
  const idxHoyPt = progDiario.length - 1;
  calloutIdxs = [idxHoyPt];

  let mensSvg = '<svg viewBox="0 0 ' + mchW + ' ' + mchH + '" style="width:100%;height:230px;overflow:visible">'
    + '<defs><linearGradient id="dbMensGrad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#7b1fa2" stop-opacity="0.22"/>'
      + '<stop offset="100%" stop-color="#7b1fa2" stop-opacity="0"/>'
    + '</linearGradient></defs>'
    + gridSvg
    + metaLineSvg
    + '<path d="' + areaPathMes + '" fill="url(#dbMensGrad)"/>'
    + '<path id="dbMensPath" d="' + smoothPathMes + '" fill="none" stroke="#7b1fa2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';

  // Burbujas de valor solo en los puntos clave (hitos + hoy) — sin puntos de más
  calloutIdxs.forEach(function(idx){
    const p = ptsMes[idx];
    const val = progDiario[idx].val;
    const txt = (val % 1 === 0 ? val : val.toFixed(1)) + 'h';
    const bw = Math.max(30, txt.length * 7 + 14);
    const bh = 20;
    let bx = p.x - bw/2;
    bx = Math.max(mpL - 6, Math.min(mchW - mpR - bw + 6, bx));
    const by = Math.max(2, p.y - bh - 10);
    mensSvg += '<g class="db-mens-callout">';
    mensSvg += '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.5" fill="#7b1fa2" stroke="var(--card-bg)" stroke-width="2"/>';
    mensSvg += '<rect x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bw+'" height="'+bh+'" rx="8" fill="#7b1fa2"/>';
    mensSvg += '<text x="'+(bx+bw/2).toFixed(1)+'" y="'+(by+14).toFixed(1)+'" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle">'+txt+'</text>';
    mensSvg += '</g>';
  });

  const ticksSet = [1, 7, 14, 21, 28, diasEnMesG].filter(function(v,i,arr){ return v <= diasEnMesG && arr.indexOf(v)===i; });
  ticksSet.forEach(function(d){
    const x = mpL + (diasEnMesG > 1 ? ((d-1)/(diasEnMesG-1)) : 0) * (mchW-mpL-mpR);
    mensSvg += '<text x="'+x.toFixed(1)+'" y="'+(mchH-18)+'" font-size="10" fill="var(--tx3)" text-anchor="middle">'+d+'</text>';
  });
  mensSvg += '<text x="'+(mpL + (mchW-mpL-mpR)/2).toFixed(1)+'" y="'+(mchH-4)+'" font-size="9" fill="var(--tx3)" text-anchor="middle" opacity="0.7">Día del mes</text>';
  mensSvg += '</svg>';

  const mensualHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,.04);perspective:900px' + (_dbProgresoAnimar ? ';animation:dbEpicFlip .55s cubic-bezier(.34,1.56,.64,1) both' : '') + '">'
    + dbTabsProgreso()
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">'
      + '<div>'
        + '<div style="display:flex;align-items:center;gap:8px">'
          + '<div style="font-size:13px;font-weight:800;color:var(--tx);letter-spacing:.02em">Progreso mensual</div>'
          + '<span style="font-size:9px;font-weight:700;color:#7b1fa2;background:#f3e5f5;padding:2px 8px;border-radius:99px;text-transform:capitalize">' + (t(prec.tipo) || 'Publicador') + '</span>'
        + '</div>'
        + '<div style="font-size:11px;color:var(--tx3);margin-top:2px">Horas dedicadas este mes</div>'
        + '<div onclick="dbAbrirCalendarioHoras()" style="font-size:10.5px;font-weight:700;color:#7b1fa2;margin-top:5px;cursor:pointer;display:flex;align-items:center;gap:4px">'
          + '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
          + 'Registrar horas de otro día'
        + '</div>'
      + '</div>'
      + '<div style="text-align:right;background:#f3e5f5;padding:5px 12px;border-radius:10px">'
        + '<div style="font-size:15px;font-weight:900;color:#7b1fa2;line-height:1">' + horasDelMesVisto + 'h</div>'
        + '<div style="font-size:8.5px;font-weight:700;color:#7b1fa2;opacity:.7;text-transform:uppercase;letter-spacing:.05em">Total</div>'
      + '</div>'
    + '</div>'
    + mensSvg
    + '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">'
      + '<div style="width:32px;height:32px;border-radius:10px;background:#f3e5f5;color:#7b1fa2;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>'
      + '</div>'
      + '<div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--tx2)">' + (ritmoTxt || (usaDatosRealesMes ? 'Horas registradas por día' : 'Ritmo estimado')) + '</div>'
        + '<div style="font-size:10.5px;color:var(--tx3);margin-top:2px">' + (usaDatosRealesMes ? mesNombre() : 'Cargando datos de ' + mesNombre() + '…') + '</div>'
      + '</div>'
    + '</div>'
  + '</div>';

  /* ── 2. ENCABEZADO (saludo, fecha, exportar) + STATS ── */
  function dbPctVsMesAnterior() {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const key = prevDate.getFullYear()+'-'+String(prevDate.getMonth()+1).padStart(2,'0');
    const hit = informeHist.find(function(h){ return h.mes === key; });
    if (!hit || !hit.horas) return null;
    const actual = prec.horas || 0;
    return Math.round(((actual - hit.horas) / hit.horas) * 100);
  }
  const MESES_CORTOS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const pctVsMes = dbPctVsMesAnterior();
  const mesAnteriorDate = new Date(new Date().getFullYear(), new Date().getMonth()-1, 1);
  const mesAnteriorNombre = MESES_CORTOS[mesAnteriorDate.getMonth()];

  const headerHtml = '<div>'
    + '<div style="font-size:19px;font-weight:800;color:var(--tx);letter-spacing:-.2px">' + getSaludo() + ' 👋</div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:10px">'
      + '<div onclick="dbAbrirSelectorMes()" style="display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--tx3);font-weight:600;cursor:pointer">'
        + '<svg viewBox="0 0 24 24" width="14" height="14" fill="var(--tx3)"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>'
        + mesNombreDash
        + '<svg viewBox="0 0 24 24" width="12" height="12" fill="var(--tx3)"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
      + '</div>'
      + '<button onclick="goTo(&quot;informe&quot;)" style="display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:10px;border:1px solid var(--border);background:var(--card-bg);color:var(--tx);font-size:12px;font-weight:700;cursor:pointer;font-family:var(--f-sans);white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" width="14" height="14" fill="var(--tx)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>'
        + 'Mi Informe'
      + '</button>'
    + '</div>'
  + '</div>';

  function dbStatCard(color, bg, iconSvg, label, valor, sub, subUp) {
    return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:14px">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">'
        + '<div style="width:34px;height:34px;border-radius:10px;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + iconSvg + '</div>'
        + '<div style="font-size:11px;font-weight:700;color:var(--tx3);line-height:1.25">' + label + '</div>'
      + '</div>'
      + '<div style="font-size:22px;font-weight:900;color:var(--tx);line-height:1">' + valor + '</div>'
      + '<div style="font-size:11px;font-weight:700;color:' + (subUp===true?'#1e7e34':subUp===false?'#c0392b':'var(--tx3)') + ';margin-top:4px">' + sub + '</div>'
    + '</div>';
  }

  const ICO_CLOCK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>';
  const ICO_PEOPLE = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>';
  const ICO_BOOK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>';
  const ICO_CAP = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>';

  const subHoras = pctVsMes !== null
    ? ((pctVsMes >= 0 ? '↑ ' : '↓ ') + Math.abs(pctVsMes) + '% que ' + mesAnteriorNombre)
    : 'Sin dato del mes anterior';

  function dbStatCardV2(color, bg, iconSvg, label, valor, sub, linkOnclick) {
    return '<div onclick="' + linkOnclick + '" style="flex:0 0 108px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:11px;cursor:pointer">'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">'
        + '<div style="width:26px;height:26px;border-radius:8px;background:' + bg + ';color:' + color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">' + iconSvg + '</div>'
      + '</div>'
      + '<div style="font-size:9.5px;font-weight:700;color:var(--tx3);line-height:1.2;margin-bottom:4px">' + label + '</div>'
      + '<div style="font-size:18px;font-weight:900;color:var(--tx);line-height:1">' + valor + '</div>'
      + '<div style="font-size:8.5px;color:var(--tx3);margin-top:2px">' + sub + '</div>'
      + '<div style="font-size:8.5px;font-weight:700;color:' + color + ';margin-top:6px;white-space:nowrap">Ver &#8594;</div>'
    + '</div>';
}

  const statCard1 = dbStatCardV2('#7b1fa2', '#f3e5f5', ICO_CLOCK, 'Horas invertidas', (esPrecursor ? prec.horas : 0) + 'h', subHoras, "goTo('precursorado')");
  const statCard2 = dbStatCardV2('#1565c0', '#eef3fa', ICO_PEOPLE, 'Revisitas', revisitasPend, 'Pendientes', "goTo('home');setTimeout(function(){setTab('revisita');},300)");
  const statCard3 = dbStatCardV2('#1b5e20', '#edf7ef', ICO_BOOK, 'Cursos Bíblicos', estudiosActivos, 'En progreso', "goTo('home');setTimeout(function(){setTab('estudio');},300)");
  const ICO_CLIPBOARD = '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>';
  const statCard4 = dbStatCardV2('#e65100', '#fff3e0', ICO_CLIPBOARD, 'Asignaciones', asigCompMes, 'Completadas', "goTo('asignaciones')");

  const statTarjetas = [statCard1, statCard2, statCard3, statCard4];
  const statsHtml = '<style>'
      + '.db-mq-wrap4{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;scroll-snap-type:x proximity;padding-bottom:2px;}'
      + '.db-mq-wrap4::-webkit-scrollbar{display:none;}'
      + '.db-mq-wrap4 > div{scroll-snap-align:start;flex-shrink:0;}'
    + '</style>'
    + '<div class="db-mq-wrap4" id="dbMqWrap4">'
      + statTarjetas.join('')
      + statTarjetas.join('')
    + '</div>';

  /* ── 3. PRÓXIMAS VISITAS (rediseño) + CALENDARIO RÁPIDO ── */
  updateUserPosition();
  const proximasAll = cards.filter(function(c){return c.fecha && c.fecha >= hoy;})
    .sort(function(a,b){ return a.fecha.localeCompare(b.fecha) || (a.hora||'').localeCompare(b.hora||''); });
  const proximas = proximasAll.slice(0,4);
  let proximasListHtml;
  if (!proximas.length) {
    proximasListHtml = '<div style="padding:24px 12px;text-align:center;color:var(--tx3)">'
      + '<svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" style="opacity:.25;margin-bottom:6px"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>'
      + '<div style="font-size:12px">Sin visitas programadas</div>'
    + '</div>';
  } else {
    proximasListHtml = proximas.map(function(c, i){
      const wl = whenLabel(c.fecha, c.hora);
      const bInfo = badge(c.estado);
      let distTxt = '';
      if (_userLat && _userLng && c.lat && c.lng) {
        distTxt = ' · ' + formatDist(haversine(_userLat, _userLng, parseFloat(c.lat), parseFloat(c.lng)));
      }
      return '<div onclick="openDet(' + c.id + ')" style="display:flex;align-items:center;gap:11px;padding:11px 12px;' + (i>0?'border-top:1px solid var(--border);':'') + 'cursor:pointer;transition:background .12s" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'\'">'
        + '<div class="ava" style="width:36px;height:36px;font-size:12.5px;flex-shrink:0;background:' + avaColor(c.nombre) + '">' + initials(c.nombre) + '</div>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:13px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + c.nombre + '</div>'
          + '<div style="font-size:11px;color:var(--tx3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + wl.tx + distTxt + '</div>'
        + '</div>'
        + '<span class="badge ' + bInfo[0] + '" style="flex-shrink:0;font-size:9px;padding:4px 9px">' + bInfo[1] + '</span>'
      + '</div>';
    }).join('');
  }

  const proximasCardHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04),0 6px 18px rgba(0,0,0,.05)">'
    + '<div style="padding:14px 14px 10px;display:flex;align-items:center;justify-content:space-between">'
      + '<div style="font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Próximas visitas</div>'
      + '<button onclick="var c=document.getElementById(\'dbCarrusel\');c.scrollTo({left:c.offsetWidth,behavior:\'smooth\'})" style="display:flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:var(--navy);background:var(--navy-light);border:none;padding:5px 10px;border-radius:8px;cursor:pointer;white-space:nowrap">'
        + '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
        + 'Calendario'
      + '</button>'
    + '</div>'
    + proximasListHtml
    + (proximasAll.length > 4
      ? '<div onclick="goTo(&quot;home&quot;)" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:11px 10px;border-top:1px solid var(--border);font-size:11px;font-weight:700;color:var(--navy);cursor:pointer">Ver todas (' + proximasAll.length + ') <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></div>'
      : '')
  + '</div>';

  function dbConstruirCalendarioMini() {
    const anio = _dbCalAnio, mesN = _dbCalMes;
    const diasSemana = ['L','M','M','J','V','S','D'];
    let primerDia = new Date(anio, mesN, 1).getDay();
    primerDia = primerDia === 0 ? 6 : primerDia - 1;
    const diasEnMes = new Date(anio, mesN+1, 0).getDate();
    const mesStr = anio + '-' + String(mesN+1).padStart(2,'0');

    const diasVisita = {};
    const diasAsig = {};
    cards.forEach(function(c){
      if (c.fecha && c.fecha.startsWith(mesStr)) diasVisita[c.fecha] = true;
      if (c.historial) c.historial.forEach(function(h){ if (h.fecha && h.fecha.startsWith(mesStr)) diasVisita[h.fecha] = true; });
    });
    try { asignaciones.forEach(function(a){ if (a.fecha && a.fecha.startsWith(mesStr)) diasAsig[a.fecha] = true; }); } catch(e){}
    const diasRec = {};
    try {
      recordatoriosPersonales.forEach(function(r){
        const f = r.fecha ? r.fecha.split('T')[0] : '';
        if (f && f.startsWith(mesStr)) {
          const ic = RECORDATORIO_ICONOS[r.icono] || RECORDATORIO_ICONOS.pin;
          diasRec[f] = ic.color;
        }
      });
    } catch(e){}

    let grid = '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:10px">';
    diasSemana.forEach(function(d){ grid += '<div style="text-align:center;font-size:8.5px;font-weight:700;color:var(--tx3)">'+d+'</div>'; });
    for (let i=0;i<primerDia;i++) grid += '<div></div>';
    for (let d=1; d<=diasEnMes; d++) {
      const key = anio+'-'+String(mesN+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      const esHoy = key === hoy;
      const tieneVisita = !!diasVisita[key];
      const tieneAsig = !!diasAsig[key];
      const colorRec = diasRec[key] || '';
      let bg = 'transparent', color = 'var(--tx)', dotColor = '';
      if (esHoy) { bg = 'var(--navy)'; color = '#fff'; }
      else if (tieneVisita && tieneAsig) { bg = '#eef3fa'; color = '#1565c0'; dotColor = '#7b1fa2'; }
      else if (tieneVisita) { bg = '#eef3fa'; color = '#1565c0'; }
      else if (tieneAsig) { bg = '#f3e5f5'; color = '#7b1fa2'; }
      else if (colorRec) { bg = colorRec + '30'; color = colorRec; }
      let puntitos = '';
      if (dotColor) puntitos += '<span style="position:absolute;bottom:1px;left:calc(50% - 5px);width:3px;height:3px;border-radius:50%;background:'+dotColor+'"></span>';
      if (colorRec) puntitos += '<span style="position:absolute;bottom:1px;left:calc(50% + 2px);width:3px;height:3px;border-radius:50%;background:'+colorRec+'"></span>';
      grid += '<div onclick="dbAbrirDiaCal(&quot;'+key+'&quot;)" style="aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:7px;font-size:9px;font-weight:'+(esHoy?'800':'600')+';background:'+bg+';color:'+color+';position:relative;cursor:pointer">'
        + d
        + puntitos
      + '</div>';
    }
    grid += '</div>';

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return '<div id="dbCalCard" style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;padding:14px;opacity:' + (_dbCalAnimarEntrada ? '0' : '1') + ';transform:' + (_dbCalAnimarEntrada ? 'translateY(14px)' : 'none') + '">'
      + '<div style="font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Calendario</div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between">'
        + '<button onclick="dbCalNav(-1)" style="width:22px;height:22px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0"><svg viewBox="0 0 24 24" width="12" height="12" fill="var(--tx)"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>'
        + '<div style="font-size:11px;font-weight:700;color:var(--tx)">' + MESES[mesN].substring(0,3) + ' ' + anio + '</div>'
        + '<button onclick="dbCalNav(1)" style="width:22px;height:22px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0"><svg viewBox="0 0 24 24" width="12" height="12" fill="var(--tx)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>'
      + '</div>'
      + grid
      + '<div onclick="goTo(&quot;calendario&quot;)" style="text-align:center;margin-top:10px;padding-top:9px;border-top:1px solid var(--border);font-size:10.5px;font-weight:700;color:var(--navy);cursor:pointer">Ver completo →</div>'
    + '</div>';
  }
  const calendarioMiniHtml = dbConstruirCalendarioMini();

  /* ── 4. PROGRESO PRECURSORADO ── */
  let precHtml = '';
  if (esPrecursor) {
    precHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;padding:16px 18px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
        + '<div style="font-size:13px;font-weight:700;color:var(--tx)">Meta de ' + t(prec.tipo) + '</div>'
        + '<div style="font-size:13px;font-weight:800;color:var(--navy)">' + prec.horas + 'h / ' + metaHoras + 'h</div>'
      + '</div>'
      + '<div style="height:10px;background:var(--navy-light);border-radius:99px;overflow:hidden">'
        + '<div style="height:100%;width:' + pctHoras + '%;background:linear-gradient(90deg,var(--navy),#2e6be6);border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)"></div>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--tx3);margin-top:6px;text-align:right;font-weight:600">' + pctHoras + '% completado</div>'
    + '</div>';
  }

  /* ── 5. PRÓXIMA ASIGNACIÓN ── */
  let asigHtml = '';
  let asigList = [];
  try { asigList = asignaciones.filter(function(a){return !a.completada;}).sort(function(a,b){return a.fecha.localeCompare(b.fecha);}); } catch(e){}
  const asigSemana = asigList.filter(function(a){ return diasHasta(a.fecha) <= 7; }).slice(0, 5);
  if (asigSemana.length) {
    asigHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;overflow:hidden">'
      + asigSemana.map(function(a, i){
          const dias = diasHasta(a.fecha);
          const label = dias===0 ? '¡Hoy!' : dias===1 ? 'Mañana' : dias<0 ? 'Atrasada' : 'En ' + dias + ' días';
          const tipoCustomA = tiposPersonalizados.find(t => t.id === a.tipo);
          const nombreA = tipoCustomA ? tipoCustomA.nombre : (TIPOS_PARTE[a.tipo] || a.tipo);
          const c = tipoCustomA
            ? { bg: tipoCustomA.seccion==='tesoros' ? '#eef7f8' : tipoCustomA.seccion==='maestros' ? '#fff8ee' : tipoCustomA.seccion==='cristiana' ? '#fdf0f0' : '#f1f2f4',
                color: tipoCustomA.seccion==='tesoros' ? '#2e7d8a' : tipoCustomA.seccion==='maestros' ? '#a0660a' : tipoCustomA.seccion==='cristiana' ? '#8b1a1a' : '#5a6472' }
            : (TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' });
          return '<div onclick="goTo(&quot;asignaciones&quot;);setTimeout(function(){openAsigDet(' + a.id + ');},300)" style="display:flex;align-items:center;gap:11px;padding:12px 14px;' + (i>0?'border-top:1px solid var(--border);':'') + 'cursor:pointer">'
            + '<div style="width:36px;height:36px;border-radius:10px;background:' + c.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:6px;overflow:hidden"><img src="' + dbImgAsig(a) + '" style="width:100%;height:100%;object-fit:contain"/></div>'
            + '<div style="flex:1;min-width:0">'
              + '<div style="font-size:13px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + nombreA + '</div>'
              + '<div style="font-size:10.5px;color:var(--tx3);margin-top:1px">' + fmtDate(a.fecha) + '</div>'
            + '</div>'
            + '<span style="font-size:11px;font-weight:800;color:' + (dias<=3?'#c0392b':c.color) + ';flex-shrink:0">' + label + '</span>'
          + '</div>';
        }).join('')
    + '</div>';
  }

  /* ── 6. RACHA / CONSTANCIA ── */
  let rachaHtml = '';
  const hist = informeHist.slice().sort(function(a,b){return b.mes.localeCompare(a.mes);});
  let racha = 0;
  for (let i=0; i<hist.length; i++) { if (hist[i].enviado) racha++; else break; }
  if (hist.length) {
    rachaHtml = '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:18px;display:flex;align-items:center;gap:12px;padding:14px 16px">'
      + '<div style="width:42px;height:42px;border-radius:12px;background:#fff8ee;color:#a0660a;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/></svg>'
      + '</div>'
      + '<div style="flex:1">'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx)">' + racha + ' mes' + (racha===1?'':'es') + ' seguido' + (racha===1?'':'s') + ' enviando informe</div>'
        + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">' + (racha>0 ? '¡Sigue así!' : 'Envía tu informe para iniciar tu racha') + '</div>'
      + '</div>'
    + '</div>';
  }

  el.innerHTML =
      '<div style="margin-bottom:16px">' + headerHtml + '</div>'
    + '<div style="margin-bottom:8px;font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Resumen del mes</div>'
    + '<div style="margin-bottom:16px">' + statsHtml + '</div>'
    + '<div style="margin-bottom:16px">' + (_dbVistaProgreso==='mensual' ? mensualHtml : dbConstruirSemanalHtml()) + '</div>'
    + '<div style="margin-bottom:8px;font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Agenda</div>'
    + '<div style="margin-bottom:16px">'
        + '<div id="dbCarrusel" style="display:flex;align-items:flex-start;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none">'
          + '<div style="flex:0 0 100%;scroll-snap-align:start">' + proximasCardHtml + '</div>'
          + '<div style="flex:0 0 100%;scroll-snap-align:start">' + calendarioMiniHtml + '</div>'
        + '</div>'
        + '<div id="dbCarruselDots" style="display:flex;justify-content:center;gap:6px;margin-top:8px">'
          + '<div class="db-dot" data-i="0" onclick="document.getElementById(\'dbCarrusel\').scrollTo({left:0,behavior:\'smooth\'})" style="width:18px;height:6px;border-radius:99px;background:var(--navy);cursor:pointer;transition:background .2s,width .2s"></div>'
          + '<div class="db-dot" data-i="1" onclick="var c=document.getElementById(\'dbCarrusel\');c.scrollTo({left:c.offsetWidth,behavior:\'smooth\'})" style="width:6px;height:6px;border-radius:99px;background:var(--border-dk);cursor:pointer;transition:background .2s,width .2s"></div>'
        + '</div>'
      + '</div>'
    + (asigHtml ? '<div style="margin-bottom:8px;font-size:11px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em">Próxima asignación</div><div style="margin-bottom:16px">' + asigHtml + '</div>' : '')
    + '<div style="display:flex;align-items:center;gap:11px;padding:13px 14px;background:var(--card-bg);border:1px solid var(--border);border-radius:16px">'
        + '<div style="width:34px;height:34px;border-radius:10px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
          + '<svg viewBox="0 0 24 24" width="17" height="17" fill="var(--navy)"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>'
        + '</div>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="font-size:12.5px;font-weight:700;color:var(--tx)">¿Necesitas ayuda?</div>'
          + '<div style="font-size:10.5px;color:var(--tx3);margin-top:1px">Repórtanos cualquier problema</div>'
        + '</div>'
        + '<button onclick="reportarProblema()" style="flex-shrink:0;font-size:11px;font-weight:700;color:#fff;background:var(--navy);border:none;padding:9px 14px;border-radius:10px;cursor:pointer">Reportar</button>'
      + '</div>';

  if (totalDonut > 0) {
    setTimeout(function() {
      document.querySelectorAll('.db-wedge').forEach(function(w,i) {
        setTimeout(function() {
          w.style.transition = 'opacity .5s ease, transform .5s cubic-bezier(.34,1.56,.64,1)';
          w.style.opacity = '1';
          w.style.transformOrigin = '21px 21px';
          w.style.transform = 'scale(1)';
        }, i*150);
      });
      const totalEl = document.getElementById('dbPieTotal');
      if (totalEl) {
        const metaVal = parseFloat(totalEl.dataset.target || totalDonut) || 0;
        let startTime=null, dur=800;
        function anim(ts){
          if(!startTime) startTime=ts;
          const p=Math.min((ts-startTime)/dur,1);
          const eased=1-Math.pow(1-p,3);
          const val = metaVal*eased;
          totalEl.textContent = (metaVal % 1 !== 0) ? val.toFixed(1) : Math.round(val);
          if(p<1) requestAnimationFrame(anim);
        }
        setTimeout(function(){requestAnimationFrame(anim);}, 150);
      }
    }, 100);
  }

  setTimeout(function() {
    const mensPath = document.getElementById('dbMensPath');
    if (mensPath && mensPath.getTotalLength) {
      try {
        const len = mensPath.getTotalLength();
        mensPath.style.transition = 'none';
        mensPath.style.strokeDasharray = len;
        mensPath.style.strokeDashoffset = len;
        mensPath.getBoundingClientRect();
        mensPath.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
        mensPath.style.strokeDashoffset = '0';
      } catch(e) {}
    }
    const semPath = document.getElementById('dbSemPath');
    if (semPath && semPath.getTotalLength) {
      try {
        const len = semPath.getTotalLength();
        semPath.style.transition = 'none';
        semPath.style.strokeDasharray = len;
        semPath.style.strokeDashoffset = len;
        semPath.getBoundingClientRect();
        semPath.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1)';
        semPath.style.strokeDashoffset = '0';
      } catch(e) {}
    }
    document.querySelectorAll('.db-mens-callout').forEach(function(el, i){
      el.style.opacity = '0';
      setTimeout(function(){ el.style.transition = 'opacity .35s ease'; el.style.opacity = '1'; }, 700 + i*120);
    });
  }, 100);

  setTimeout(function(){
    const carr = document.getElementById('dbCarrusel');
    if (carr && !carr.dataset.bound) {
      carr.dataset.bound = '1';
      carr.addEventListener('scroll', function(){
        const idx = Math.round(carr.scrollLeft / Math.max(1, carr.offsetWidth));
        document.querySelectorAll('#dbCarruselDots .db-dot').forEach(function(d){
          const on = parseInt(d.dataset.i) === idx;
          d.style.background = on ? 'var(--navy)' : 'var(--border-dk)';
          d.style.width = on ? '18px' : '6px';
        });
      }, { passive: true });
    }
    const carr2 = document.getElementById('dbCarrusel2');
    if (carr2 && !carr2.dataset.bound) {
      carr2.dataset.bound = '1';
      carr2.addEventListener('scroll', function(){
        const idx = Math.round(carr2.scrollLeft / Math.max(1, carr2.offsetWidth));
        document.querySelectorAll('#dbCarrusel2Dots .db-dot2').forEach(function(d){
          const on = parseInt(d.dataset.i) === idx;
          d.style.background = on ? 'var(--navy)' : 'var(--border-dk)';
          d.style.width = on ? '18px' : '6px';
        });
      }, { passive: true });
    }

    const mqWrap4 = document.getElementById('dbMqWrap4');
    if (mqWrap4 && !mqWrap4.dataset.bound) {
      mqWrap4.dataset.bound = '1';
      let mqScrollTimer = null;
      mqWrap4.addEventListener('scroll', function(){
        if (mqScrollTimer) clearTimeout(mqScrollTimer);
        mqScrollTimer = setTimeout(function(){
          const half = mqWrap4.scrollWidth / 2;
          const antes = mqWrap4.style.scrollBehavior;
          mqWrap4.style.scrollBehavior = 'auto';
          if (mqWrap4.scrollLeft >= half) {
            mqWrap4.scrollLeft -= half;
          } else if (mqWrap4.scrollLeft <= 2) {
            mqWrap4.scrollLeft += half;
          }
          mqWrap4.style.scrollBehavior = antes;
        }, 120);
      }, { passive: true });
    }
  }, 150);
}

function enforceViewVisibility() {
  document.querySelectorAll('.view').forEach(function(el) {
    el.style.display = (el.id === 'view-' + currentView) ? '' : 'none';
  });
}

function exportarDashboard() {
  const esPrecursorX = prec.tipo === 'auxiliar' || prec.tipo === 'regular' || prec.tipo === 'especial';
  const revisitasPendX = cards.filter(function(c){return c.tipo==='revisita';}).length;
  const estudiosActivosX = cards.filter(function(c){return c.tipo==='estudio';}).length;
  let asigCompMesX = 0;
  try { asigCompMesX = asignaciones.filter(function(a){return a.completada && a.fecha && a.fecha.startsWith(mesKey());}).length; } catch(e){}
  let txt = 'RESUMEN · ' + mesNombre() + '\n';
  txt += '--------------------------------------------------\n';
  if (esPrecursorX) txt += 'Horas invertidas: ' + prec.horas + 'h\n';
  txt += 'Revisitas pendientes: ' + revisitasPendX + '\n';
  txt += 'Cursos/estudios activos: ' + estudiosActivosX + '\n';
  txt += 'Asignaciones completadas este mes: ' + asigCompMesX;

  (async function() {
    if (Cap.Share) { try { await Cap.Share.share({ text: txt }); return; } catch(e){} }
    if (navigator.share) { try { await navigator.share({ title:'Resumen AssendApp', text: txt }); return; } catch(e){} }
    try { await navigator.clipboard.writeText(txt); toast('Resumen copiado ✔'); } catch(e) { alert(txt); }
  })();
}

function renderView(v) {
  if (v === 'dashboard')    buildDashboard();
  if (v === 'precursorado') { buildPrec(); setTimeout(dbActivarRuedaHorasPrec, 60); }
  if (v === 'informe')      buildInforme();
  if (v === 'asignaciones') buildAsignaciones();
  if (v === 'history')      buildHistory();
  if (v === 'settings')     buildSettings();
  if (v === 'calendario')  buildCalendario();
  if (v === 'horario') {
    if (horarioCache === null) {
      buildHorario();
      horarioCargar().then(function(){ if (currentView === 'horario') buildHorario(); });
    } else {
      buildHorario();
    }
  }

}

const HORARIO_DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo'];
const HORARIO_DIAS_LABEL = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
const HORARIO_TURNOS = ['manana','tarde','noche'];
const HORARIO_TURNOS_LABEL = { manana:'Mañana', tarde:'Tarde', noche:'Noche' };

let recordatoriosPersonales = [];
let _recEditId = null;
async function loadRecordatoriosPersonales() {
  try {
    const token = localStorage.getItem('st_token');
    const res = await fetch(API_URL + '/recordatorios', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) recordatoriosPersonales = await res.json();
  } catch(e) { console.error('Error cargando recordatorios personales:', e); }
}

let horarioCache = null;

async function horarioCargar() {
  try {
    const token = localStorage.getItem('st_token');
    const res = await fetch(API_URL + '/precursorado/horario', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) { horarioCache = { dias: {}, meta: 0 }; return; }
    const data = await res.json();
    horarioCache = { dias: data.dias || {}, meta: parseFloat(data.meta) || 0 };
  } catch(e) {
    console.error('Error cargando horario:', e);
    horarioCache = { dias: {}, meta: 0 };
  }
}

async function horarioGuardarBackend(diasParcial, meta) {
  try {
    const token = localStorage.getItem('st_token');
    const body = {};
    if (diasParcial) body.dias = diasParcial;
    if (typeof meta === 'number') body.meta = meta;
    await fetch(API_URL + '/precursorado/horario', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(body)
    });
  } catch(e) {
    console.error('Error guardando horario:', e);
  }
}

function horarioLeer() {
  return (horarioCache && horarioCache.dias) || {};
}
let _dbVistaProgreso = 'mensual';
let _dbProgresoAnimar = false;
function dbCambiarVistaProgreso(v) {
  if (v === _dbVistaProgreso) return;
  _dbVistaProgreso = v;
  _dbProgresoAnimar = true;
  buildDashboard();
  _dbProgresoAnimar = false;
}
function dbTabsProgreso() {
  return '<div style="display:flex;gap:4px;background:var(--bg);border-radius:99px;padding:3px;margin-bottom:14px;width:fit-content">'
    + '<button onclick="dbCambiarVistaProgreso(&quot;mensual&quot;)" style="padding:6px 14px;border:none;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--f-sans);background:' + (_dbVistaProgreso==='mensual'?'var(--navy)':'transparent') + ';color:' + (_dbVistaProgreso==='mensual'?'#fff':'var(--tx3)') + '">Mensual</button>'
    + '<button onclick="dbCambiarVistaProgreso(&quot;semanal&quot;)" style="padding:6px 14px;border:none;border-radius:99px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--f-sans);background:' + (_dbVistaProgreso==='semanal'?'var(--navy)':'transparent') + ';color:' + (_dbVistaProgreso==='semanal'?'#fff':'var(--tx3)') + '">Semanal</button>'
  + '</div>';
}

function dbObtenerHorasDelDia(fechaStr) {
  const mesClave = fechaStr.slice(0, 7);
  const cache = _dbHorasDiariasCachePorMes[mesClave];
  if (cache === undefined) {
    const partes = fechaStr.split('-');
    dbCargarHorasDiarias(parseInt(partes[1]), parseInt(partes[0])).then(function(){
      if (currentView === 'dashboard') buildDashboard();
    });
    return null;
  }
  return cache[fechaStr] || 0;
}

function dbConstruirSemanalHtml() {
  if (horarioCache === null) {
    horarioCargar().then(function(){ if (currentView === 'dashboard') buildDashboard(); });
  }
  let planSemana = 0;
  if (horarioCache && horarioCache.dias) {
    Object.keys(horarioCache.dias).forEach(function(dia){
      Object.keys(horarioCache.dias[dia]).forEach(function(turno){
        planSemana += (horarioCache.dias[dia][turno] || 0);
      });
    });
  }

  const hoyD = new Date();
  const diaSemanaHoy = hoyD.getDay() === 0 ? 6 : hoyD.getDay() - 1; // 0=Lunes ... 6=Domingo
  const lunes = new Date(hoyD);
  lunes.setDate(hoyD.getDate() - diaSemanaHoy);

  const DIAS_ABREV = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  let horasHechas = 0;
  let datosIncompletos = false;
  const puntos = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    const fechaStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    const esFuturo = i > diaSemanaHoy;
    let horasDia = 0;
    if (!esFuturo) {
      const h = dbObtenerHorasDelDia(fechaStr);
      if (h === null) { datosIncompletos = true; } else { horasDia = h; horasHechas += h; }
    }
    puntos.push({ label: DIAS_ABREV[i], horas: horasDia, esFuturo: esFuturo, esHoy: i === diaSemanaHoy });
  }

  // Acumulado de la semana (sube al registrar, se aplana si no registras — igual que el gráfico mensual)
  let acumSemana = 0;
  const puntosAcum = puntos.map(function(p){
    if (!p.esFuturo) acumSemana += p.horas;
    return { label: p.label, val: acumSemana, esFuturo: p.esFuturo, esHoy: p.esHoy };
  });

  const maxDatoReal = Math.max.apply(null, puntosAcum.map(function(p){ return p.val; }));
  const ejeMaxSemana = Math.max(1, planSemana > 0 ? Math.max(planSemana, maxDatoReal) : maxDatoReal * 1.2);
  const pasoYSemana = Math.max(1, ejeMaxSemana / 5);

  const swW = 300, swH = 130, spL = 26, spR = 8, spT = 16, spB = 22;
  const swPts = puntosAcum.map(function(p, i) {
    const x = spL + (i / 6) * (swW - spL - spR);
    const y = spT + (swH - spT - spB) * (1 - (p.val / ejeMaxSemana));
    return { x: x, y: y, val: p.val, label: p.label, esFuturo: p.esFuturo, esHoy: p.esHoy };
  });
  const puntosReales = swPts.filter(function(p){ return !p.esFuturo; });
  const ultimoPtSemana = puntosReales[puntosReales.length - 1] || swPts[0];

  let gridSemana = '';
  for (let v = 0; v <= ejeMaxSemana + 0.01; v += pasoYSemana) {
    const y = spT + (swH - spT - spB) * (1 - (v / ejeMaxSemana));
    gridSemana += '<line x1="' + spL + '" y1="' + y.toFixed(1) + '" x2="' + (swW - spR) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="2 3"/>';
    gridSemana += '<text x="' + (spL - 6) + '" y="' + (y + 3).toFixed(1) + '" font-size="8.5" fill="var(--tx3)" text-anchor="end">' + Math.round(v) + 'h</text>';
  }

  const polylinePts = puntosReales.map(function(p){ return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join(' ');
  const areaSemana = puntosReales.length > 1
    ? ('M ' + puntosReales[0].x.toFixed(1) + ',' + (swH - spB) + ' L ' + polylinePts.replace(/ /g, ' L ') + ' L ' + ultimoPtSemana.x.toFixed(1) + ',' + (swH - spB) + ' Z')
    : '';

  let barrasSvg = '<svg viewBox="0 0 ' + swW + ' ' + swH + '" style="width:100%;height:130px;margin-top:6px">'
    + '<defs><linearGradient id="dbSemGrad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#7b1fa2" stop-opacity="0.22"/>'
      + '<stop offset="100%" stop-color="#7b1fa2" stop-opacity="0"/>'
    + '</linearGradient></defs>'
    + gridSemana
    + (areaSemana ? '<path d="' + areaSemana + '" fill="url(#dbSemGrad)"/>' : '')
    + (puntosReales.length > 1 ? '<polyline id="dbSemPath" points="' + polylinePts + '" fill="none" stroke="#7b1fa2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' : '')
    + '<circle cx="' + ultimoPtSemana.x.toFixed(1) + '" cy="' + ultimoPtSemana.y.toFixed(1) + '" r="4.5" fill="#7b1fa2" stroke="var(--card-bg)" stroke-width="2"/>';
  swPts.forEach(function(p){
    barrasSvg += '<text x="' + p.x.toFixed(1) + '" y="' + (swH - 4) + '" font-size="9" fill="' + (p.esHoy ? 'var(--navy)' : 'var(--tx3)') + '" font-weight="' + (p.esHoy ? '800' : '600') + '" text-anchor="middle">' + p.label + '</text>';
  });
  barrasSvg += '</svg>';

  let mensajeTitulo, mensajeSub, iconoColor = '#7b1fa2', iconoBg = '#f3e5f5';
  if (horasHechas <= 0) {
    mensajeTitulo = 'Aún no registras horas esta semana';
    mensajeSub = 'Cada hora suma, tú puedes 🔥';
  } else if (diaSemanaHoy === 6) {
    mensajeTitulo = '¡Semana completa!';
    mensajeSub = 'Hiciste ' + horasHechas.toFixed(1) + 'h esta semana';
    iconoColor = '#1e7e34'; iconoBg = '#edf7ef';
  } else {
    mensajeTitulo = 'Vas ' + horasHechas.toFixed(1) + 'h esta semana';
    mensajeSub = 'Sigue registrando tus horas de servicio 💪';
  }

  return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:20px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,.04);perspective:900px' + (_dbProgresoAnimar ? ';animation:dbEpicFlip .55s cubic-bezier(.34,1.56,.64,1) both' : '') + '">'
    + dbTabsProgreso()
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2px">'
      + '<div>'
        + '<div style="font-size:13px;font-weight:800;color:var(--tx);letter-spacing:.02em">Progreso semanal</div>'
        + '<div style="font-size:11px;color:var(--tx3);margin-top:2px">' + (planSemana > 0 ? 'Según tu plan en Mi Horario' : 'Aún no tienes plan en Mi Horario') + '</div>'
      + '</div>'
      + '<div style="text-align:right;background:#f3e5f5;padding:5px 12px;border-radius:10px">'
          + '<div style="font-size:15px;font-weight:900;color:#7b1fa2;line-height:1">' + horasHechas.toFixed(1) + (planSemana > 0 ? 'h / ' + planSemana + 'h' : 'h') + '</div>'
          + '<div style="font-size:8.5px;font-weight:700;color:#7b1fa2;opacity:.7;text-transform:uppercase;letter-spacing:.05em">esta semana</div>'
        + '</div>'
    + '</div>'
    + barrasSvg
    + '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;align-items:center;gap:10px">'
      + '<div style="width:32px;height:32px;border-radius:10px;background:' + iconoBg + ';color:' + iconoColor + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>'
      + '</div>'
      + '<div>'
        + '<div style="font-size:12px;font-weight:600;color:var(--tx2)">' + mensajeTitulo + '</div>'
        + '<div style="font-size:10.5px;color:var(--tx3);margin-top:2px">' + mensajeSub + '</div>'
      + '</div>'
    + '</div>'
    + (datosIncompletos ? '<div style="font-size:9.5px;color:var(--tx3);margin-top:8px;text-align:center">Cargando datos de la semana…</div>' : '')
  + '</div>';
}

let _horarioDiaAbierto = HORARIO_DIAS[(new Date().getDay()+6)%7];

function horarioToggleDia(dia) {
  const scrollEl = document.getElementById('horarioBody');
  const scrollTop = scrollEl ? scrollEl.scrollTop : 0;
  _horarioDiaAbierto = (_horarioDiaAbierto === dia) ? null : dia;
  buildHorario();
  if (scrollEl) scrollEl.scrollTop = scrollTop;
}

function horarioSetValor(dia, turno, valor) {
  if (!horarioCache) horarioCache = { dias: {}, meta: 0 };
  if (!horarioCache.dias[dia]) horarioCache.dias[dia] = {};
  const n = parseFloat(valor);
  const horasFinal = (n > 0) ? n : 0;
  horarioCache.dias[dia][turno] = horasFinal;
  horarioActualizarTotales();
  const parcial = {}; parcial[dia] = {}; parcial[dia][turno] = horasFinal;
  horarioGuardarBackend(parcial, undefined);
}

function horarioActualizarTotales() {
  const data = horarioLeer();
  const meta = horarioLeerMeta();
  let totalSemana = 0;
  HORARIO_DIAS.forEach(function(dia){
    const valores = data[dia] || {};
    let totalDia = 0;
    HORARIO_TURNOS.forEach(function(t){ totalDia += (valores[t]||0); });
    totalSemana += totalDia;
    const elDia = document.getElementById('horarioDiaTotal-' + dia);
    if (elDia) { elDia.textContent = totalDia + 'h'; elDia.style.color = totalDia>0 ? 'var(--navy)' : 'var(--tx3)'; }
  });
  if (horarioCache) horarioCache.meta = totalSemana;
  horarioGuardarBackend(undefined, totalSemana);
  const promedioDiario = totalSemana / 7;
  const pctMeta = totalSemana > 0 ? 100 : 0;
  const ringR = 26, ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (ringC * pctMeta / 100);

  const totalEl = document.getElementById('horarioTotalSemanaNum'); if (totalEl) totalEl.textContent = totalSemana + 'h';
  const promEl = document.getElementById('horarioPromedioDia'); if (promEl) promEl.textContent = '≈ ' + promedioDiario.toFixed(1) + 'h por día';
  const pctEl = document.getElementById('horarioPctMetaNum'); if (pctEl) pctEl.textContent = pctMeta + '%';
  const ringEl = document.getElementById('horarioRingProgress'); if (ringEl) ringEl.setAttribute('stroke-dashoffset', ringOffset.toFixed(1));
  const metaTextEl = document.getElementById('horarioMetaTextNum'); if (metaTextEl) metaTextEl.textContent = totalSemana + 'h / ' + meta + 'h';
  const motivTitle = document.getElementById('horarioMotivTitle'); if (motivTitle) motivTitle.textContent = meta>0 ? '¡Sigue adelante!' : 'Empecemos';
  const motivSub = document.getElementById('horarioMotivSub'); if (motivSub) motivSub.textContent = meta>0 ? ('Vas ' + pctMeta + '% de tu meta esta semana.') : 'Establece tu meta semanal y comienza a registrar horas.';
}

function horarioLeerMeta() {
  return (horarioCache && horarioCache.meta) || 0;
}
function horarioSetMeta(v) {
  if (!horarioCache) horarioCache = { dias: {}, meta: 0 };
  const n = parseFloat(v);
  horarioCache.meta = (n > 0) ? n : 0;
  buildHorario();
  horarioGuardarBackend(undefined, horarioCache.meta);
  if (currentView === 'dashboard') buildDashboard();
}
function horarioAbrirMetaModal() {
  const old = document.getElementById('horarioMetaModal');
  if (old) old.remove();
  const actual = horarioLeerMeta();
  const modal = document.createElement('div');
  modal.id = 'horarioMetaModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:24px;max-width:300px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px;text-align:center">Meta semanal</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:18px;text-align:center">¿Cuántas horas quieres hacer en total esta semana?</div>'
    + '<input id="horarioMetaInput" type="number" min="0" step="1" value="' + (actual || '') + '" placeholder="0" style="width:100%;padding:16px;border:1.5px solid var(--border);border-radius:14px;font-size:26px;font-weight:800;font-family:var(--f-sans);text-align:center;color:var(--navy);background:var(--input-bg);margin-bottom:16px;box-sizing:border-box">'
    + '<button onclick="horarioSetMeta(document.getElementById(&quot;horarioMetaInput&quot;).value);document.getElementById(&quot;horarioMetaModal&quot;).remove();" style="width:100%;padding:14px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(26,43,64,.2);margin-bottom:8px">Guardar</button>'
    + '<button onclick="document.getElementById(&quot;horarioMetaModal&quot;).remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
  setTimeout(function(){ document.getElementById('horarioMetaInput')?.focus(); }, 100);
}

const HORARIO_TURNO_ICONS = {
  manana: '<svg viewBox="0 0 24 24" width="12" height="12" fill="#f5a623"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>',
  tarde: '<svg viewBox="0 0 24 24" width="12" height="12" fill="#ff9800"><path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/></svg>',
  noche: '<svg viewBox="0 0 24 24" width="12" height="12" fill="#5c6bc0"><path d="M9.37 5.51c-.18.64-.27 1.31-.27 1.99 0 4.08 3.32 7.4 7.4 7.4.68 0 1.35-.09 1.99-.27C17.45 17.19 14.93 19 12 19c-3.86 0-7-3.14-7-7 0-2.93 1.81-5.45 4.37-6.49zM12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>'
};

function buildHorario() {
  const el = document.getElementById('horarioBody');
  if (!el) return;
  const data = horarioLeer();
  const meta = horarioLeerMeta();

  let totalSemana = 0;
  const diasHtml = HORARIO_DIAS.map(function(dia, i){
    const valores = data[dia] || {};
    let totalDia = 0;
    HORARIO_TURNOS.forEach(function(t){ totalDia += (valores[t]||0); });
    totalSemana += totalDia;
    const abierto = (_horarioDiaAbierto === dia);
    const turnosHtml = abierto
      ? ('<div style="display:flex;gap:8px;margin-top:12px">' + HORARIO_TURNOS.map(function(turno){
          const v = valores[turno] || 0;
          return '<div style="flex:1">'
            + '<div style="display:flex;align-items:center;gap:4px;margin-bottom:5px">' + HORARIO_TURNO_ICONS[turno] + '<label style="font-size:9.5px;font-weight:700;color:var(--tx3)">' + HORARIO_TURNOS_LABEL[turno] + '</label></div>'
            + '<input type="number" min="0" step="0.5" value="' + (v || '') + '" placeholder="0h" oninput="horarioSetValor(\'' + dia + '\',\'' + turno + '\',this.value)" style="width:100%;box-sizing:border-box;padding:9px 6px;border:none;border-radius:99px;font-size:12.5px;font-weight:700;font-family:var(--f-sans);text-align:center;color:var(--navy);background:var(--navy-light)">'
          + '</div>';
        }).join('') + '</div>')
      : '';
    return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:14px;margin-bottom:10px">'
      + '<div onclick="horarioToggleDia(\'' + dia + '\')" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">'
        + '<div style="display:flex;align-items:center;gap:9px">'
          + '<div style="width:28px;height:28px;border-radius:9px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="14" height="14" fill="var(--navy)"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg></div>'
          + '<div style="font-size:13.5px;font-weight:700;color:var(--tx)">' + HORARIO_DIAS_LABEL[i] + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:8px">'
          + '<div id="horarioDiaTotal-' + dia + '" style="font-size:13px;font-weight:800;color:' + (totalDia>0?'var(--navy)':'var(--tx3)') + '">' + totalDia + 'h</div>'
          + '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--tx3)" style="transition:transform .2s;transform:rotate(' + (abierto?'180':'0') + 'deg)"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
        + '</div>'
      + '</div>'
      + turnosHtml
    + '</div>';
  }).join('');

  const hoyH = new Date();
  const diaSemHoyH = hoyH.getDay() === 0 ? 6 : hoyH.getDay() - 1;
  const lunesH = new Date(hoyH);
  lunesH.setDate(hoyH.getDate() - diaSemHoyH);
  let horasRealesSemanaH = 0;
  for (let i = 0; i <= diaSemHoyH; i++) {
    const dH = new Date(lunesH);
    dH.setDate(lunesH.getDate() + i);
    const fH = dH.getFullYear() + '-' + String(dH.getMonth()+1).padStart(2,'0') + '-' + String(dH.getDate()).padStart(2,'0');
    const h = dbObtenerHorasDelDia(fH);
    if (h !== null) horasRealesSemanaH += h;
  }

  el.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
        + '<div style="font-size:19px;font-weight:800;color:var(--tx)">Crear horario</div>'
        + '<div style="width:46px;height:46px;border-radius:14px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
          + '<svg viewBox="0 0 24 24" width="22" height="22" fill="var(--navy)"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
        + '</div>'
      + '</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px">'
      + '<div style="flex:1;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:12px 14px">'
        + '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">Esta semana</div>'
        + '<div style="font-size:19px;font-weight:800;color:var(--navy);margin-top:3px">' + horasRealesSemanaH.toFixed(1) + 'h</div>'
      + '</div>'
      + '<div style="flex:1;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:12px 14px">'
        + '<div style="font-size:10px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.04em">Meta total</div>'
        + '<div style="font-size:19px;font-weight:800;color:var(--tx);margin-top:3px">' + totalSemana + 'h</div>'
      + '</div>'
    + '</div>'
    + '<a href"https://www.jw.org/es/biblioteca/guia-actividades-reunion-testigos-jehova/julio-2016-mwb/programa-reunion-11-17julio/horario-precursor-regular/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:11px;padding:14px;background:var(--card-bg);border:1px solid var(--border);border-radius:16px;margin-bottom:14px;text-decoration:none">'
        + '<div style="width:38px;height:38px;border-radius:11px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
          + '<svg viewBox="0 0 24 24" width="19" height="19" fill="var(--navy)"><path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/></svg>'
        + '</div>'
        + '<div style="flex:1">'
          + '<div style="font-size:13px;font-weight:700;color:var(--tx)">Ejemplos de horario en jw.org</div>'
          + '<div style="font-size:11px;color:var(--tx3);margin-top:1px">Sugerencias oficiales según tu jornada de trabajo</div>'
        + '</div>'
        + '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--tx3)" style="flex-shrink:0"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>'
      + '</a>'
    + diasHtml;
}

function toggleDrawerPrecursorado() {
  const sub = document.getElementById('dnavPrecSub');
  const chev = document.getElementById('dnavPrecChevron');
  const toggle = document.getElementById('dnavPrecToggle');
  if (!sub) return;
  const abierto = sub.style.display === 'flex';
  sub.style.display = abierto ? 'none' : 'flex';
  if (chev) chev.style.transform = abierto ? 'rotate(0deg)' : 'rotate(180deg)';
  if (toggle) toggle.classList.toggle('open', !abierto);
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
  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Contacto recibido';
  document.getElementById('detBody').innerHTML =
    '<div style="font-size:11px;font-weight:600;color:var(--tx3);letter-spacing:.06em;text-transform:uppercase;margin-bottom:14px">Compartido desde Mi Ministerio</div>'
    + '<div class="det-head">'
      + '<div class="det-ava" style="background:' + avaColor(d.nombre) + '">' + initials(d.nombre) + '</div>'
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
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
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
  if (statM) statM.textContent = cards.filter(c => {
    const programadaEsteMes = c.fecha && c.fecha.startsWith(mes);
    const visitadaEsteMes = c.historial && c.historial.some(h => h.fecha && h.fecha.startsWith(mes));
    return programadaEsteMes || visitadaEsteMes;
  }).length;
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
    return '<div class="card" data-card-id="' + c.id + '" ' + delay + ' onclick="openDet(' + c.id + ')" oncontextmenu="event.preventDefault();shareCard(' + c.id + ')" ontouchstart="lp_start(' + c.id + ',event)" ontouchend="lp_end()" ontouchmove="lp_end()">'
      + '<div class="card-row1">'
        + '<div class="ava" style="background:' + avaColor(c.nombre) + '">' + initials(c.nombre) + '</div>'
        + '<div class="card-info">'
          + '<div class="card-name">' + c.nombre + '</div>'
          + '<div class="card-addr">' + (c.dir || t('sin_dir')) + (c.territorio ? ' · ' + c.territorio : '') + '</div>'
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
  var _proxFecha = fmtDate(c.fecha, c.hora);
  var _detHeader = (_proxFecha && _proxFecha !== '—')
    ? '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0 14px;margin-bottom:14px;border-bottom:1px solid var(--border);padding-bottom:14px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--tx3)">Próxima visita: ' + _proxFecha + '</div>'
        + '<button onclick="closeDet()" style="width:34px;height:34px;border-radius:50%;border:none;background:rgba(229,57,53,.08);color:#e53935;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .15s" onmousedown="this.style.transform=\'scale(0.85)\'" onmouseup="this.style.transform=\'scale(1)\'" ontouchstart="this.style.transform=\'scale(0.85)\'" ontouchend="this.style.transform=\'scale(1)\'"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>'
      + '</div>'
    : '<div style="display:flex;justify-content:flex-end;padding:4px 0 10px">'
        + '<button onclick="closeDet()" style="width:34px;height:34px;border-radius:50%;border:none;background:rgba(229,57,53,.08);color:#e53935;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s,transform .15s" onmousedown="this.style.transform=\'scale(0.85)\'" onmouseup="this.style.transform=\'scale(1)\'" ontouchstart="this.style.transform=\'scale(0.85)\'" ontouchend="this.style.transform=\'scale(1)\'"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>'
      + '</div>';
  document.getElementById('detBody').innerHTML =
    _detHeader
    + '<div class="det-head" style="display:flex;align-items:center;gap:13px">'
      + '<div class="det-ava" style="background:' + avaColor(c.nombre) + '">' + initials(c.nombre) + '</div>'
      + '<div style="flex:1;min-width:0">'
        + '<div class="det-name">' + c.nombre + '</div>'
        + '<div class="det-tipo">' + (c.tipo==='estudio'?t('estudio'):t('revisita')) + ' &nbsp;<span class="badge ' + bc + '">' + bl + '</span></div>'
      + '</div>'
    + '</div>'
    + drow('Territorio',         c.territorio || '—')
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
    + (c.tipo === 'estudio'
        ? '<div style="display:flex;gap:8px;margin-top:10px">'
            + '<button class="btn-cancel" style="flex:1;margin-top:0;background:#fdf0f0;border:1.5px solid rgba(192,57,43,.3);color:#c0392b;display:flex;align-items:center;justify-content:center;gap:6px;font-weight:700" onclick="markVisited(' + id + ',&quot;no_encontrado&quot;)"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>No encontrado</button>'
            + '<button class="btn-save" style="flex:1;margin-top:0" onclick="markVisited(' + id + ',&quot;visitado&quot;)">Visitado</button>'
          + '</div>'
        : '<button class="btn-save" style="margin-top:10px" onclick="markVisited(' + id + ',&quot;visitado&quot;)">' + t('visita_completada') + '</button>')
    + '<button class="btn-cancel" onclick="closeDet()">' + t('cerrar') + '</button>';
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
  updateFabVisibility();
}

function closeDet() {
  var bg = document.getElementById('detBg');
  var panel = document.getElementById('detPanel');
  bg.style.pointerEvents = 'none';
  panel.style.transition = 'transform .3s cubic-bezier(.4,0,.2,1)';
  panel.style.transform = 'translateY(100%)';
  bg.style.transition = 'background .3s ease';
  bg.style.background = 'transparent';
  setTimeout(function() {
    bg.classList.remove('open', 'chat-fullscreen');
    bg.style.cssText = '';
    panel.style.cssText = '';
    updateFabVisibility();
  }, 310);
}

async function markVisited(id, resultado) {
  const c = cards.find(x => x.id === id); if (!c) return;
  resultado = resultado || 'visitado';

  // 1. Registrar visita real en la BD (tabla visitas)
  try {
    await fetch(API_URL + '/personas/' + id + '/visitas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('st_token') },
      body: JSON.stringify({ publicacion: c.pub || null, notas: c.notas || null, resultado: resultado })
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
  c.historial.push({ fecha: today(), hora: '', nota: t('visita_reg_ok') || 'Visita realizada', resultado: resultado });

  closeDet(); updateStats(); renderList();
  toast(resultado === 'no_encontrado' ? 'Sin problema, sigue intentando 🙂' : (t('visita_reg_ok') || '✔ Visita registrada'));

  // 4. Redirigir a historial/visitados
  setTimeout(() => goTo('history'), 600);
}
/* ================================================================
   FORMULARIO
================================================================ */
let _formCloseTimer = null;
function openForm(editData) {
  if (_formCloseTimer) { clearTimeout(_formCloseTimer); _formCloseTimer = null; }
  const bgYaAbierto = document.getElementById('formBg');
  if (bgYaAbierto) { bgYaAbierto.style.cssText = ''; }
  const panelYaAbierto = document.getElementById('formPanel');
  if (panelYaAbierto) { panelYaAbierto.style.cssText = ''; }
  resetMap();
  const title = document.getElementById('formTitle');
  const btn   = document.getElementById('saveBtn');
  if (!title || !btn) { 
    console.error('formPanel no tiene los elementos esperados');
    return; 
  }
  btn.disabled = false;
  if (editData) {
    title.textContent = t('editar_persona'); btn.textContent = t('guardar_cambios');
    document.getElementById('fNombre').value = editData.nombre || '';
    document.getElementById('fTerritorio').value = editData.territorio || '';
    document.getElementById('fDir').value    = editData.dir    || '';
    document.getElementById('fTel').value    = editData.tel    || '';
    document.getElementById('fTipo').value   = editData.tipo   || 'revisita';
    document.getElementById('fPub').value    = editData.pub    || '';
    document.getElementById('fFecha').value  = editData.fecha  || today();
    document.getElementById('fHora').value   = editData.hora   || '';
    document.getElementById('fEstado').value = editData.estado || 'pendiente';
    document.getElementById('fNotas').value  = editData.notas  || '';
    document.getElementById('fId').value     = editData.id;
    document.getElementById('fRecordatorio').value = editData.recordatorio_tipo || 'una_vez';
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
    ['fNombre','fTerritorio','fDir','fTel','fPub','fHora','fNotas'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
    document.getElementById('fFecha').value  = today();
    document.getElementById('fTipo').value   = 'revisita';
    document.getElementById('fEstado').value = 'pendiente';
    document.getElementById('fId').value     = '';
    document.getElementById('fRecordatorio').value = 'una_vez';
  }
  document.getElementById('formBg').classList.add('open');
  updateFabVisibility(); 
}

function smartCloseForm() {
  var panel = document.getElementById('formPanel');
  var hasData = false;
  var inputs = panel.querySelectorAll('input[type="text"], input[type="tel"], textarea');
  inputs.forEach(function(inp) { if (inp.value.trim()) hasData = true; });
  
  if (hasData) {
    // Modal de confirmación
    var overlay = document.createElement('div');
    overlay.id = 'formCloseConfirm';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
    overlay.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:28px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
      + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(46,107,230,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">'
        + '<svg viewBox="0 0 24 24" width="28" height="28" fill="#2e6be6"><path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/></svg>'
      + '</div>'
      + '<div style="font-size:18px;font-weight:800;color:var(--tx);margin-bottom:8px">¿Qué quieres hacer?</div>'
      + '<div style="font-size:14px;color:var(--tx3);line-height:1.6;margin-bottom:24px">Tienes datos sin guardar. ¿Deseas guardarlos o descartarlos?</div>'
      + '<div style="display:flex;flex-direction:column;gap:8px">'
        + '<button onclick="document.getElementById(\'formCloseConfirm\').remove();saveCard()" style="width:100%;padding:14px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(26,43,64,.2)">Guardar persona</button>'
        + '<button onclick="document.getElementById(\'formCloseConfirm\').remove();closeForm()" style="width:100%;padding:14px;border:1.5px solid #e53935;background:transparent;color:#e53935;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Descartar</button>'
        + '<button onclick="document.getElementById(\'formCloseConfirm\').remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Seguir editando</button>'
      + '</div>'
    + '</div>';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    if (!document.getElementById('dcAnims')) {
      var s = document.createElement('style');
      s.id = 'dcAnims';
      s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
      document.head.appendChild(s);
    }
  } else {
    closeForm();
  }
}

function closeForm() { 
  var bg = document.getElementById('formBg');
  var panel = document.getElementById('formPanel');
  bg.style.pointerEvents = 'none';
  panel.style.transition = 'transform .3s cubic-bezier(.4,0,.2,1)';
  panel.style.transform = 'translateY(100%)';
  if (_formCloseTimer) clearTimeout(_formCloseTimer);
  _formCloseTimer = setTimeout(function() {
    bg.classList.remove('open');
    panel.style.cssText = '';
    updateFabVisibility();
    _formCloseTimer = null;
  }, 300);
}

// ═══ BOTTOM SHEET DRAG (genérico) ═══
function initSheetDrag(bgId, panelId, closeFn, checkData) {
  var panel = document.getElementById(panelId);
  var bg = document.getElementById(bgId);
  if (!panel || !bg) return;
  var bar = panel.querySelector('.panel-bar');
  var hdr = panel.querySelector('.panel-hdr');
  var startY, currentY, panelH, isDragging = false;

  function onStart(e) {
    if (!bg.classList.contains('open')) return;
    if (e.target.closest('button, .panel-close, [onclick]')) return;
    isDragging = true;
    startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    currentY = startY;
    panelH = panel.offsetHeight;
    panel.style.transition = 'none';
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchend', onEnd);
    document.addEventListener('mouseup', onEnd);
    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
  }

  function onMove(e) {
    if (!isDragging) return;
    currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
    var delta = currentY - startY;
    if (delta < 0) delta = 0;
    panel.style.transform = 'translateY(' + delta + 'px)';
    // Atenuar backdrop proporcionalmente
    var opacity = Math.max(0, 0.45 - (delta / panelH) * 0.45);
    bg.style.background = 'rgba(10,15,25,' + opacity.toFixed(2) + ')';
    if (e.cancelable) e.preventDefault();
  }

  function onEnd() {
    if (!isDragging) return;
    isDragging = false;
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('touchend', onEnd);
    document.removeEventListener('mouseup', onEnd);
    var delta = currentY - startY;
    if (delta < 0) delta = 0;
    panel.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
    if (delta > panelH * 0.35) {
      if (checkData) {
        var hasData = false;
        panel.querySelectorAll('input[type="text"],input[type="tel"],textarea').forEach(function(inp) { if (inp.value.trim()) hasData = true; });
        if (hasData) { panel.style.transform = 'translateY(0)'; smartCloseForm(); return; }
      }
      closeFn();
    } else {
      panel.style.transform = 'translateY(0)';
      panel.style.position = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.width = '';
      panel.style.maxWidth = '';
      panel.style.maxHeight = '';
      panel.style.height = '';
      panel.style.borderRadius = '';
      bg.style.background = 'rgba(10,15,25,.45)';
    }
  }

  function addListeners(el) {
    if (!el || el.dataset.sheetDrag) return;
    el.dataset.sheetDrag = 'true';
    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('mousedown', onStart);
  }

  if (bar) addListeners(bar);
  if (hdr) addListeners(hdr);
}

// Observar apertura de paneles para inicializar drag
(function() {
  var mo = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.target.classList.contains('open')) {
        setTimeout(function() {
          if (m.target.id === 'formBg') initSheetDrag('formBg', 'formPanel', closeForm, true);
          if (m.target.id === 'detBg') initSheetDrag('detBg', 'detPanel', closeDet, false);
          if (m.target.id === 'moreBg') initSheetDrag('moreBg', 'morePanel', closeMoreSheet, false);
          if (m.target.id === 'asigFormBg') initSheetDrag('asigFormBg', 'asigFormPanel', closeAsigForm, false);
        }, 100);
      }
    });
  });
  document.addEventListener('DOMContentLoaded', function() {
    ['formBg', 'detBg', 'moreBg', 'asigFormBg'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  });
})();
function resetMap()  { clearGPS(); }

function openMoreSheet() {
  document.getElementById('moreBg').classList.add('open');
  updateFabVisibility();
}
function closeMoreSheet() {
  var bg = document.getElementById('moreBg');
  var panel = document.getElementById('morePanel');
  panel.style.transition = 'transform .3s cubic-bezier(.4,0,.2,1)';
  panel.style.transform = 'translateY(100%)';
  setTimeout(function() {
    bg.classList.remove('open');
    panel.style.cssText = '';
    updateFabVisibility();
  }, 300);
}
function editCard(id) { closeDet(); const c = cards.find(x => x.id === id); if(c) openForm(c); }

async function deleteCard(id) {
  var c = cards.find(function(x) { return x.id === id; });
  var nombre = c ? c.nombre : 'esta persona';
  // Crear modal de confirmación
  var overlay = document.createElement('div');
  overlay.id = 'deleteConfirm';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  overlay.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:28px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(229,57,53,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">'
      + '<svg viewBox="0 0 24 24" width="28" height="28" fill="#e53935"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
    + '</div>'
    + '<div style="font-size:18px;font-weight:800;color:var(--tx);margin-bottom:8px">¿Eliminar persona?</div>'
    + '<div style="font-size:14px;color:var(--tx3);line-height:1.6;margin-bottom:24px">¿Estás seguro de que quieres eliminar a <strong style="color:var(--tx)">' + nombre + '</strong>? ¿Ya intentaste buscarlo(a) en otro horario?</div>'
    + '<div style="display:flex;gap:10px">'
      + '<button onclick="document.getElementById(\'deleteConfirm\').remove()" style="flex:1;padding:14px;border:1.5px solid var(--border);background:var(--surface);color:var(--tx);border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);transition:background .15s">Cancelar</button>'
      + '<button onclick="confirmDelete(' + id + ')" style="flex:1;padding:14px;border:none;background:#e53935;color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);transition:transform .15s;box-shadow:0 4px 12px rgba(229,57,53,.3)">Eliminar</button>'
    + '</div>'
  + '</div>';
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  // Inyectar animaciones si no existen
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}
async function confirmDelete(id) {
  var overlay = document.getElementById('deleteConfirm');
  if (overlay) overlay.remove();
  closeDet();

  goTo('home');
  setTimeout(function(){
    const tarjeta = document.querySelector('[data-card-id="' + id + '"]');
    if (tarjeta) {
      tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(function(){ dbAnimarEliminacion(tarjeta); }, 350);
    }
  }, 200);

  const esperaAnimacion = 750;
  setTimeout(async function(){
    await cancelCard(id);
    await apiDeletePersona(id);
    cards = cards.filter(function(x) { return x.id !== id; });
    updateStats(); renderList();
    toast(t('eliminado'));
  }, esperaAnimacion);
}

function dbAnimarEliminacion(tarjeta) {
  const rect = tarjeta.getBoundingClientRect();
  tarjeta.style.transition = 'transform .55s cubic-bezier(.4,0,.6,1), opacity .55s ease';
  tarjeta.style.transformOrigin = 'center';
  tarjeta.style.transform = 'scale(.7) rotate(6deg)';
  tarjeta.style.opacity = '0';

  const numParticulas = 16;
  for (let i = 0; i < numParticulas; i++) {
    const p = document.createElement('div');
    const angulo = (Math.PI * 2 * i) / numParticulas + Math.random() * 0.4;
    const distancia = 40 + Math.random() * 60;
    const tam = 3 + Math.random() * 5;
    p.style.cssText = 'position:fixed;left:' + (rect.left + rect.width/2) + 'px;top:' + (rect.top + rect.height/2) + 'px;width:' + tam + 'px;height:' + tam + 'px;background:#c0392b;border-radius:50%;pointer-events:none;z-index:99999;opacity:.85;transition:transform .6s cubic-bezier(.2,.8,.3,1),opacity .6s ease';
    document.body.appendChild(p);
    requestAnimationFrame(function(){
      p.style.transform = 'translate(' + (Math.cos(angulo)*distancia) + 'px,' + (Math.sin(angulo)*distancia - 20) + 'px) scale(0)';
      p.style.opacity = '0';
    });
    setTimeout(function(){ p.remove(); }, 700);
  }
}

var _saving = false;
async function saveCard() {
  if (_saving) return;
  _saving = true;
  var safetyTimer = setTimeout(function() { _saving = false; var b = document.getElementById('saveBtn'); if (b) { b.disabled = false; b.textContent = 'Guardar'; } toast('La conexion tarda demasiado. Intenta de nuevo.'); }, 15000);
  const nombre = document.getElementById('fNombre').value.trim();
  if (!nombre) { _saving = false; clearTimeout(safetyTimer); toast(t('nombre_req')); return; }
  const eid = document.getElementById('fId').value;
  const d = {
    nombre,
    territorio: document.getElementById('fTerritorio').value.trim(),
    direccion: document.getElementById('fDir').value.trim(),
    gps_lat:   document.getElementById('fLat').value || null,
    gps_lng:   document.getElementById('fLng').value || null,
    telefono:  document.getElementById('fTel').value.trim(),
    tipo:      document.getElementById('fTipo').value,
    estado:    document.getElementById('fEstado').value,
    notas:     document.getElementById('fNotas').value.trim(),
    proxima_visita:      document.getElementById('fFecha').value || null,
    proxima_visita_hora: document.getElementById('fHora').value || null,
    recordatorio_tipo:   document.getElementById('fRecordatorio').value,
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
        territorio: p.territorio || '',
        fecha: p.proxima_visita ? p.proxima_visita.split('T')[0] : '',
        hora:  p.proxima_visita_hora ? p.proxima_visita_hora.substring(0,5) : '',
        historial: []
      }));
    }

    clearTimeout(safetyTimer);
    _saving = false;
    if (saveBtn) saveBtn.disabled = false;
    closeForm(); updateStats(); renderList();
    toast(eid ? t('guardado') : t('agregado'));
  } catch(e) {
    clearTimeout(safetyTimer);
    _saving = false;
    toast('Error al guardar. Intenta de nuevo.');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = btnText; }
  }
}
/* ================================================================
   PRECURSORADO
================================================================ */
function precTipoOption(tipo, label, metaText, bg, color) {
  var sel = prec.tipo === tipo;
  return '<div onclick="setTipo(\'' + tipo + '\')" style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;cursor:pointer;transition:background .12s;background:' + (sel ? bg : 'transparent') + ';margin-bottom:4px">'
    + '<div style="width:36px;height:36px;border-radius:10px;background:' + bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="' + color + '"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
    + '</div>'
    + '<div style="flex:1">'
      + '<div style="font-size:14px;font-weight:' + (sel ? '700' : '500') + ';color:var(--tx)">' + label + '</div>'
      + '<div style="font-size:11px;color:var(--tx3)">' + metaText + '</div>'
    + '</div>'
    + '<div style="width:20px;height:20px;border-radius:50%;border:2px solid ' + (sel ? color : 'var(--border-dk)') + ';background:' + (sel ? color : 'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
      + (sel ? '<div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>' : '')
    + '</div>'
  + '</div>';
}

function togglePrecTipo() {
  var drawer = document.getElementById('precTipoDrawer');
  var chev = document.getElementById('precTipoChev');
  if (!drawer) return;
  var open = drawer.style.maxHeight === '0px' || !drawer.style.maxHeight;
  drawer.style.maxHeight = open ? '400px' : '0px';
  if (chev) chev.style.transform = open ? 'rotate(180deg)' : '';
}

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
  const metaPublicadorActiva = localStorage.getItem('metaPublicadorActiva') === '1';
  const esPrecursor = prec.tipo !== 'publicador' || metaPublicadorActiva;
  const meta = prec.tipo==='regular' ? prec.metaReg : prec.tipo==='especial' ? prec.metaEsp : prec.tipo==='auxiliar' ? prec.metaAux : (parseInt(localStorage.getItem('metaPublicadorHoras')) || 20);
  const pct  = esPrecursor ? Math.min(100, Math.round(prec.horas / meta * 100)) : 0;
  const tipoLabel = {
    auxiliar:   t('auxiliar') + ' (Precursor)',
    regular:    t('regular')  + ' (Precursor)',
    especial:   t('especial') + ' (Precursor)',
    publicador: t('publicador') || 'Publicador',
  }[prec.tipo] || prec.tipo;

  const heroSection = esPrecursor
    ? '<div class="prec-big"><span id="precCounter">0</span><span class="prec-of"> / ' + formatoHorasReloj(meta) + '</span></div>'
      + '<div class="prec-pct">' + pct + '% completado</div>'
      + '<div class="prog-track"><div class="prog-fill" style="width:' + pct + '%"></div></div>'
      + '<div style="display:flex;gap:8px;margin-top:16px">'
        + '<button onclick="addH(1)" style="flex:1;padding:14px 4px;border:1.5px solid var(--navy-bd);border-radius:12px;background:var(--navy-light);color:var(--navy);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">+1 hora</button>'
        + '<button onclick="addH(2)" style="flex:1;padding:14px 4px;border:1.5px solid var(--navy-bd);border-radius:12px;background:var(--navy-light);color:var(--navy);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">+2 horas</button>'
        + '<button id="precManualBtn" onclick="togglePrecManual()" style="flex:1;padding:14px 4px;border:1.5px solid var(--navy-bd);border-radius:12px;background:var(--navy-light);color:var(--navy);font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans);display:flex;align-items:center;justify-content:center;gap:5px">'
          + 'Manual'
          + '<svg id="precManualChev" viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="transition:transform .2s"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
        + '</button>'
      + '</div>'
      + '<div id="precManualWrap" style="max-height:0;overflow:hidden;transition:max-height .3s ease">'
        + dbHtmlRuedaHorasPrec()
        + '<button class="prec-btn-sub" style="width:100%;box-sizing:border-box;height:47px;display:flex;align-items:center;justify-content:center;white-space:nowrap;margin-top:8px" onclick="subH()">− 1 hora</button>'
      + '</div>'
      + '<button onclick="dbAbrirCalendarioHoras()" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px;padding:13px;border-radius:12px;border:1.5px dashed var(--navy-bd);background:var(--navy-light);color:var(--navy);font-size:13px;font-weight:700;cursor:pointer">'
        + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
        + 'Registrar en el calendario'
      + '</button>'
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
    + '<div class="sc" style="margin-top:16px;border-radius:16px;overflow:hidden">'
      + '<div class="sc-row" style="cursor:pointer;padding:16px" onclick="togglePrecTipo()">'
        + '<div style="display:flex;align-items:center;gap:12px;flex:1">'
          + '<div style="width:40px;height:40px;border-radius:12px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;flex-shrink:0">'
            + '<svg viewBox="0 0 24 24" width="20" height="20" fill="var(--navy)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
          + '</div>'
          + '<div>'
            + '<div style="font-size:15px;font-weight:700;color:var(--tx)">' + tipoLabel + '</div>'
            + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">' + (esPrecursor ? 'Meta: ' + meta + 'h / mes' : 'Sin registro de horas') + '</div>'
          + '</div>'
        + '</div>'
        + '<svg id="precTipoChev" viewBox="0 0 24 24" width="18" height="18" fill="var(--tx3)" style="flex-shrink:0;transition:transform .25s"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
      + '</div>'
      + '<div id="precTipoDrawer" style="max-height:0;overflow:hidden;transition:max-height .3s ease">'
        + '<div style="border-top:1px solid var(--border);padding:8px">'
          + precTipoOption('publicador', t('publicador')||'Publicador', 'Sin registro de horas', '#f5f5f5', '#616161')
          + precTipoOption('auxiliar', t('auxiliar'), 'Meta: ' + prec.metaAux + 'h / mes', '#eef3fa', '#2e6be6')
          + precTipoOption('regular', t('regular'), 'Meta: ' + prec.metaReg + 'h / mes', '#edf7ef', '#1e7e34')
          + precTipoOption('especial', t('especial'), 'Meta: ' + prec.metaEsp + 'h / mes', '#f3e5f5', '#7b1fa2')
        + '</div>'
      + '</div>'
    + '</div>'
    + (prec.tipo !== 'publicador'
      ? '<button onclick="resetH()" style="width:100%;margin-top:12px;padding:14px;background:var(--navy);color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:700;font-family:var(--f-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 10px rgba(26,43,64,.2);transition:opacity .15s">'
          + '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>'
          + 'Nuevo mes'
        + '</button>'
      : (metaPublicadorActiva
          ? '<div class="sc" style="margin-top:12px;border-radius:16px;overflow:hidden">'
              + '<div class="sc-row" style="padding:16px">'
                + '<div style="display:flex;align-items:center;gap:12px;flex:1">'
                  + '<div style="width:40px;height:40px;border-radius:12px;background:#fff8ee;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
                    + '<svg viewBox="0 0 24 24" width="20" height="20" fill="#a0660a"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>'
                  + '</div>'
                  + '<div>'
                    + '<div style="font-size:14px;font-weight:700;color:var(--tx)">Mi meta personal</div>'
                    + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">Horas que quieres alcanzar al mes</div>'
                  + '</div>'
                + '</div>'
                + '<input type="number" min="1" max="300" value="' + meta + '" oninput="setMetaPublicador(this.value)" style="width:70px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-weight:700;font-family:var(--f-sans);text-align:center;color:var(--navy);background:var(--input-bg)">'
              + '</div>'
            + '</div>'
            + '<button onclick="desactivarMetaPublicador()" style="width:100%;margin-top:12px;padding:12px;background:rgba(192,57,43,.06);border:1.5px solid rgba(192,57,43,.2);color:#c0392b;border-radius:14px;font-size:13px;font-weight:700;font-family:var(--f-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,transform .1s" onmousedown="this.style.transform=\'scale(.98)\'" onmouseup="this.style.transform=\'\'" onmouseover="this.style.background=\'rgba(192,57,43,.1)\'" onmouseout="this.style.background=\'rgba(192,57,43,.06)\'">'
              + '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
              + 'Quitar mi meta personal'
            + '</button>'
            + '<button onclick="resetH()" style="width:100%;margin-top:6px;padding:14px;background:var(--navy);color:#fff;border:none;border-radius:14px;font-size:14px;font-weight:700;font-family:var(--f-sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 2px 10px rgba(26,43,64,.2)">'
              + '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>'
              + 'Nuevo mes'
            + '</button>'
          : '<div class="sc" style="margin-top:12px;border-radius:16px;overflow:hidden;padding:18px 16px;text-align:center">'
              + '<div style="font-size:14px;font-weight:700;color:var(--tx);margin-bottom:4px">¿Quieres ponerte una meta de horas?</div>'
              + '<div style="font-size:12px;color:var(--tx3);margin-bottom:14px;line-height:1.5">Puedes fijar un objetivo personal, aunque no seas precursor</div>'
              + '<div style="display:flex;gap:8px">'
                + '<button onclick="activarMetaPublicador()" style="flex:1;padding:12px;background:var(--navy);color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:700;font-family:var(--f-sans);cursor:pointer">Sí</button>'
                + '<button onclick="localStorage.setItem(&quot;metaPublicadorActiva&quot;,&quot;0&quot;)" style="flex:1;padding:12px;background:transparent;border:1.5px solid var(--border);color:var(--tx3);border-radius:12px;font-size:13px;font-weight:700;font-family:var(--f-sans);cursor:pointer">No</button>'
              + '</div>'
            + '</div>'
        )
      )


    if (!window._precLoaded) {
      setTimeout(() => animateNumber('precCounter', 0, prec.horas), 100);
      window._precLoaded = true;
    } else {
      setTimeout(() => {
        const el = document.getElementById('precCounter');
        if (el) el.textContent = formatoHorasReloj(prec.horas);
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
  setTimeout(dbActivarRuedaHorasPrec, 60);
  requestAnimationFrame(() => {
    const el = document.getElementById('precCounter');
    if (el) {
      el.classList.remove('prec-pop');
      void el.offsetWidth;
      el.classList.add('prec-pop');
    }
  });
  toast('+' + n + 'h registrada');
  delete _dbHorasDiariasCachePorMes[mesKey()];
  if (currentView === 'dashboard') buildDashboard();
}

async function subH() {
  const result = await apiAddHoras(-1);
  prec.horas = Math.max(0, result.total);
  prec.ultimoRegistro = new Date().toISOString();
  buildPrec();
  setTimeout(dbActivarRuedaHorasPrec, 60);
  delete _dbHorasDiariasCachePorMes[mesKey()];
  if (currentView === 'dashboard') buildDashboard();
}

function activarMetaPublicador() {
  localStorage.setItem('metaPublicadorActiva', '1');
  localStorage.setItem('metaPublicadorHoras', '20');
  buildPrec();
}
function setMetaPublicador(v) {
  const n = parseInt(v);
  if (n > 0) localStorage.setItem('metaPublicadorHoras', String(n));
}
function desactivarMetaPublicador() {
  const modal = document.createElement('div');
  modal.id = 'metaConfirmModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:28px 24px;max-width:320px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="width:56px;height:56px;border-radius:50%;background:rgba(192,57,43,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">'
      + '<svg viewBox="0 0 24 24" width="28" height="28" fill="#c0392b"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>'
    + '</div>'
    + '<div style="font-size:18px;font-weight:800;color:var(--tx);margin-bottom:8px">¿Quitar tu meta personal?</div>'
    + '<div style="font-size:14px;color:var(--tx3);line-height:1.6;margin-bottom:24px">Tu progreso ya registrado no se pierde, pero dejarás de ver el gráfico y los botones de horas hasta que la actives de nuevo.</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button onclick="document.getElementById(\'metaConfirmModal\').remove();localStorage.setItem(\'metaPublicadorActiva\',\'0\');buildPrec();" style="width:100%;padding:14px;border:none;background:#c0392b;color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(192,57,43,.2)">Sí, quitar</button>'
      + '<button onclick="document.getElementById(\'metaConfirmModal\').remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
    + '</div>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}

function abrirModalHorasCustom() {
  const old = document.getElementById('horasCustomModal');
  if (old) old.remove();
  const modal = document.createElement('div');
  modal.id = 'horasCustomModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:24px;max-width:300px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px;text-align:center">Agregar horas</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:18px;text-align:center">Escribe la cantidad exacta</div>'
    + '<input id="precHorasCustom" type="number" min="0.5" step="0.5" placeholder="0" autofocus style="width:100%;padding:16px;border:1.5px solid var(--border);border-radius:14px;font-size:26px;font-weight:800;font-family:var(--f-sans);text-align:center;color:var(--navy);background:var(--input-bg);margin-bottom:14px">'
    + '<div style="display:flex;gap:6px;margin-bottom:16px">'
      + '<button onclick="document.getElementById(\'precHorasCustom\').value=0.5" style="flex:1;padding:9px;border:1px solid var(--border);background:var(--bg);color:var(--tx3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">30 min</button>'
      + '<button onclick="document.getElementById(\'precHorasCustom\').value=1.5" style="flex:1;padding:9px;border:1px solid var(--border);background:var(--bg);color:var(--tx3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">1.5h</button>'
      + '<button onclick="document.getElementById(\'precHorasCustom\').value=3" style="flex:1;padding:9px;border:1px solid var(--border);background:var(--bg);color:var(--tx3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">3h</button>'
      + '<button onclick="document.getElementById(\'precHorasCustom\').value=4" style="flex:1;padding:9px;border:1px solid var(--border);background:var(--bg);color:var(--tx3);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer">4h</button>'
    + '</div>'
    + '<div style="display:flex;flex-direction:column;gap:8px">'
      + '<button onclick="confirmarHorasCustom()" style="width:100%;padding:14px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(26,43,64,.2)">Agregar</button>'
      + '<button onclick="document.getElementById(\'horasCustomModal\').remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
    + '</div>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
  setTimeout(function(){ document.getElementById('precHorasCustom')?.focus(); }, 100);
}

function confirmarHorasCustom() {
  const v = parseFloat(document.getElementById('precHorasCustom').value);
  if (!(v > 0)) { toast('Ingresa una cantidad válida'); return; }
  document.getElementById('horasCustomModal')?.remove();
  addH(v);
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
  const estudiosMes  = cards.filter(c => c.tipo==='estudio').length;

  let html =
    '<div class="inf-header" style="position:relative;overflow:hidden">'
      + '<div style="position:absolute;top:-30px;right:-30px;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.06)"></div>'
      + '<div style="position:absolute;bottom:-20px;left:-20px;width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,.04)"></div>'
      + '<div style="position:relative;z-index:1">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">'
          + '<div style="width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center">'
            + '<svg viewBox="0 0 24 24" width="22" height="22" fill="#fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>'
          + '</div>'
          + '<div>'
            + '<div style="font-size:18px;font-weight:800;color:#fff;letter-spacing:-.3px">Informe mensual</div>'
            + '<div style="font-size:13px;color:rgba(255,255,255,.5);font-weight:500;margin-top:2px">' + mesNombre() + '</div>'
          + '</div>'
        + '</div>'
        + '<div style="background:rgba(255,255,255,.08);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:8px">'
          + '<svg viewBox="0 0 24 24" width="14" height="14" fill="rgba(255,255,255,.4)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>'
          + '<div style="font-size:12px;color:rgba(255,255,255,.5)">Toca Enviar cuando estés listo</div>'
        + '</div>'
      + '</div>'
    + '</div>'

    // ── Pie Stats ──
    + (function(){
      var revs = cards.filter(function(c){return c.tipo==="revisita"}).length;
      var ests = estudiosMes;
      var asigComp = 0;
      try { asigComp = asignaciones.filter(function(a){return a.completada}).length; } catch(e){}
      var horas = esPrecursor ? prec.horas : 0;
      var totalNum = horas + revs + ests;
      if (totalNum === 0) return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:22px;padding:28px;margin-top:16px;margin-bottom:16px;text-align:center"><div style="font-size:13px;color:var(--tx3)">Registra tu primera actividad para ver el resumen</div></div>';

      function polarToCartesian(cx, cy, r, angleDeg) {
        var a = (angleDeg - 90) * Math.PI / 180;
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      }
      function describeWedge(cx, cy, r, startAngle, endAngle) {
        if (endAngle - startAngle >= 359.9) {
          return 'M ' + cx + ' ' + (cy - r) + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z';
        }
        var start = polarToCartesian(cx, cy, r, startAngle);
        var end = polarToCartesian(cx, cy, r, endAngle);
        var largeArc = endAngle - startAngle > 180 ? "1" : "0";
        return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArc, 1, end.x, end.y, "Z"].join(" ");
      }

      var segments = [];
      if (horas > 0) segments.push({val:horas, id:'gH', label:'Horas', color:'#7b1fa2', num:horas+'<span style="font-size:11px;font-weight:600;color:var(--tx3)">h</span>', grad:'linear-gradient(135deg,#ab47bc,#7b1fa2)', shadow:'rgba(123,31,162,.25)'});
      if (revs > 0) segments.push({val:revs, id:'gR', label:'Revisitas', color:'#1565c0', num:''+revs, grad:'linear-gradient(135deg,#42a5f5,#1565c0)', shadow:'rgba(21,101,192,.25)'});
      if (ests > 0) segments.push({val:ests, id:'gE', label:'Estudios', color:'#1b5e20', num:''+ests, grad:'linear-gradient(135deg,#66bb6a,#1b5e20)', shadow:'rgba(27,94,32,.25)'});
      // 'Partes' (asignaciones) excluido a propósito de este gráfico

      var cx = 21, cy = 21, r = 21;
      var gapDeg = segments.length > 1 ? 3 : 0;
      var usable = 360 - (gapDeg * segments.length);
      var angle = 0;
      var svgSegments = '';
      for (var si = 0; si < segments.length; si++) {
        var seg = segments[si];
        var sweep = (seg.val / totalNum) * usable;
        svgSegments += '<path d="' + describeWedge(cx, cy, r, angle, angle + sweep) + '" fill="url(#' + seg.id + ')" stroke="var(--card-bg)" stroke-width="1.5" style="opacity:0" class="pie-wedge" data-idx="' + si + '"/>';
        angle += sweep + gapDeg;
      }

      // Leyendas
      var legendHtml = '';
      for (var li = 0; li < segments.length; li++) {
        var s = segments[li];
        legendHtml += '<div style="padding:4px 2px">'
          + '<div style="display:flex;align-items:center;gap:7px">'
            + '<div style="width:10px;height:10px;border-radius:3px;background:' + s.grad + ';flex-shrink:0"></div>'
            + '<div style="flex:1;font-size:12.5px;font-weight:600;color:var(--tx)">' + s.label + '</div>'
          + '</div>'
          + '<div style="font-size:12.5px;font-weight:800;color:' + s.color + ';margin-left:18px;margin-top:1px">' + s.num + ' <span style="font-weight:600;opacity:.7">(' + Math.round(s.val/totalNum*100) + '%)</span></div>'
        + '</div>';
      }

      return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:22px;padding:0;margin-top:16px;margin-bottom:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.04)">'
        + '<div style="padding:18px 22px 0;display:flex;align-items:center;justify-content:space-between">'
          + '<div style="display:flex;align-items:center;gap:8px"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--navy)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg><div style="font-size:14px;font-weight:800;color:var(--tx)">Resumen del mes</div></div>'
          + '<div style="font-size:11px;font-weight:600;color:var(--tx3);background:var(--bg);padding:4px 12px;border-radius:8px;border:1px solid var(--border)">' + mesNombre() + '</div>'
        + '</div>'
        + '<div style="display:flex;align-items:center;gap:26px;padding:20px 22px 24px">'
          + '<div style="position:relative;width:118px;height:118px;flex-shrink:0" id="pieChartWrap">'
            + '<svg viewBox="0 0 42 42" style="width:118px;height:118px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.08))" id="pieChartSvg">'
              + '<defs>'
                + '<linearGradient id="gH" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ab47bc"/><stop offset="100%" stop-color="#7b1fa2"/></linearGradient>'
                + '<linearGradient id="gR" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#42a5f5"/><stop offset="100%" stop-color="#1565c0"/></linearGradient>'
                + '<linearGradient id="gE" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#66bb6a"/><stop offset="100%" stop-color="#1b5e20"/></linearGradient>'
                + '<linearGradient id="gA" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffb74d"/><stop offset="100%" stop-color="#e65100"/></linearGradient>'
              + '</defs>'
              + svgSegments
              + '<circle cx="21" cy="21" r="10" fill="var(--card-bg)" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,.06))"/>'
            + '</svg>'
            + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">'
              + '<div style="font-size:21px;font-weight:900;color:var(--tx);line-height:1;letter-spacing:-.5px" id="pieTotalNum">0</div>'
              + '<div style="font-size:8px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:1px;margin-top:3px;opacity:.5">Total</div>'
            + '</div>'
          + '</div>'
          + '<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">'
            + legendHtml
          + '</div>'
        + '</div>'
      + '</div>';
    }())

    // ── Participación — solo si NO es precursor ──    // ── Participación — solo si NO es precursor ──
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
      + '<div style="display:flex;align-items:center;gap:6px">'
        + '<button onclick="adjCursos(-1)" style="width:38px;height:38px;border-radius:12px;border:1.5px solid var(--border);background:var(--bg);color:var(--tx);font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--f-sans);transition:background .12s">−</button>'
        + '<span id="infCursos" style="min-width:36px;text-align:center;font-size:22px;font-weight:800;color:var(--navy);font-family:var(--f-serif)">' + informe.cursos + '</span>'
        + '<button onclick="adjCursos(1)" style="width:38px;height:38px;border-radius:12px;border:none;background:var(--navy);color:#fff;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:var(--f-sans);transition:opacity .12s;box-shadow:0 2px 8px rgba(26,43,64,.2)">+</button>'
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
          + '<div style="height:10px;background:var(--navy-light);border-radius:99px;overflow:hidden">'
            + '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--navy),#2e6be6);border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)"></div>'
          + '</div>'
          + '<div style="font-size:12px;color:var(--tx3);margin-top:6px;display:flex;justify-content:space-between;font-weight:500"><span>' + prec.horas + 'h / ' + meta + 'h</span><span style="font-weight:700;color:var(--navy)">' + pct + '%</span></div>'
        + '</div>'
      + '</div>';
  }

  html += '<button class="btn-save" style="margin-top:12px" onclick="enviarInforme()">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff" style="margin-right:6px"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>'
      + t('enviar_informe')
    + '</button>';
  document.getElementById('informeBody').innerHTML = html;
  // Animar pie chart
  setTimeout(function() {
    var wedges = document.querySelectorAll('.pie-wedge');
    var totalN = document.getElementById('pieTotalNum');
    var revisitasTarget = cards.filter(function(c){return c.tipo==='revisita';}).length;
    var targetTotal = (esPrecursor ? prec.horas : 0) + revisitasTarget + estudiosMes;
    // Animar wedges uno por uno
    wedges.forEach(function(w, i) {
      setTimeout(function() {
        w.style.transition = 'opacity .5s ease, transform .5s cubic-bezier(.34,1.56,.64,1)';
        w.style.opacity = '1';
        w.style.transformOrigin = '21px 21px';
        w.style.transform = 'scale(1)';
      }, i * 150);
    });
    // Animar número central
    if (totalN) {
      var start = 0;
      var end = targetTotal;
      var duration = 800;
      var startTime = null;
      function animNum(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = Math.round(start + (end - start) * eased * 10) / 10;
        totalN.textContent = current % 1 === 0 ? current : current.toFixed(1);
        if (progress < 1) requestAnimationFrame(animNum);
      }
      setTimeout(function() { requestAnimationFrame(animNum); }, 200);
    }
  }, 100);
}

function contarCursosVisitadosEsteMes() {
  const mes = mesKey();
  const idsVisitados = new Set();
  cards.forEach(function(c) {
    if (c.tipo !== 'estudio' || !c.historial) return;
    c.historial.forEach(function(h) {
      if (h.fecha && h.fecha.startsWith(mes) && h.resultado === 'visitado') {
        idsVisitados.add(c.id);
      }
    });
  });
  return idsVisitados.size;
}

async function toggleParticipo(el) { informe.participo = !informe.participo; el.classList.toggle('on'); await saveInforme(); }
async function adjCursos(delta) {
  informe.cursos = Math.max(0, informe.cursos + delta);
  await saveInforme();
  const el = document.getElementById('infCursos'); if(el) el.textContent = informe.cursos;
}

function lanzarConfeti() {
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var colors = ['#2e6be6','#27ae60','#f0a71a','#7b1fa2','#c62828','#1565c0','#ff6b6b','#00b894','#e056fd','#f9ca24'];
  var pieces = [];
  for (var i = 0; i < 120; i++) {
    pieces.push({
      x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.5,
      y: canvas.height * 0.4,
      vx: (Math.random() - 0.5) * 12,
      vy: -(Math.random() * 14 + 6),
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 12,
      gravity: 0.18 + Math.random() * 0.08,
      opacity: 1,
      wobble: Math.random() * 10
    });
  }
  var frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var alive = false;
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      p.vy += p.gravity;
      p.vx *= 0.99;
      p.x += p.vx + Math.sin(frame * 0.03 + p.wobble) * 0.8;
      p.y += p.vy;
      p.rot += p.rotV;
      if (p.y > canvas.height + 20) { p.opacity -= 0.05; }
      if (p.opacity <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    frame++;
    if (alive && frame < 300) {
      requestAnimationFrame(draw);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(draw);
}

function enviarInforme() {
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

  const modal = document.createElement('div');
  modal.id = 'informeEditModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:22px;max-width:340px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px">Revisa tu informe</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:14px">Puedes editar el texto antes de enviarlo</div>'
    + '<textarea id="informeTextoEdit" style="width:100%;box-sizing:border-box;min-height:140px;padding:12px;border:1.5px solid var(--border);border-radius:12px;font-size:13px;font-family:var(--f-sans);color:var(--tx);background:var(--input-bg);resize:vertical;line-height:1.6">' + txt.replace(/</g,'&lt;') + '</textarea>'
    + '<button onclick="confirmarEnvioInforme()" style="width:100%;padding:14px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(26,43,64,.2);margin-top:14px;margin-bottom:8px">Enviar</button>'
    + '<button onclick="document.getElementById(&quot;informeEditModal&quot;).remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function confirmarEnvioInforme() {
  const txt = document.getElementById('informeTextoEdit').value;
  const esPrecursor = prec.tipo==='auxiliar' || prec.tipo==='regular' || prec.tipo==='especial';
  document.getElementById('informeEditModal')?.remove();

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
  lanzarConfeti();
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
  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Editar informe';
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
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
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
              + '<div class="ava" style="background:' + avaColor(h.nombre) + '">' + initials(h.nombre) + '</div>'
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
      + '<div class="cfg-divider"></div>'
      + '<div class="cfg-row cfg-row-tap" onclick="toggleNotifTiempoAcordeon()">'
        + '<div class="cfg-row-icon" style="background:#f3e5f5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#7b1fa2"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Notifícame cada</div><div class="cfg-row-sub" id="notifTiempoDesc">' + ((cfg.recordatoriosMinutos && cfg.recordatoriosMinutos.length) ? cfg.recordatoriosMinutos.length + ' aviso' + (cfg.recordatoriosMinutos.length!==1?'s':'') + ' configurado' + (cfg.recordatoriosMinutos.length!==1?'s':'') : 'Desactivado') + '</div></div>'
        + '<svg class="cfg-chev" id="notifTiempoChev" viewBox="0 0 24 24" width="18" height="18" style="transition:transform .2s"><path d="M9 18l6-6-6-6v12z"/></svg>'
      + '</div>'
      + '<div id="notifTiempoAcordeon" style="display:none;padding:6px 14px 12px"></div>'
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
        + '<div class="tog' + (document.documentElement.getAttribute('data-theme')==='dark' ? ' on' : '') + '" onclick="toggleDarkMode(this)"></div>'
      + '</div>'
    + '</div>'

    /* ── SCROLL ── */
    + '<div class="cfg-section-title">Transicion de cards</div>'
    + '<div class="cfg-card">'
      + '<div class="cfg-row cfg-row-tap" onclick="toggleScrollOptions()">'
        + '<div class="cfg-row-icon" style="background:#f3e5f5"><svg viewBox="0 0 24 24" width="18" height="18" fill="#7b1fa2"><path d="M4 18h16v-2H4v2zm0-5h16v-2H4v2zm0-7v2h16V6H4z"/></svg></div>'
        + '<div class="cfg-row-info"><div class="cfg-row-label">Animacion de scroll</div><div class="cfg-row-sub">' + ({normal:"Normal",apilado:"Apilado",onda:"Onda",deslizar:"Deslizar",voltear:"Voltear",elastico:"Elástico",foco:"Foco"}[cfg.scrollMode] || "Normal") + '</div></div>'
        + '<svg id="scrollChev" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="color:var(--tx3);transition:transform .25s;flex-shrink:0"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>'
      + '</div>'
      + '<div id="scrollOptionsDrawer" style="max-height:0;overflow:hidden;transition:max-height .3s ease">'
        + scrollModeOption("normal", "Normal", "Scroll clásico sin animación")
        + scrollModeOption("apilado", "Apilado", "Los cards se apilan uno encima de otro")

      + '</div>'
    + '</div>'

    /* ── APARIENCIA DE CONTACTOS ── */
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
  const detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Apoya el proyecto';
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
        + '<img class="donacion-qr-img" src="/img/qr.png" alt="QR Yape/Plin"/>'
        + '<div style="font-size:12px;color:var(--navy);margin-top:12px;cursor:pointer;font-weight:600" onclick="event.stopPropagation();copiarYape()">Copiar número: 929742215</div>'
      + '</div>'
      + '<div class="donacion-footer-note"><strong>Gracias por usar AssendApp</strong></div>'
    + '</div>';
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  detBg.classList.add('open');
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
  updateFabVisibility();
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
  const detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Mi perfil';
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
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
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

const NOTIF_TIEMPO_PRESETS = [15, 30, 60, 120, 1440];

function notifEtiquetaMinutos(m) {
  if (m < 60) return m + ' minutos antes';
  if (m < 1440) return (m === 60 ? '1 hora' : (m/60) + ' horas') + ' antes';
  const dias = Math.round(m / 1440);
  return (dias === 1 ? '1 día' : dias + ' días') + ' antes';
}

function toggleNotifTiempoAcordeon() {
  const cont = document.getElementById('notifTiempoAcordeon');
  const chev = document.getElementById('notifTiempoChev');
  if (!cont) return;
  const abierto = cont.style.display !== 'none';
  if (abierto) {
    cont.style.display = 'none';
    chev.style.transform = '';
  } else {
    renderNotifTiempoOpciones();
    cont.style.display = 'block';
    chev.style.transform = 'rotate(90deg)';
  }
}

function renderNotifTiempoOpciones() {
  const cont = document.getElementById('notifTiempoAcordeon');
  if (!cont) return;
  const lista = (cfg.recordatoriosMinutos && cfg.recordatoriosMinutos.length) ? cfg.recordatoriosMinutos : [60];
  const extras = lista.filter(function(m){ return !NOTIF_TIEMPO_PRESETS.includes(m); });
  const todasOpciones = NOTIF_TIEMPO_PRESETS.concat(extras).sort(function(a,b){ return a-b; });

  const opciones = todasOpciones.map(function(m){
    const marcado = lista.includes(m);
    return '<div onclick="dbToggleNotifMinuto(' + m + ')" style="display:flex;align-items:center;gap:10px;padding:11px 4px;cursor:pointer">'
      + '<div style="width:19px;height:19px;border-radius:6px;border:2px solid ' + (marcado?'var(--navy)':'var(--border)') + ';background:' + (marcado?'var(--navy)':'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + (marcado ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '')
      + '</div>'
      + '<span style="font-size:13.5px;font-weight:' + (marcado?'700':'500') + ';color:' + (marcado?'var(--navy)':'var(--tx)') + '">' + notifEtiquetaMinutos(m) + '</span>'
    + '</div>';
  }).join('');

  cont.innerHTML = opciones
    + '<div onclick="abrirNotifTiempoPersonalizado()" style="display:flex;align-items:center;gap:8px;padding:11px 4px;cursor:pointer;border-top:1px solid var(--border);margin-top:4px;padding-top:12px">'
      + '<svg viewBox="0 0 24 24" width="17" height="17" fill="var(--navy)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
      + '<span style="font-size:13.5px;font-weight:700;color:var(--navy)">Personalizar</span>'
    + '</div>';
}

function abrirSelectorNotifTiempo_OBSOLETO() {
  const lista = (cfg.recordatoriosMinutos && cfg.recordatoriosMinutos.length) ? cfg.recordatoriosMinutos : [60];
  const extras = lista.filter(function(m){ return !NOTIF_TIEMPO_PRESETS.includes(m); });
  const todasOpciones = NOTIF_TIEMPO_PRESETS.concat(extras).sort(function(a,b){ return a-b; });

  const opciones = todasOpciones.map(function(m){
    const marcado = lista.includes(m);
    return '<div onclick="dbToggleNotifMinuto(' + m + ')" style="display:flex;align-items:center;gap:10px;padding:13px 4px;cursor:pointer">'
      + '<div style="width:20px;height:20px;border-radius:6px;border:2px solid ' + (marcado?'var(--navy)':'var(--border)') + ';background:' + (marcado?'var(--navy)':'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + (marcado ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '')
      + '</div>'
      + '<span style="font-size:14px;font-weight:' + (marcado?'700':'500') + ';color:' + (marcado?'var(--navy)':'var(--tx)') + '">' + notifEtiquetaMinutos(m) + '</span>'
    + '</div>';
  }).join('<div style="border-top:1px solid var(--border)"></div>');

  const modal = document.createElement('div');
  modal.id = 'notifTiempoModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:20px;max-width:320px;width:90%;max-height:78vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:2px">Notifícame cada</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:10px">Puedes marcar varias — te avisará en cada una</div>'
    + opciones
    + '<div style="border-top:1px solid var(--border)"></div>'
    + '<div onclick="abrirNotifTiempoPersonalizado()" style="display:flex;align-items:center;gap:8px;padding:14px 4px;cursor:pointer">'
      + '<svg viewBox="0 0 24 24" width="18" height="18" fill="var(--navy)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
      + '<span style="font-size:14px;font-weight:700;color:var(--navy)">Agregar personalizada</span>'
    + '</div>'
    + '<button onclick="document.getElementById(&quot;notifTiempoModal&quot;).remove();buildSettings();" style="width:100%;padding:12px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans);margin-top:12px">Listo</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  if (!document.getElementById('dcAnims')) {
    var s = document.createElement('style');
    s.id = 'dcAnims';
    s.textContent = '@keyframes dcFadeIn{from{opacity:0}to{opacity:1}}@keyframes dcPopIn{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}';
    document.head.appendChild(s);
  }
}

async function dbToggleNotifMinuto(minuto) {
  if (!cfg.recordatoriosMinutos) cfg.recordatoriosMinutos = [60];
  const idx = cfg.recordatoriosMinutos.indexOf(minuto);
  if (idx > -1) {
    if (cfg.recordatoriosMinutos.length === 1) { toast('Debes dejar al menos una opción marcada'); return; }
    cfg.recordatoriosMinutos.splice(idx, 1);
  } else {
    cfg.recordatoriosMinutos.push(minuto);
  }
  cfg.horasAntes = Math.min.apply(null, cfg.recordatoriosMinutos) / 60;
  await saveCfg();
  await schedAll();
  renderNotifTiempoOpciones();
  const desc = document.getElementById('notifTiempoDesc');
  if (desc) desc.textContent = cfg.recordatoriosMinutos.length + ' aviso' + (cfg.recordatoriosMinutos.length!==1?'s':'') + ' configurado' + (cfg.recordatoriosMinutos.length!==1?'s':'');
}

function abrirNotifTiempoPersonalizado() {
  let ruedaCont = document.getElementById('notifTiempoRuedaCont');
  if (ruedaCont) { ruedaCont.remove(); return; }
  const acordeon = document.getElementById('notifTiempoAcordeon');
  if (!acordeon) return;
  ruedaCont = document.createElement('div');
  ruedaCont.id = 'notifTiempoRuedaCont';
  acordeon.appendChild(ruedaCont);
  const cont = ruedaCont;

  const valoresRueda = [];
  for (let i = 1; i <= 60; i++) valoresRueda.push(i);
  const unidades = [{v:1,l:'minutos'},{v:60,l:'horas'},{v:1440,l:'días'}];
  const ITEM_H = 44;

  function filaValorHtml(v){
    return '<div class="notif-rueda-item" data-val="' + v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:flex-end;padding:0 14px;font-size:19px;font-weight:600;color:var(--tx3);scroll-snap-align:center">' + v + '</div>';
  }
  // Triplicar la lista de números para simular scroll infinito (1..60, 1..60, 1..60)
  const filasValor = valoresRueda.map(filaValorHtml).join('') + valoresRueda.map(filaValorHtml).join('') + valoresRueda.map(filaValorHtml).join('');
  const filasUnidad = unidades.map(function(u){
    return '<div class="notif-rueda-item" data-val="' + u.v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:flex-start;padding:0 14px;font-size:19px;font-weight:600;color:var(--tx3);scroll-snap-align:center">' + u.l + '</div>';
  }).join('');

  cont.innerHTML = '<div style="background:var(--card-bg);border-radius:14px;padding:0;margin-top:4px;overflow:hidden">'
    + '<div style="position:relative;display:flex;align-items:center;justify-content:center">'
      + '<div style="position:absolute;top:' + ITEM_H + 'px;left:8px;right:8px;height:' + ITEM_H + 'px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);pointer-events:none;z-index:1"></div>'
      + '<div id="notifRuedaValor" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:60px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="1">' + filasValor + '</div>'
      + '<div id="notifRuedaUnidad" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:100px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="60">' + filasUnidad + '</div>'
    + '</div>'
    + '<button onclick="dbGuardarNotifPersonalizado()" style="width:calc(100% - 24px);margin:12px;padding:11px;border:none;background:var(--navy);color:#fff;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Agregar aviso</button>'
  + '</div>';

  const elValor = document.getElementById('notifRuedaValor');
  const unSet = valoresRueda.length * ITEM_H;
  elValor.addEventListener('scroll', function(){
    // Reposicionar silenciosamente al set del medio cuando te acercas a los extremos (scroll infinito)
    if (elValor.scrollTop < unSet * 0.5) {
      elValor.scrollTop += unSet;
    } else if (elValor.scrollTop > unSet * 2.5) {
      elValor.scrollTop -= unSet;
    }
    clearTimeout(elValor._scrollTimer);
    elValor._scrollTimer = setTimeout(function(){ dbActualizarRuedaSeleccion(elValor); }, 100);
  }, { passive: true });

  const elUnidad = document.getElementById('notifRuedaUnidad');
  elUnidad.addEventListener('scroll', function(){
    clearTimeout(elUnidad._scrollTimer);
    elUnidad._scrollTimer = setTimeout(function(){ dbActualizarRuedaSeleccion(elUnidad); }, 100);
  }, { passive: true });

  setTimeout(function(){
    elValor.scrollTop = unSet; // arranca en el set del medio, mostrando "1" arriba
    elUnidad.scrollTop = ITEM_H; // segunda fila = "horas"
    dbActualizarRuedaSeleccion(elValor);
    dbActualizarRuedaSeleccion(elUnidad);
  }, 50);
}

function dbActualizarRuedaSeleccion(el) {
  const centro = el.scrollTop + el.clientHeight / 2;
  const itemH = el.querySelector('.notif-rueda-item') ? el.querySelector('.notif-rueda-item').offsetHeight : 44;
  let masCercano = null, distMin = Infinity;

  el.querySelectorAll('.notif-rueda-item').forEach(function(item){
    const mid = item.offsetTop + item.offsetHeight / 2;
    const dist = Math.abs(mid - centro);
    if (dist < distMin) { distMin = dist; masCercano = item; }

    // Escala continua según distancia al centro (fluida en cada frame del scroll)
    const distNorm = Math.min(1, dist / (itemH * 2));
    const escala = 1.25 - distNorm * 0.35;
    const opacidad = 1 - distNorm * 0.55;
    item.style.transform = 'scale(' + escala.toFixed(3) + ')';
    item.style.opacity = opacidad.toFixed(2);
    item.style.color = distNorm < 0.15 ? 'var(--tx)' : 'var(--tx3)';
    item.style.fontWeight = distNorm < 0.15 ? '800' : '500';
  });

  if (masCercano) el.dataset.valor = masCercano.dataset.val;
}

async function dbGuardarNotifPersonalizado() {
  const elValor = document.getElementById('notifRuedaValor');
  const elUnidad = document.getElementById('notifRuedaUnidad');
  const valor = parseInt(elValor.dataset.valor || '1');
  const unidadMin = parseInt(elUnidad.dataset.valor || '60');
  const minutosTotal = valor * unidadMin;
  if (!cfg.recordatoriosMinutos) cfg.recordatoriosMinutos = [60];
  if (!cfg.recordatoriosMinutos.includes(minutosTotal)) cfg.recordatoriosMinutos.push(minutosTotal);
  cfg.horasAntes = Math.min.apply(null, cfg.recordatoriosMinutos) / 60;
  await saveCfg();
  await schedAll();
  renderNotifTiempoOpciones();
  toast('✔ Aviso agregado');
}

function abrirAjustesNotificaciones() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(p => {
      if (p === "granted") { toast("✔ Notificaciones activadas"); buildSettings(); }
      else { mostrarPanelActivarNotifManual(); }
    });
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    toast("Las notificaciones ya están activadas ✔");
    return;
  }
  mostrarPanelActivarNotifManual();
}

function mostrarPanelActivarNotifManual() {
  const modal = document.createElement('div');
  modal.id = 'notifManualModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="width:52px;height:52px;border-radius:16px;background:#fdf0f0;display:flex;align-items:center;justify-content:center;margin:0 auto 14px">'
      + '<svg viewBox="0 0 24 24" width="26" height="26" fill="#c0392b"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>'
    + '</div>'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px;text-align:center">Notificaciones bloqueadas</div>'
    + '<div style="font-size:13px;color:var(--tx3);margin-bottom:16px;text-align:center;line-height:1.6">Tu navegador no deja que las apps abran sus propios ajustes. Actívalas manualmente:</div>'
    + '<div style="background:var(--bg);border-radius:14px;padding:14px;font-size:12.5px;color:var(--tx2);line-height:1.9">'
      + '<div><strong>En el celular (Chrome/Android):</strong> toca el ícono 🔒 junto a la dirección → Permisos → Notificaciones → Permitir</div>'
      + '<div style="margin-top:8px"><strong>En computadora:</strong> ícono 🔒 en la barra de direcciones → Notificaciones → Permitir, luego recarga la página</div>'
    + '</div>'
    + '<button onclick="document.getElementById(&quot;notifManualModal&quot;).remove()" style="width:100%;padding:13px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);margin-top:16px">Entendido</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ═══ APARIENCIA DE CONTACTOS ═══
async function toggleCardColor(el) { cfg.cardColorLetra = !cfg.cardColorLetra; el.classList.toggle('on'); await saveCfg(); renderList(); toast(cfg.cardColorLetra ? 'Fondo por color activado' : 'Fondo por color desactivado'); }
async function toggleMostrarDir(el) { cfg.mostrarDir = !cfg.mostrarDir; el.classList.toggle('on'); await saveCfg(); renderList(); toast(cfg.mostrarDir ? 'Direccion visible' : 'Direccion oculta'); }
async function toggleMostrarDist(el) { cfg.mostrarDist = !cfg.mostrarDist; el.classList.toggle('on'); await saveCfg(); renderList(); toast(cfg.mostrarDist ? 'Distancia visible' : 'Distancia oculta'); }


// ═══════════════════════════════════════
// CALENDARIO
// ═══════════════════════════════════════
var _calMes = new Date().getMonth();
var _calAnio = new Date().getFullYear();

function buildCalendario() {
  var body = document.getElementById('calendarioBody');
  if (!body) return;

  var meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var dias = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
  var hoy = today();

  // Primer día del mes (0=dom, 1=lun...)
  var primerDia = new Date(_calAnio, _calMes, 1).getDay();
  primerDia = primerDia === 0 ? 6 : primerDia - 1; // Ajustar a lun=0
  var diasEnMes = new Date(_calAnio, _calMes + 1, 0).getDate();

  // Buscar visitas del mes
  var mesStr = _calAnio + '-' + String(_calMes + 1).padStart(2, '0');
  var visitasDelMes = {};
  cards.forEach(function(c) {
    if (c.fecha && c.fecha.startsWith(mesStr)) {
      if (!visitasDelMes[c.fecha]) visitasDelMes[c.fecha] = [];
      visitasDelMes[c.fecha].push(c);
    }
    // También buscar historial
    if (c.historial) {
      c.historial.forEach(function(h) {
        if (h.fecha && h.fecha.startsWith(mesStr)) {
          if (!visitasDelMes[h.fecha]) visitasDelMes[h.fecha] = [];
          visitasDelMes[h.fecha].push({ nombre: c.nombre, nota: h.nota, hora: h.hora, tipo: 'historial', id: c.id });
        }
      });
    }
  });
  try {
    asignaciones.forEach(function(a) {
      if (a.fecha && a.fecha.startsWith(mesStr)) {
        if (!visitasDelMes[a.fecha]) visitasDelMes[a.fecha] = [];
        visitasDelMes[a.fecha].push({ nombre: TIPOS_PARTE[a.tipo] || a.tipo, esAsignacion: true, id: a.id, tipoOriginal: a.tipo });
      }
    });
  } catch(e) {}
  try {
    recordatoriosPersonales.forEach(function(r) {
      const fR = r.fecha ? r.fecha.split('T')[0] : '';
      if (fR && fR.startsWith(mesStr)) {
        if (!visitasDelMes[fR]) visitasDelMes[fR] = [];
        const ic = RECORDATORIO_ICONOS[r.icono] || RECORDATORIO_ICONOS.pin;
        visitasDelMes[fR].push({ nombre: r.titulo, esRecordatorio: true, id: r.id, colorRec: ic.color });
      }
    });
  } catch(e) {}

  // Tarjeta contenedora + header con navegación
  var html = '<div style="background:var(--card-bg);border-radius:22px;padding:18px 16px 20px;box-shadow:0 4px 20px rgba(0,0,0,.05);border:1px solid var(--border)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between">'
      + '<button onclick="calNav(-1)" style="width:38px;height:38px;border-radius:11px;border:1px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .1s" onmousedown="this.style.transform=\'scale(.9)\'" onmouseup="this.style.transform=\'\'" onmouseleave="this.style.transform=\'\'"><svg viewBox="0 0 24 24" width="18" height="18" fill="var(--tx)"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg></button>'
      + '<div style="text-align:center">'
        + '<div style="font-size:21px;font-weight:800;color:var(--tx);letter-spacing:-.3px;font-family:var(--f-serif)">' + meses[_calMes] + '</div>'
        + '<div style="font-size:11.5px;color:var(--tx3);font-weight:700;margin-top:1px;letter-spacing:.3px">' + _calAnio + '</div>'
      + '</div>'
      + '<button onclick="calNav(1)" style="width:38px;height:38px;border-radius:11px;border:1px solid var(--border);background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s,transform .1s" onmousedown="this.style.transform=\'scale(.9)\'" onmouseup="this.style.transform=\'\'" onmouseleave="this.style.transform=\'\'"><svg viewBox="0 0 24 24" width="18" height="18" fill="var(--tx)"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></button>'
    + '</div>'

    // Leyenda de colores
    + '<div style="display:flex;justify-content:center;gap:16px;margin-top:14px;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#2e6be6;box-shadow:0 0 0 2px rgba(46,107,230,.15)"></span><span style="font-size:10.5px;font-weight:700;color:var(--tx3)">Revisita</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#1e7e34;box-shadow:0 0 0 2px rgba(30,126,52,.15)"></span><span style="font-size:10.5px;font-weight:700;color:var(--tx3)">Estudio</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#7b1fa2;box-shadow:0 0 0 2px rgba(123,31,162,.15)"></span><span style="font-size:10.5px;font-weight:700;color:var(--tx3)">Asignación</span></div>'
      + '<div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:#5a6472;box-shadow:0 0 0 2px rgba(90,100,114,.15)"></span><span style="font-size:10.5px;font-weight:700;color:var(--tx3)">Personal</span></div>'
    + '</div>';

  // Días de la semana
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-top:14px;margin-bottom:8px">';
  dias.forEach(function(d) {
    html += '<div style="text-align:center;font-size:10.5px;font-weight:800;color:var(--tx3);padding:6px 0;text-transform:uppercase;letter-spacing:.6px">' + d + '</div>';
  });
  html += '</div>';

  // Grid de días
  html += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px">';

  // Espacios vacíos antes del primer día
  for (var i = 0; i < primerDia; i++) {
    html += '<div style="aspect-ratio:1"></div>';
  }

  // Días del mes
  for (var d = 1; d <= diasEnMes; d++) {
    var fechaStr = _calAnio + '-' + String(_calMes + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    var esHoy = fechaStr === hoy;
    var visitas = visitasDelMes[fechaStr] || [];
    var tieneVisitas = visitas.length > 0;

    var bgColor = esHoy ? 'var(--navy)' : (tieneVisitas ? 'var(--bg)' : 'transparent');
    var txColor = esHoy ? '#fff' : 'var(--tx)';
    var border = tieneVisitas && !esHoy ? '1px solid var(--border)' : (esHoy ? 'none' : '1px solid transparent');
    var shadow = esHoy ? '0 3px 10px rgba(26,43,64,.28)' : (tieneVisitas ? '0 1px 4px rgba(0,0,0,.05)' : 'none');

    html += '<div onclick="verDiaCal(\'' + fechaStr + '\')" style="aspect-ratio:1;border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:' + bgColor + ';border:' + border + ';cursor:pointer;transition:transform .12s ease,box-shadow .12s ease;box-shadow:' + shadow + ';position:relative" onmouseover="this.style.transform=\'scale(1.07)\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,.1)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'' + shadow + '\'">'
    + '<div style="font-size:14px;font-weight:' + (esHoy || tieneVisitas ? '800' : '500') + ';color:' + txColor + (tieneVisitas && !esHoy ? ';opacity:.9' : '') + '">' + d + '</div>';

    // Puntitos por cada visita
    if (tieneVisitas) {
      html += '<div style="display:flex;gap:2.5px;margin-top:4px">';
      visitas.slice(0, 3).forEach(function(v, vi) {
        var dotColor = v.esRecordatorio ? (v.colorRec || '#5a6472') : (v.esAsignacion ? '#7b1fa2' : (v.tipo === 'estudio' ? '#1e7e34' : '#2e6be6'));
        html += '<div style="width:9px;height:2.5px;border-radius:2px;background:' + dotColor + '"></div>';
      });
      if (visitas.length > 3) html += '<div style="width:9px;height:2.5px;border-radius:2px;background:var(--tx3)"></div>';
      html += '</div>';
    }

    html += '</div>';
  }
  html += '</div>';
  html += '</div>'; // cierra la tarjeta contenedora

  // Visitas del día seleccionado (por defecto hoy)
  html += '<div id="calDayDetail" style="margin-top:16px"></div>';

  body.innerHTML = html;

  // Mostrar visitas de hoy por defecto
  if (visitasDelMes[hoy]) verDiaCal(hoy);
}

function closeCalAddForm() {}

function calAbrirFormDia(fecha) {
  openForm();
  setTimeout(function(){ var f = document.getElementById('fFecha'); if (f) f.value = fecha; }, 50);
}

function calNav(dir) {
  _calMes += dir;
  if (_calMes > 11) { _calMes = 0; _calAnio++; }
  if (_calMes < 0) { _calMes = 11; _calAnio--; }
  buildCalendario();
}

function verDiaCal(fecha) {
  var detail = document.getElementById('calDayDetail');
  if (!detail) return;

  var mesStr = fecha.substring(0, 7);
  var visitas = [];

  cards.forEach(function(c) {
    // Visitas programadas
    if (c.fecha === fecha) {
      visitas.push({ nombre: c.nombre, tipo: c.tipo, hora: c.hora || '', dir: c.dir || '', notas: c.notas || '', estado: c.estado, id: c.id, esHistorial: false });
    }
    // Historial
    if (c.historial) {
      c.historial.forEach(function(h) {
        if (h.fecha === fecha) {
          visitas.push({ nombre: c.nombre, tipo: c.tipo, hora: h.hora || '', notas: h.nota || '', id: c.id, esHistorial: true });
        }
      });
    }
  });
  try {
    asignaciones.forEach(function(a) {
      if (a.fecha === fecha) {
        visitas.push({ nombre: TIPOS_PARTE[a.tipo] || a.tipo, tipo: 'asignacion', hora: '', notas: a.nota || '', id: a.id, esHistorial: a.completada, esAsignacion: true, tipoOriginal: a.tipo });
      }
    });
  } catch(e) {}
  try {
    recordatoriosPersonales.forEach(function(r) {
      const fR = r.fecha ? r.fecha.split('T')[0] : '';
      if (fR === fecha) {
        visitas.push({ nombre: r.titulo, tipo: 'personal', hora: '', notas: r.descripcion || '', id: r.id, esRecordatorio: true, icono: r.icono });
      }
    });
  } catch(e) {}

  var partes = fecha.split('-');
  var fechaFmt = parseInt(partes[2]) + ' de ' + ['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][parseInt(partes[1])];

  var html = '<div style="background:var(--card-bg);border-radius:22px;padding:16px;box-shadow:0 4px 20px rgba(0,0,0,.05);border:1px solid var(--border)">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'
      + '<div style="font-size:15px;font-weight:800;color:var(--tx)">' + fechaFmt + '</div>'
      + '<div style="font-size:11px;font-weight:700;color:var(--tx3);background:var(--bg);padding:4px 11px;border-radius:8px;border:1px solid var(--border)">' + visitas.length + ' visita' + (visitas.length !== 1 ? 's' : '') + '</div>'
    + '</div>';

  html += '<button onclick="dbElegirTipoAgregar(\'' + fecha + '\')" style="width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px;border-radius:13px;border:none;background:var(--navy);color:#fff;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px;box-shadow:0 3px 10px rgba(26,43,64,.22);transition:opacity .15s,transform .1s" onmousedown="this.style.transform=\'scale(.98)\'" onmouseup="this.style.transform=\'\'">'
    + '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
    + 'Agregar'
  + '</button>';

  if (visitas.length === 0) {
    html += '<div style="text-align:center;padding:26px 12px;color:var(--tx3)">'
      + '<svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" style="opacity:.25;margin-bottom:8px"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>'
      + '<div style="font-size:13px">Sin visitas este día</div>'
    + '</div>';
  } else {
    visitas.forEach(function(v, i) {
      var esRec = !!v.esRecordatorio;
      var icRec = esRec ? (RECORDATORIO_ICONOS[v.icono] || RECORDATORIO_ICONOS.pin) : null;
      var tipoCustomVer = v.esAsignacion ? tiposPersonalizados.find(function(t){ return t.id === v.tipoOriginal; }) : null;
      var seccionVer = tipoCustomVer ? tipoCustomVer.seccion : (TIPOS_SECCION_GLOBAL[v.tipoOriginal] || 'maestros');
      var colorFondoVer = seccionVer==='tesoros' ? '#eef7f8' : seccionVer==='maestros' ? '#fff8ee' : '#fdf0f0';
      var color = esRec ? icRec.color : (v.esAsignacion ? colorFondoVer : avaColor(v.nombre));
      var ini = esRec
        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff">' + icRec.svg + '</svg>'
        : (v.esAsignacion
          ? '<img src="' + (SECCION_IMG[seccionVer] || SECCION_IMG.maestros) + '" style="width:100%;height:100%;object-fit:contain"/>'
          : v.nombre.trim().split(' ').slice(0,2).map(function(w){return w[0]}).join('').toUpperCase());
      var onclickAttr = esRec ? '' : (v.esAsignacion ? 'openAsigDet(' + v.id + ')' : 'openDet(' + v.id + ')');
      var badgeHtml = esRec
        ? '<span style="font-size:8.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:' + icRec.bg + ';color:' + icRec.color + ';text-transform:uppercase;letter-spacing:.3px">Personal</span>'
        : (v.esAsignacion
          ? '<span style="font-size:8.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:#f3e5f5;color:#7b1fa2;text-transform:uppercase;letter-spacing:.3px">Asignación</span>'
          : (v.esHistorial ? '<span style="font-size:8.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:#edf7ef;color:#1e7e34;text-transform:uppercase;letter-spacing:.3px">Visitado</span>' : '<span style="font-size:8.5px;font-weight:700;padding:3px 8px;border-radius:6px;background:#eef3fa;color:#2e6be6;text-transform:uppercase;letter-spacing:.3px">Programado</span>'));

      html += '<div onclick="' + onclickAttr + '" style="display:flex;gap:13px;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:15px;margin-bottom:9px;cursor:pointer;transition:transform .12s,box-shadow .12s,border-color .12s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 4px 14px rgba(0,0,0,.07)\';this.style.borderColor=\'' + color + '40\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'\';this.style.borderColor=\'var(--border)\'">'
        + '<div style="width:40px;height:40px;border-radius:11px;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;box-shadow:0 2px 6px ' + color + '40">' + ini + '</div>'
        + '<div style="flex:1;min-width:0">'
          + '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">'
            + '<div style="font-size:13.5px;font-weight:700;color:var(--tx)">' + v.nombre + '</div>'
            + badgeHtml
          + '</div>'
          + (v.hora ? '<div style="font-size:11.5px;color:var(--tx3);margin-top:3px;font-weight:500">' + v.hora + (v.dir ? ' · ' + v.dir : '') + '</div>' : '')
          + (v.notas ? '<div style="font-size:11.5px;color:var(--tx3);margin-top:4px;font-style:italic;line-height:1.5">' + v.notas.substring(0, 80) + (v.notas.length > 80 ? '...' : '') + '</div>' : '')
        + '</div>'
      + '</div>';
    });
  }

  html += '</div>'; // cierra la tarjeta del detalle
  detail.innerHTML = html;
}

async function setScrollMode(mode) {
  cfg.scrollMode = mode;
  await kSet('st_cfg', cfg);
  buildSettings();
  if (currentView === 'home') { renderList(); }
  const labels = {normal:'Scroll normal',apilado:'Cards apilados',onda:'Efecto crecer',cascada:'Efecto cascada',zoom:'Efecto zoom',fade:'Efecto desvanecimiento'};
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
    { id:'tesoros',   color:'#2e7d8a', bg:'#eef7f8', nombre:'Tesoros de la Biblia',      img:'/img/tesoros.png' },
    { id:'maestros',  color:'#a0660a', bg:'#fff8ee', nombre:'Seamos Mejores Maestros',   img:'/img/maestros.png' },
    { id:'cristiana', color:'#8b1a1a', bg:'#fdf0f0', nombre:'Nuestra Vida Cristiana',    img:'/img/cristiana.png' },
    { id:'otros',     color:'#5a6472', bg:'#f1f2f4', nombre:'Personal',                     img:null },
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

      let recItems = [];
      if (sec.id === 'otros') {
        try { recItems = recordatoriosPersonales.filter(function(r){ return !r.completado; }); } catch(e){}
      }
      if (!items.length && !recItems.length) return;

      html += '<div style="margin:16px 16px 0;border-radius:14px;overflow:hidden;border:1.5px solid ' + sec.color + '20">'
        + '<div class="asig-sec-' + sec.id + '" style="background:' + sec.bg + ';padding:10px 14px;display:flex;align-items:center;gap:10px">'
          + (sec.id==='otros' ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="#5a6472"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : '<img src="' + sec.img + '" width="24" height="24" style="object-fit:contain"/>')
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
      recItems.forEach(r => {
        const fechaR = r.fecha ? r.fecha.split('T')[0] : '';
        const diasFalta = diasHasta(fechaR);
        const label = diasFalta === 0 ? '¡Hoy!' : diasFalta === 1 ? 'Mañana' : diasFalta < 0 ? 'Atrasado' : 'En ' + diasFalta + ' días';
        const urgencia = diasFalta <= 3 ? '#c0392b' : sec.color;
        const ic = RECORDATORIO_ICONOS[r.icono] || RECORDATORIO_ICONOS.pin;
        html += '<div onclick="dbAbrirDetRecordatorio(' + r.id + ')" style="display:flex;align-items:center;gap:12px;padding:13px 14px;background:var(--surface);border-top:1px solid var(--border);cursor:pointer">'
          + '<svg viewBox="0 0 24 24" width="16" height="16" fill="' + ic.color + '" style="flex-shrink:0">' + ic.svg + '</svg>'
          + '<div style="flex:1">'
            + '<div style="font-size:14px;font-weight:600;color:var(--navy)">' + r.titulo + '</div>'
            + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">' + fmtDate(fechaR) + '</div>'
          + '</div>'
          + '<span style="font-size:12px;font-weight:700;color:' + urgencia + ';white-space:nowrap">' + label + '</span>'
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
    { id:'tesoros',   img:'/img/tesoros.png',   color:'#2e7d8a', bg:'#eef7f8', bgDark:'#0a1f22', tipos:['discurso10','perlas','lectura'] },
    { id:'maestros',  img:'/img/maestros.png',  color:'#a0660a', bg:'#fff8ee', bgDark:'#1f1200', tipos:['conversacion','revisitas','discipulos','discurso'] },
    { id:'cristiana', img:'/img/cristiana.png', color:'#8b1a1a', bg:'#fdf0f0', bgDark:'#1f0505', tipos:[] },
    { id:'otros',     img:null,                 color:'#5a6472', bg:'#f1f2f4', bgDark:'#1c1f24', tipos:[] },
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
        + (sec.id==='otros' ? '<svg viewBox="0 0 24 24" width="32" height="32" fill="#5a6472"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>' : '<img src="' + sec.img + '" width="32" height="32" style="object-fit:contain"/>')
        + '<div style="font-size:13px;font-weight:700;color:' + sec.color + ';text-transform:uppercase;letter-spacing:.04em;flex:1">'
          + (sec.id==='tesoros' ? 'Tesoros de la Biblia' : sec.id==='maestros' ? 'Seamos Mejores Maestros' : sec.id==='cristiana' ? 'Nuestra Vida Cristiana' : 'Personal')
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

    const accionBoton = sec.id === 'otros'
      ? "asigAbrirTipoPersonal('" + today() + "')"
      : "abrirFormNuevoTipo('" + sec.id + "')";
    html += '<button onclick="' + accionBoton + '" style="'
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
  const secNombre = secId==='tesoros' ? 'Tesoros de la Biblia' : secId==='maestros' ? 'Seamos Mejores Maestros' : secId==='cristiana' ? 'Nuestra Vida Cristiana' : 'Personal';
  const secColor  = secId==='tesoros' ? '#2e7d8a' : secId==='maestros' ? '#a0660a' : '#8b1a1a';

  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Nueva asignación';
  document.getElementById('detBody').innerHTML =
    '<div style="font-size:12px;color:var(--tx3);margin-bottom:16px">' + secNombre + '</div>'
    + '<div class="fgroup"><label>¿Qué asignación tienes?</label>'
      + '<input id="nuevoTipoNombre" type="text"/>'
    + '</div>'
    + '<div class="fgroup"><label>¿Es de dos personas?</label>'
      + '<select id="nuevoTipoAyudante">'
        + '<option value="0">No, es individual</option>'
        + '<option value="1">Sí, necesita ayudante</option>'
      + '</select>'
    + '</div>'
    + '<button class="btn-save" onclick="guardarNuevoTipo(\'' + secId + '\')">Crear asignación</button>'
    + '<button class="btn-cancel" onclick="closeDet()">Cancelar</button>';
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
  updateFabVisibility();
}

const COLORES_ETIQUETA = [
  { c:'#ff8a80', n:'Rojo suave' },
  { c:'#ffd54f', n:'Plátano' },
  { c:'#a5d6a7', n:'Verde claro' },
  { c:'#90caf9', n:'Azul suave' },
  { c:'#ce93d8', n:'Morado suave' },
  { c:'#ffab91', n:'Durazno' },
];

function colorEtiquetaHtml(idPrefix, selected) {
  const dots = COLORES_ETIQUETA.map(function(o){
    const sel = (selected||'').toLowerCase() === o.c.toLowerCase();
    return '<button type="button" onclick="seleccionarColorEtiqueta(&quot;' + idPrefix + '&quot;,&quot;' + o.c + '&quot;)" class="cdot' + (sel?' active':'') + '" data-c="' + o.c + '" style="background:' + o.c + '" title="' + o.n + '"></button>';
  }).join('');
  return '<div class="fgroup">'
    + '<label>Color de etiqueta</label>'
    + '<div class="pal-dots" id="' + idPrefix + 'ColorDots" style="margin-bottom:4px">'
      + dots
      + '<button type="button" onclick="toggleColorPickerInline(&quot;' + idPrefix + '&quot;)" style="width:30px;height:30px;border-radius:50%;border:1.5px dashed var(--border-dk);background:var(--bg);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0" title="Elegir color personalizado">'
        + '<svg viewBox="0 0 24 24" width="15" height="15" fill="var(--tx3)"><path d="M20.71 5.63l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-3.12 3.12L11.5 4.08c-.39-.39-1.02-.39-1.41 0L8.68 5.5c-.39.39-.39 1.02 0 1.41l2.33 2.33L2.5 17.75V21h3.25l8.49-8.49 2.33 2.33c.39.39 1.02.39 1.41 0l1.41-1.41c.39-.39.39-1.02 0-1.41l-2.33-2.33 3.12-3.12c.4-.4.4-1.03.02-1.42zM4.92 19L4 18.08l8.06-8.06.92.92L4.92 19z"/></svg>'
      + '</button>'
    + '</div>'
    + '<input type="hidden" id="' + idPrefix + 'Color" value="' + (selected || '') + '"/>'
  + '</div>';
}

function seleccionarColorEtiqueta(idPrefix, color) {
  const hidden = document.getElementById(idPrefix + 'Color');
  if (hidden) hidden.value = color;
  document.querySelectorAll('#' + idPrefix + 'ColorDots .cdot').forEach(function(el){
    el.classList.toggle('active', el.dataset.c.toLowerCase() === color.toLowerCase());
  });
}
let _colPick = {};

function toggleColorPickerInline(idPrefix) {
  const existing = document.getElementById(idPrefix + 'ColorInline');
  if (existing) { existing.remove(); return; }

  const current = document.getElementById(idPrefix + 'Color').value || '#ff8a80';
  const hsv = hexToHsv(current);
  _colPick[idPrefix] = { h: hsv.h, s: hsv.s, v: hsv.v };

  const dotsRow = document.getElementById(idPrefix + 'ColorDots');
  const wrap = document.createElement('div');
  wrap.id = idPrefix + 'ColorInline';
  wrap.style.cssText = 'margin-top:10px;background:var(--card-bg);border:1px solid var(--border);border-radius:14px;padding:14px;animation:dcFadeIn .15s ease';
  wrap.innerHTML =
      '<canvas id="' + idPrefix + 'CpSquare" width="260" height="140" style="width:100%;height:130px;border-radius:10px;cursor:pointer;touch-action:none;display:block"></canvas>'
    + '<canvas id="' + idPrefix + 'CpHue" width="260" height="18" style="width:100%;height:18px;border-radius:99px;margin-top:10px;cursor:pointer;touch-action:none;display:block"></canvas>'
    + '<div style="display:flex;align-items:center;gap:10px;margin-top:12px">'
      + '<div id="' + idPrefix + 'CpPreview" style="width:36px;height:36px;border-radius:10px;flex-shrink:0;border:2px solid rgba(0,0,0,.1)"></div>'
      + '<input id="' + idPrefix + 'CpHex" type="text" maxlength="7" style="flex:1;min-width:0;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;font-family:monospace;background:var(--input-bg);color:var(--tx)"/>'
      + '<button type="button" onclick="confirmInlineColor(&quot;' + idPrefix + '&quot;)" style="padding:10px 16px;border:none;background:var(--navy);color:#fff;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans);flex-shrink:0">Usar</button>'
    + '</div>';
  dotsRow.insertAdjacentElement('afterend', wrap);

  setTimeout(function() {
    const sqCanvas = document.getElementById(idPrefix + 'CpSquare');
    const sqCtx = sqCanvas.getContext('2d');
    const hueCanvas = document.getElementById(idPrefix + 'CpHue');
    const hueCtx = hueCanvas.getContext('2d');
    _colPick[idPrefix].sqCanvas = sqCanvas;
    _colPick[idPrefix].sqCtx = sqCtx;

    drawHueBarGeneric(hueCtx, hueCanvas.width, hueCanvas.height);
    drawSquareGeneric(idPrefix);
    updateInlinePreview(idPrefix);
    document.getElementById(idPrefix + 'CpHex').value = current;

    let draggingSq = false, draggingHue = false;
    const sqPos = function(e) {
      const r = sqCanvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      _colPick[idPrefix].s = Math.max(0, Math.min(100, (x / r.width) * 100));
      _colPick[idPrefix].v = Math.max(0, Math.min(100, 100 - (y / r.height) * 100));
      drawSquareGeneric(idPrefix); updateInlinePreview(idPrefix);
    };
    const huePos = function(e) {
      const r = hueCanvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      _colPick[idPrefix].h = Math.max(0, Math.min(360, (x / r.width) * 360));
      drawSquareGeneric(idPrefix); updateInlinePreview(idPrefix);
    };
    sqCanvas.addEventListener('mousedown', function(e){ draggingSq = true; sqPos(e); });
    sqCanvas.addEventListener('touchstart', function(e){ draggingSq = true; sqPos(e); }, { passive:true });
    window.addEventListener('mousemove', function(e){ if(draggingSq) sqPos(e); if(draggingHue) huePos(e); });
    window.addEventListener('touchmove', function(e){ if(draggingSq) sqPos(e); if(draggingHue) huePos(e); }, { passive:true });
    window.addEventListener('mouseup', function(){ draggingSq = false; draggingHue = false; });
    window.addEventListener('touchend', function(){ draggingSq = false; draggingHue = false; });
    hueCanvas.addEventListener('mousedown', function(e){ draggingHue = true; huePos(e); });
    hueCanvas.addEventListener('touchstart', function(e){ draggingHue = true; huePos(e); }, { passive:true });

    document.getElementById(idPrefix + 'CpHex').addEventListener('input', function(e) {
      const val = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        const hsv2 = hexToHsv(val);
        _colPick[idPrefix].h = hsv2.h; _colPick[idPrefix].s = hsv2.s; _colPick[idPrefix].v = hsv2.v;
        drawSquareGeneric(idPrefix); updateInlinePreview(idPrefix, false);
      }
    });
  }, 30);
}

function drawHueBarGeneric(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  for (let i = 0; i <= 6; i++) grad.addColorStop(i/6, hsvToHex(i*60, 100, 100));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawSquareGeneric(idPrefix) {
  const st = _colPick[idPrefix]; if (!st || !st.sqCtx) return;
  const ctx = st.sqCtx, w = st.sqCanvas.width, h = st.sqCanvas.height;
  const satGrad = ctx.createLinearGradient(0, 0, w, 0);
  satGrad.addColorStop(0, '#fff'); satGrad.addColorStop(1, hsvToHex(st.h, 100, 100));
  ctx.fillStyle = satGrad; ctx.fillRect(0, 0, w, h);
  const valGrad = ctx.createLinearGradient(0, 0, 0, h);
  valGrad.addColorStop(0, 'rgba(0,0,0,0)'); valGrad.addColorStop(1, '#000');
  ctx.fillStyle = valGrad; ctx.fillRect(0, 0, w, h);
  const x = (st.s/100) * w, y = (1 - st.v/100) * h;
  ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI*2);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.stroke();
}

function updateInlinePreview(idPrefix, syncHex) {
  if (syncHex === undefined) syncHex = true;
  const st = _colPick[idPrefix]; if (!st) return;
  const hex = hsvToHex(st.h, st.s, st.v);
  const prev = document.getElementById(idPrefix + 'CpPreview'); if (prev) prev.style.background = hex;
  if (syncHex) { const inp = document.getElementById(idPrefix + 'CpHex'); if (inp) inp.value = hex; }
}

function confirmInlineColor(idPrefix) {
  const st = _colPick[idPrefix]; if (!st) return;
  const hex = hsvToHex(st.h, st.s, st.v);
  seleccionarColorEtiqueta(idPrefix, hex);
  document.getElementById(idPrefix + 'ColorInline')?.remove();
}

const RECORDATORIO_ICONOS = {
  pin:        { color:'#5a6472', bg:'#f1f2f4', label:'Recordatorio', svg:'<path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>' },
  portapapel: { color:'#a0660a', bg:'#fff8ee', label:'Tarea',        svg:'<path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>' },
  libro:      { color:'#1b5e20', bg:'#edf7ef', label:'Estudio',      svg:'<path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>' },
  reloj:      { color:'#7b1fa2', bg:'#f3e5f5', label:'Horario',      svg:'<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>' },
  calendario: { color:'#1565c0', bg:'#eef3fa', label:'Evento',       svg:'<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>' },
  lupa:       { color:'#c0392b', bg:'#fdf0f0', label:'Buscar',       svg:'<path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>' },
  ayuda:      { color:'#2e7d8a', bg:'#eef7f8', label:'Otros',        svg:'<path d="M11.07 12.85c.77-1.39 2.25-2.21 3.11-3.44.91-1.29.4-3.7-2.18-3.7-1.69 0-2.52 1.28-2.87 2.34L6.54 6.96C7.25 4.83 9.18 3 11.99 3c2.35 0 3.96 1.07 4.78 2.41.7 1.15 1.11 3.3.03 4.9-1.2 1.77-2.35 2.31-2.97 3.45-.25.46-.35.76-.35 2.24h-2.89c-.01-.78-.13-2.05.48-3.15zM14 20c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z"/>' },
}

function dbAbrirOtraAsignacion(fecha) {
  const old = document.getElementById('dbOtraAsigModal');
  if (old) old.remove();
  const tiposMostrar = ['portapapel', 'calendario', 'pin'];
  const opciones = tiposMostrar.map(function(id){
    const ic = RECORDATORIO_ICONOS[id];
    return '<button onclick="dbAbrirFormRecordatorio(&quot;' + fecha + '&quot;,&quot;' + id + '&quot;)" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 6px;border:1.5px solid var(--border);border-radius:14px;background:' + ic.bg + ';cursor:pointer">'
      + '<svg viewBox="0 0 24 24" width="24" height="24" fill="' + ic.color + '">' + ic.svg + '</svg>'
      + '<span style="font-size:11px;font-weight:700;color:' + ic.color + '">' + ic.label + '</span>'
    + '</button>';
  }).join('');
  const modal = document.createElement('div');
  modal.id = 'dbOtraAsigModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:4px;text-align:center">¿Qué tipo de recordatorio?</div>'
    + '<div style="font-size:12px;color:var(--tx3);margin-bottom:16px;text-align:center">Elige un ícono para identificarlo</div>'
    + '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px">' + opciones + '</div>'
    + '<button onclick="document.getElementById(&quot;dbOtraAsigModal&quot;).remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function asigAbrirTipoPersonal(fecha) {
  const old = document.getElementById('asigTipoSheet');
  if (old) old.remove();
  const tiposMostrar = ['portapapel', 'calendario', 'pin'];
  const opciones = tiposMostrar.map(function(id){
    const ic = RECORDATORIO_ICONOS[id];
    return '<button onclick="document.getElementById(&quot;asigTipoSheet&quot;).remove();dbAbrirFormRecordatorio(&quot;' + fecha + '&quot;,&quot;' + id + '&quot;)" style="display:flex;align-items:center;gap:14px;width:100%;padding:16px;border:none;border-top:1px solid var(--border);background:var(--surface);cursor:pointer;text-align:left">'
      + '<div style="width:42px;height:42px;border-radius:12px;background:' + ic.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + '<svg viewBox="0 0 24 24" width="22" height="22" fill="' + ic.color + '">' + ic.svg + '</svg>'
      + '</div>'
      + '<span style="font-size:15px;font-weight:600;color:var(--tx)">' + ic.label + '</span>'
    + '</button>';
  }).join('');

  const sheet = document.createElement('div');
  sheet.id = 'asigTipoSheet';
  sheet.className = 'open';
  sheet.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:flex-end;justify-content:center;background:transparent;transition:background .3s ease';
  sheet.innerHTML = '<div id="asigTipoPanel" class="panel" style="transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)">'
    + '<div class="panel-bar" style="width:36px;height:4px;background:var(--border-dk);border-radius:99px;margin:12px auto 4px"></div>'
    + '<div style="padding:10px 18px 4px;text-align:center">'
      + '<div style="font-size:16px;font-weight:700;color:var(--tx)">¿Qué tipo de recordatorio?</div>'
      + '<div style="font-size:12px;color:var(--tx3);margin-top:2px">Elige un ícono para identificarlo</div>'
    + '</div>'
    + '<div style="margin-top:10px">' + opciones + '</div>'
    + '<button onclick="closeAsigTipoSheet()" style="width:calc(100% - 32px);margin:14px 16px 4px;padding:13px;border:none;background:var(--bg);color:var(--tx3);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
  + '</div>';

  sheet.addEventListener('click', function(e){ if (e.target === sheet) closeAsigTipoSheet(); });
  document.body.appendChild(sheet);

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      sheet.style.background = 'rgba(10,15,25,.45)';
      document.getElementById('asigTipoPanel').style.transform = 'translateY(0)';
    });
  });

  setTimeout(function() {
    initSheetDrag('asigTipoSheet', 'asigTipoPanel', closeAsigTipoSheet, false);
  }, 100);
}

function closeAsigTipoSheet() {
  const sheet = document.getElementById('asigTipoSheet');
  const panel = document.getElementById('asigTipoPanel');
  if (!sheet || !panel) return;
  sheet.style.background = 'transparent';
  panel.style.transform = 'translateY(100%)';
  setTimeout(function(){ sheet.remove(); }, 300);
}

function dbAbrirDetRecordatorio(id) {
  const r = recordatoriosPersonales.find(function(x){ return x.id === id; });
  if (!r) return;
  const fechaR = r.fecha ? r.fecha.split('T')[0] : '';
  const ic = RECORDATORIO_ICONOS[r.icono] || RECORDATORIO_ICONOS.pin;
  const listaMin = Array.isArray(r.recordatorios_minutos) ? r.recordatorios_minutos : [1440];
  const avisosTxt = listaMin.map(formNotifEtiqueta).join(', ');

  const detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Recordatorio';
  document.getElementById('detBody').innerHTML =
    '<div class="det-head">'
      + '<div class="det-ava" style="background:' + ic.bg + ';display:flex;align-items:center;justify-content:center"><svg viewBox="0 0 24 24" width="24" height="24" fill="' + ic.color + '">' + ic.svg + '</svg></div>'
      + '<div>'
        + '<div class="det-name">' + r.titulo + '</div>'
        + '<div class="det-tipo">' + ic.label + '</div>'
      + '</div>'
    + '</div>'
    + drow('Fecha', fmtDate(fechaR))
    + drow('Descripción', r.descripcion || '—')
    + drow('Notifícame', avisosTxt)
    + '<div class="det-actions">'
      + '<button class="btn-edit" onclick="dbEditarRecordatorio(' + id + ')">Editar</button>'
      + '<button class="btn-danger" style="margin-top:0" onclick="dbEliminarRecordatorio(' + id + ')">Eliminar</button>'
    + '</div>'
    + '<button class="btn-cancel" onclick="closeDet()">Cerrar</button>';

  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  detBg.classList.add('open');
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
  updateFabVisibility();
}

function dbEditarRecordatorio(id) {
  const r = recordatoriosPersonales.find(function(x){ return x.id === id; });
  if (!r) return;
  closeDet();
  setTimeout(function(){
    dbAbrirFormRecordatorio(r.fecha ? r.fecha.split('T')[0] : today(), r.icono || 'pin', r);
  }, 250);
}

async function dbEliminarRecordatorio(id) {
  try {
    const token = localStorage.getItem('st_token');
    await fetch(API_URL + '/recordatorios/' + id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
    recordatoriosPersonales = recordatoriosPersonales.filter(function(x){ return x.id !== id; });
    closeDet();
    buildAsignaciones();
    if (currentView === 'dashboard') buildDashboard();
    toast('✔ Recordatorio eliminado');
  } catch(e) {
    console.error(e);
    toast('Error al eliminar');
  }
}

function dbAbrirFormRecordatorio(fecha, iconoId, editData) {
  document.getElementById('dbOtraAsigModal')?.remove();
  _formNotifMinutos = (editData && Array.isArray(editData.recordatorios_minutos) && editData.recordatorios_minutos.length) ? editData.recordatorios_minutos.slice() : [1440];
  _recEditId = editData ? editData.id : null;
  const ic = RECORDATORIO_ICONOS[iconoId];
  const modal = document.createElement('div');
  modal.id = 'dbFormRecModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(10,15,25,.5);backdrop-filter:blur(4px);animation:dcFadeIn .2s ease';
  modal.innerHTML = '<div style="background:var(--surface);border-radius:20px;padding:24px;max-width:320px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.2);animation:dcPopIn .3s cubic-bezier(.34,1.56,.64,1)">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">'
      + '<div style="width:34px;height:34px;border-radius:10px;background:' + ic.bg + ';display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg viewBox="0 0 24 24" width="18" height="18" fill="' + ic.color + '">' + ic.svg + '</svg></div>'
      + '<div style="font-size:15px;font-weight:800;color:var(--tx)">' + (editData ? 'Editar' : ic.label) + '</div>'
    + '</div>'
    + '<div class="fgroup" style="margin-bottom:10px"><label>Título</label><input id="recTitulo" type="text" value="' + (editData ? (editData.titulo||'').replace(/"/g,'&quot;') : '') + '"/></div>'
    + '<div class="fgroup" style="margin-bottom:10px"><label>Descripción (opcional)</label><input id="recDesc" type="text" value="' + (editData ? (editData.descripcion||'').replace(/"/g,'&quot;') : '') + '"/></div>'
    + colorEtiquetaHtml('rec', editData ? editData.color : '')
    + formNotifRowHtml()
    + '<button id="recGuardarBtn" onclick="dbGuardarRecordatorioPersonal(&quot;' + fecha + '&quot;,&quot;' + iconoId + '&quot;)" style="width:100%;padding:14px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans);box-shadow:0 4px 12px rgba(26,43,64,.2);margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:8px">Guardar</button>'
    + '<button onclick="document.getElementById(&quot;dbFormRecModal&quot;).remove()" style="width:100%;padding:12px;border:none;background:transparent;color:var(--tx3);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--f-sans)">Cancelar</button>'
  + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
  setTimeout(function(){ document.getElementById('recTitulo')?.focus(); }, 100);
}

async function dbGuardarRecordatorioPersonal(fecha, iconoId) {
  const titulo = document.getElementById('recTitulo').value.trim();
  if (!titulo) { toast('Escribe un título'); return; }
  const desc = document.getElementById('recDesc').value.trim();
  const btn = document.getElementById('recGuardarBtn');
  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" style="animation:spin .7s linear infinite"><circle cx="12" cy="12" r="9" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="14 40"/></svg> Guardando…';
  try {
    const token = localStorage.getItem('st_token');
    const editando = !!_recEditId;
    const res = await fetch(API_URL + '/recordatorios' + (editando ? '/' + _recEditId : ''), {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ titulo, descripcion: desc, fecha, icono: iconoId, recordatorios_minutos: _formNotifMinutos })
    });
    if (!res.ok) throw new Error('Error del servidor');
    await res.json();
    recordatoriosPersonales = [];
    await loadRecordatoriosPersonales();
    document.getElementById('dbFormRecModal')?.remove();
    toast(editando ? '✔ Recordatorio actualizado' : '✔ Recordatorio creado');
    _recEditId = null;
    if (currentView === 'dashboard') buildDashboard();
    if (currentView === 'asignaciones') buildAsignaciones();
  } catch(e) {
    console.error(e);
    toast('No se pudo guardar, intenta de nuevo');
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

function dbHtmlRuedaHorasPrec() {
  const ITEM_H = 52;
  const valoresH = []; for (let i=0;i<=12;i++) valoresH.push(i);
  const valoresM = []; for (let i=0;i<60;i+=5) valoresM.push(i);

  function filaHtml(v) {
    return '<div class="notif-rueda-item" data-val="' + v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:var(--tx3);scroll-snap-align:center;font-family:var(--f-serif)">' + String(v).padStart(2,'0') + '</div>';
  }
  const filasH = valoresH.map(filaHtml).join('');
  const filasM = valoresM.map(filaHtml).join('');

  return '<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-top:12px">'
    + '<div style="position:relative;display:flex;align-items:center;justify-content:center">'
      + '<div style="position:absolute;top:' + ITEM_H + 'px;left:8px;right:8px;height:' + ITEM_H + 'px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);pointer-events:none;z-index:1"></div>'
      + '<div id="precRuedaValor" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:70px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="0">' + filasH + '</div>'
      + '<div style="font-size:32px;font-weight:700;color:var(--tx);font-family:var(--f-serif)">:</div>'
      + '<div id="precRuedaUnidad" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:70px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="0">' + filasM + '</div>'
    + '</div>'
    + '<button onclick="dbAgregarHorasDesdeRuedaPrec()" style="width:calc(100% - 24px);margin:12px;padding:11px;border:none;background:var(--navy);color:#fff;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Agregar</button>'
  + '</div>';
}

function dbActivarRuedaHorasPrec() {
  const elValor = document.getElementById('precRuedaValor');
  const elUnidad = document.getElementById('precRuedaUnidad');
  if (!elValor || !elUnidad || elValor.dataset.bound) return;
  elValor.dataset.bound = '1';

  elValor.addEventListener('scroll', function(){
    dbActualizarRuedaSeleccion(elValor);
  }, { passive: true });

  elUnidad.addEventListener('scroll', function(){
    dbActualizarRuedaSeleccion(elUnidad);
  }, { passive: true });

  setTimeout(function(){
    elValor.scrollTop = 0;
    elUnidad.scrollTop = 0;
    dbActualizarRuedaSeleccion(elValor);
    dbActualizarRuedaSeleccion(elUnidad);
  }, 50);
}
function togglePrecManual() {
  const wrap = document.getElementById('precManualWrap');
  const chev = document.getElementById('precManualChev');
  const btn = document.getElementById('precManualBtn');
  if (!wrap) return;
  const abierto = wrap.style.maxHeight !== '0px' && wrap.style.maxHeight !== '';
  if (abierto) {
    wrap.style.maxHeight = '0px';
    if (chev) chev.style.transform = '';
  } else {
    wrap.style.maxHeight = '400px';
    if (chev) chev.style.transform = 'rotate(180deg)';
    dbActivarRuedaHorasPrec();
  }
}

async function dbAgregarHorasDesdeRuedaPrec() {
  const horas = parseInt(document.getElementById('precRuedaValor').dataset.valor || '0');
  const minutos = parseInt(document.getElementById('precRuedaUnidad').dataset.valor || '0');
  const total = Math.round((horas + minutos / 60) * 100) / 100;
  if (total <= 0) { toast('Elige al menos algo de tiempo'); return; }
  await addH(total);
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

  return '<div class="card" data-asig-id="' + a.id + '" onclick="openAsigDet(' + a.id + ')">'
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
let _formNotifMinutos = [1440];
const FORM_NOTIF_PRESETS = [120, 1440, 2880, 7200, 10080, 20160];

function formNotifEtiqueta(m) {
  if (m < 60) return m + ' minutos antes';
  if (m < 1440) return (m === 60 ? '1 hora' : (m/60) + ' horas') + ' antes';
  if (m < 10080) {
    const dias = Math.round(m / 1440);
    return (dias === 1 ? '1 día' : dias + ' días') + ' antes';
  }
  const semanas = Math.round(m / 10080);
  return (semanas === 1 ? '1 semana' : semanas + ' semanas') + ' antes';
}

function formNotifRowHtml() {
  return '<div class="fgroup" style="margin-bottom:16px">'
    + '<div onclick="formNotifToggleAcordeon()" style="display:flex;align-items:center;justify-content:space-between;padding:13px 14px;background:var(--bg);border-radius:12px;cursor:pointer">'
      + '<div style="display:flex;align-items:center;gap:10px">'
        + '<svg viewBox="0 0 24 24" width="17" height="17" fill="var(--tx2)"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>'
        + '<div>'
          + '<div style="font-size:13.5px;font-weight:700;color:var(--tx)">Notifícame cada</div>'
          + '<div id="formNotifDesc" style="font-size:11px;color:var(--tx3);margin-top:1px">' + _formNotifMinutos.length + ' aviso' + (_formNotifMinutos.length!==1?'s':'') + '</div>'
        + '</div>'
      + '</div>'
      + '<svg id="formNotifChev" viewBox="0 0 24 24" width="17" height="17" fill="var(--tx3)" style="transition:transform .2s"><path d="M9 18l6-6-6-6v12z"/></svg>'
    + '</div>'
    + '<div id="formNotifAcordeon" style="display:none;padding:8px 4px 0"></div>'
  + '</div>';
}

function formNotifToggleAcordeon() {
  const cont = document.getElementById('formNotifAcordeon');
  const chev = document.getElementById('formNotifChev');
  if (!cont) return;
  const abierto = cont.style.display !== 'none';
  if (abierto) { cont.style.display = 'none'; chev.style.transform = ''; }
  else { formNotifRenderOpciones(); cont.style.display = 'block'; chev.style.transform = 'rotate(90deg)'; }
}

function formNotifRenderOpciones() {
  const cont = document.getElementById('formNotifAcordeon');
  if (!cont) return;
  const extras = _formNotifMinutos.filter(function(m){ return !FORM_NOTIF_PRESETS.includes(m); });
  const todas = FORM_NOTIF_PRESETS.concat(extras).sort(function(a,b){ return a-b; });
  const opciones = todas.map(function(m){
    const marcado = _formNotifMinutos.includes(m);
    return '<div onclick="formNotifToggleMinuto(' + m + ')" style="display:flex;align-items:center;gap:10px;padding:10px 4px;cursor:pointer">'
      + '<div style="width:19px;height:19px;border-radius:6px;border:2px solid ' + (marcado?'var(--navy)':'var(--border)') + ';background:' + (marcado?'var(--navy)':'transparent') + ';display:flex;align-items:center;justify-content:center;flex-shrink:0">'
        + (marcado ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>' : '')
      + '</div>'
      + '<span style="font-size:13px;font-weight:' + (marcado?'700':'500') + ';color:' + (marcado?'var(--navy)':'var(--tx)') + '">' + formNotifEtiqueta(m) + '</span>'
    + '</div>';
  }).join('');
  cont.innerHTML = opciones
    + '<div onclick="formNotifAbrirPersonalizado()" style="display:flex;align-items:center;gap:8px;padding:10px 4px;cursor:pointer;border-top:1px solid var(--border);margin-top:2px;padding-top:11px">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" fill="var(--navy)"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>'
      + '<span style="font-size:13px;font-weight:700;color:var(--navy)">Personalizar</span>'
    + '</div>';
}

function formNotifToggleMinuto(m) {
  const idx = _formNotifMinutos.indexOf(m);
  if (idx > -1) {
    if (_formNotifMinutos.length === 1) { toast('Debes dejar al menos una opción marcada'); return; }
    _formNotifMinutos.splice(idx, 1);
  } else {
    _formNotifMinutos.push(m);
  }
  formNotifRenderOpciones();
  const desc = document.getElementById('formNotifDesc');
  if (desc) desc.textContent = _formNotifMinutos.length + ' aviso' + (_formNotifMinutos.length!==1?'s':'');
}

function formNotifAbrirPersonalizado() {
  let ruedaCont = document.getElementById('formNotifRuedaCont');
  if (ruedaCont) { ruedaCont.remove(); return; }
  const acordeon = document.getElementById('formNotifAcordeon');
  if (!acordeon) return;
  ruedaCont = document.createElement('div');
  ruedaCont.id = 'formNotifRuedaCont';
  acordeon.appendChild(ruedaCont);

  const ITEM_H = 40;
  const valoresRueda = []; for (let i=1;i<=60;i++) valoresRueda.push(i);
  const unidades = [{v:1,l:'minutos'},{v:60,l:'horas'},{v:1440,l:'días'},{v:10080,l:'semanas'}];

  function filaValorHtml(v){
    return '<div class="notif-rueda-item" data-val="' + v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:flex-end;padding:0 12px;font-size:17px;font-weight:600;color:var(--tx3);scroll-snap-align:center">' + v + '</div>';
  }
  const filasValor = valoresRueda.map(filaValorHtml).join('') + valoresRueda.map(filaValorHtml).join('') + valoresRueda.map(filaValorHtml).join('');
  const filasUnidad = unidades.map(function(u){
    return '<div class="notif-rueda-item" data-val="' + u.v + '" style="height:' + ITEM_H + 'px;display:flex;align-items:center;justify-content:flex-start;padding:0 12px;font-size:15px;font-weight:600;color:var(--tx3);scroll-snap-align:center">' + u.l + '</div>';
  }).join('');

  ruedaCont.innerHTML = '<div style="background:var(--card-bg);border-radius:12px;overflow:hidden;margin-top:6px">'
    + '<div style="position:relative;display:flex;align-items:center;justify-content:center">'
      + '<div style="position:absolute;top:' + ITEM_H + 'px;left:6px;right:6px;height:' + ITEM_H + 'px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);pointer-events:none;z-index:1"></div>'
      + '<div id="formNotifRuedaValor" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:56px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="1">' + filasValor + '</div>'
      + '<div id="formNotifRuedaUnidad" style="height:' + (ITEM_H*3) + 'px;overflow-y:auto;scroll-snap-type:y mandatory;width:90px;padding:' + ITEM_H + 'px 0;-webkit-overflow-scrolling:touch;scrollbar-width:none" data-valor="1440">' + filasUnidad + '</div>'
    + '</div>'
    + '<button onclick="formNotifGuardarPersonalizado()" style="width:calc(100% - 20px);margin:10px;padding:10px;border:none;background:var(--navy);color:#fff;border-radius:11px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Agregar</button>'
  + '</div>';

  const elValor = document.getElementById('formNotifRuedaValor');
  const unSet = 60 * ITEM_H;
  elValor.addEventListener('scroll', function(){
    if (elValor.scrollTop < unSet * 0.5) { elValor.scrollTop += unSet; }
    else if (elValor.scrollTop > unSet * 2.5) { elValor.scrollTop -= unSet; }
    dbActualizarRuedaSeleccion(elValor);
  }, { passive: true });
  const elUnidad = document.getElementById('formNotifRuedaUnidad');
  elUnidad.addEventListener('scroll', function(){ dbActualizarRuedaSeleccion(elUnidad); }, { passive: true });

  setTimeout(function(){
    elValor.scrollTop = unSet;
    elUnidad.scrollTop = ITEM_H * 2; // arranca en "días"
    dbActualizarRuedaSeleccion(elValor);
    dbActualizarRuedaSeleccion(elUnidad);
  }, 50);
}

function formNotifGuardarPersonalizado() {
  const valor = parseInt(document.getElementById('formNotifRuedaValor').dataset.valor || '1');
  const unidadMin = parseInt(document.getElementById('formNotifRuedaUnidad').dataset.valor || '1440');
  const total = valor * unidadMin;
  if (!_formNotifMinutos.includes(total)) _formNotifMinutos.push(total);
  formNotifRenderOpciones();
  const desc = document.getElementById('formNotifDesc');
  if (desc) desc.textContent = _formNotifMinutos.length + ' aviso' + (_formNotifMinutos.length!==1?'s':'');
}

function openAsigForm(tipo, editData, fechaInicial) {
  const fab = document.getElementById('fabBtn');
  if (fab) fab.style.display = 'none';
  _asigEdit = editData || null;
  const tipoFinal  = editData ? editData.tipo : tipo;
  const tipoCustom = tiposPersonalizados.find(t => t.id === tipoFinal);
  const esDoble    = tipoCustom ? tipoCustom.necesitaAyudante : NECESITA_AYUDANTE.includes(tipoFinal);
  const label      = tipoCustom ? tipoCustom.nombre : (TIPOS_PARTE[tipoFinal] || tipoFinal);
  const secLabel   = tipoCustom
    ? (tipoCustom.seccion==='tesoros' ? 'Tesoros de la Biblia' : tipoCustom.seccion==='maestros' ? 'Seamos Mejores Maestros' : tipoCustom.seccion==='cristiana' ? 'Nuestra Vida Cristiana' : 'Personal')
    : '';
  const c = tipoCustom
    ? { bg: tipoCustom.seccion==='tesoros' ? '#eef7f8' : tipoCustom.seccion==='maestros' ? '#fff8ee' : tipoCustom.seccion==='cristiana' ? '#fdf0f0' : '#f1f2f4',
        color: tipoCustom.seccion==='tesoros' ? '#2e7d8a' : tipoCustom.seccion==='maestros' ? '#a0660a' : tipoCustom.seccion==='cristiana' ? '#8b1a1a' : '#5a6472' }
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
        ? '<div class="fgroup"><label>Ayudante</label>'
            + '<input id="afAyudante" type="text" value="' + (editData ? editData.ayudante || '' : '') + '"/>'
          + '</div>'
        : '')

      /* 2. Nota */
      + '<div class="fgroup"><label>Nota</label>'
        + '<input id="afNota" type="text" value="' + (editData ? editData.nota || '' : '') + '"/>'
      + '</div>'

      /* 3. Fecha */
      + '<div class="fgroup"><label>Fecha*</label>'
        + '<input id="afFecha" type="date" value="' + (editData ? editData.fecha : (fechaInicial || today())) + '"/>'
      + '</div>'

      + formNotifRowHtml()
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

  let resultCreacion = null;
  if (_asigEdit) {
    await apiUpdateAsignacion(_asigEdit.id, {
      seccion: tipo,
      titulo: data.nota,
      fecha_reunion: fecha,
      estado: data.completada ? 'Completado' : 'Pendiente',
      notas: data.ayudante,
      recordatorios_minutos: _formNotifMinutos
    });
    const i = asignaciones.findIndex(a => a.id === _asigEdit.id);
    if (i !== -1) asignaciones[i] = { ...asignaciones[i], ...data };
  } else {
    resultCreacion = await apiCreateAsignacion({
      seccion: tipo,
      titulo: data.nota,
      fecha_reunion: fecha,
      recordatorios_minutos: _formNotifMinutos,
      estado: 'Pendiente',
      notas: data.ayudante
    });
    if (resultCreacion.id) {
      const na = { id: resultCreacion.id, ...data };
      asignaciones.push(na);
    }
  }

  closeAsigForm();
  const idRecienCreado = (!_asigEdit && resultCreacion && resultCreacion.id) ? resultCreacion.id : null;
  buildAsignaciones();
  toast(_asigEdit ? 'Asignación actualizada ✔' : 'Asignación guardada ✔');
  _asigEdit = null;
  if (idRecienCreado) {
    setTimeout(function(){
      const el = document.querySelector('[data-asig-id="' + idRecienCreado + '"]');
      if (el) { el.classList.add('asig-spawn'); el.scrollIntoView({behavior:'smooth', block:'center'}); }
    }, 60);
  }
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
const TIPOS_SECCION_GLOBAL = {
  lectura: 'tesoros', discurso10: 'tesoros', perlas: 'tesoros',
  conversacion: 'maestros', revisitas: 'maestros', discipulos: 'maestros', discurso: 'maestros',
};
const SECCION_IMG = { tesoros: '/img/tesoros.png', maestros: '/img/maestros.png', cristiana: '/img/cristiana.png' };

function dbSeccionDeAsig(a) {
  const tipoCustom = tiposPersonalizados.find(function(t){ return t.id === a.tipo; });
  if (tipoCustom) return tipoCustom.seccion;
  return TIPOS_SECCION_GLOBAL[a.tipo] || 'maestros';
}
function dbImgAsig(a) {
  return SECCION_IMG[dbSeccionDeAsig(a)] || SECCION_IMG.maestros;
}

function openAsigDet(id) {
  const a = asignaciones.find(x => x.id === id);
  if (!a) return;

  const tipoCustomDet = tiposPersonalizados.find(t => t.id === a.tipo);
  const nombreParte   = tipoCustomDet ? tipoCustomDet.nombre : (TIPOS_PARTE[a.tipo] || a.tipo);
  const iconoParte     = tipoCustomDet
    ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>'
    : (TIPOS_SVG[a.tipo] || '');

  const diasFalta     = diasHasta(a.fecha);
  const tieneAyudante = NECESITA_AYUDANTE.includes(a.tipo) && a.ayudante;
  const c             = tipoCustomDet
    ? { bg: tipoCustomDet.seccion==='tesoros' ? '#eef7f8' : tipoCustomDet.seccion==='maestros' ? '#fff8ee' : tipoCustomDet.seccion==='cristiana' ? '#fdf0f0' : '#f1f2f4',
        color: tipoCustomDet.seccion==='tesoros' ? '#2e7d8a' : tipoCustomDet.seccion==='maestros' ? '#a0660a' : tipoCustomDet.seccion==='cristiana' ? '#8b1a1a' : '#5a6472' }
    : (TIPOS_COLOR[a.tipo] || { bg:'#eef3fa', color:'#2e6be6' });
  const pct           = Math.max(0, Math.min(100, Math.round((1 - diasFalta / 30) * 100)));

  let html = '<div class="det-head">'
    + '<div class="det-ava" style="background:' + c.bg + ';padding:8px;display:flex;align-items:center;justify-content:center;overflow:hidden"><img src="' + dbImgAsig(a) + '" style="width:100%;height:100%;object-fit:contain"/></div>'
    + '<div>'
      + '<div class="det-name">' + nombreParte + '</div>'
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

  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = 'Detalle';
  document.getElementById('detBody').innerHTML = html;
  var detBg = document.getElementById('detBg');
  var detPanel = document.getElementById('detPanel');
  var detBody = document.getElementById('detBody');
  detBg.classList.add('open');
  // Backdrop semi-transparente + panel bottom sheet
  detBg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:transparent;padding:0;margin:0;transition:background .3s ease';
  detPanel.style.cssText = 'width:100%;max-width:480px;max-height:92vh;border-radius:20px 20px 0 0;border:none;margin:0;background:var(--surface);display:block;overflow-y:auto;transform:translateY(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);box-shadow:0 -4px 32px rgba(0,0,0,.12)';
  
  // Trigger animation
  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      detBg.style.background = 'rgba(10,15,25,.45)';
      detPanel.style.transform = 'translateY(0)';
    });
  });
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
  // Overlay independiente - no usa panel
  var old = document.getElementById('chatOverlay');
  if (old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'chatOverlay';
  ov.style.cssText = 'position:fixed;top:0;left:0;right:0;height:100dvh;height:100vh;z-index:9999;display:flex;flex-direction:column;background:var(--bg)';
  ov.innerHTML =
    '<div style="flex-shrink:0;display:flex;align-items:center;gap:12px;padding:14px 16px;background:var(--navy);color:#fff;box-shadow:0 2px 12px rgba(0,0,0,.12)">'
      + '<img src="/img/logotipo.png" style="width:40px;height:40px;border-radius:12px;background:#fff;object-fit:contain;padding:4px;flex-shrink:0">'
      + '<div style="flex:1;min-width:0">'
        + '<div style="font-size:15px;font-weight:700">Asistente Virtual</div>'
        + '<div style="font-size:11px;color:rgba(255,255,255,.6);display:flex;align-items:center;gap:5px;margin-top:2px"><span style="width:6px;height:6px;border-radius:50%;background:#4caf70;display:inline-block"></span>AssendApp Soporte</div>'
      + '</div>'
      + '<button onclick="cerrarChat()" style="width:32px;height:32px;border-radius:50%;border:none;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center">\u2715</button>'
    + '</div>'
    + '<div id="chatMensajes" style="flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:18px 14px;background:var(--bg)"></div>'
    + '<div style="flex-shrink:0;padding:10px 12px;padding-bottom:max(12px,env(safe-area-inset-bottom,12px));background:var(--bg)">'
      + '<div style="background:var(--surface);border:1.5px solid var(--border);border-radius:20px;box-shadow:0 2px 16px rgba(0,0,0,.08);overflow:hidden">'
        + '<textarea id="chatInput" placeholder="Escribe tu mensaje..." rows="1" oninput="autoGrowChat(this)" onkeydown="if(event.key===\'Enter\' && !event.shiftKey){event.preventDefault();enviarMensajeChat();}" style="width:100%;padding:12px 16px 6px;border:none;font-size:14px;font-family:inherit;background:transparent;color:var(--tx);outline:none;resize:none;min-height:24px;max-height:80px;line-height:1.5;display:block;box-sizing:border-box"></textarea>'
        + '<div style="display:flex;align-items:center;justify-content:flex-end;padding:2px 8px 8px">'
          + '<button onclick="enviarMensajeChat()" style="width:34px;height:34px;border-radius:50%;border:none;background:var(--navy);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(26,43,64,.25)">'
            + '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12l-8-8-8 8z"/></svg>'
          + '</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  document.body.appendChild(ov);
  // Ajustar con visualViewport
  if (window.visualViewport) {
    var vv = window.visualViewport;
    var ajustar = function() { ov.style.height = vv.height + 'px'; ov.style.top = vv.offsetTop + 'px'; var m = document.getElementById('chatMensajes'); if (m) setTimeout(function(){ m.scrollTop = m.scrollHeight; }, 50); };
    vv.addEventListener('resize', ajustar);
    vv.addEventListener('scroll', ajustar);
    ov._cleanup = function() { vv.removeEventListener('resize', ajustar); vv.removeEventListener('scroll', ajustar); };
  }
  updateFabVisibility();
  await cargarChat();
  setTimeout(function() { var inp = document.getElementById('chatInput'); if (inp) inp.focus(); }, 350);
}

function cerrarChat() {
  var ov = document.getElementById('chatOverlay');
  if (ov) { if (ov._cleanup) ov._cleanup(); ov.remove(); }
  updateFabVisibility();
}

function ajustarChatPorTeclado() {
  const panel = document.querySelector('#detBg.chat-fullscreen .panel');
  const mensajes = document.getElementById('chatMensajes');
  if (!panel || !window.visualViewport) return;

  const vv = window.visualViewport;

  function ajustar() {
    // Redimensionar panel al viewport visual (excluye teclado)
    panel.style.height = vv.height + 'px';
    panel.style.top = vv.offsetTop + 'px';
    if (mensajes) setTimeout(() => { mensajes.scrollTop = mensajes.scrollHeight; }, 50);
  }

  vv.addEventListener('resize', ajustar);
  vv.addEventListener('scroll', ajustar);
  ajustar();

  const closeBtn = document.querySelector('.chat-header-close');
  if (closeBtn) {
    const cleanup = () => {
      vv.removeEventListener('resize', ajustar);
      vv.removeEventListener('scroll', ajustar);
      panel.style.height = '';
      panel.style.top = '';
    };
    closeBtn.addEventListener('click', cleanup, { once: true });
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
      const hora = new Date(m.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' });
      const cat = m.categoria ? CATEGORIAS_REPORTE[m.categoria] : null;
      const avatar = !esUsuario ? '<img src="/img/asistente.png" class="chat-bubble-avatar">' : '';
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
  div.innerHTML = '<img src="/img/asistente.png" class="chat-bubble-avatar">'
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

function toggleDarkMode(el) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('mm_theme', newTheme);
  if (el) el.classList.toggle('on', newTheme === 'dark');
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

function formatoHorasReloj(decimalHoras) {
  const horas = Math.floor(decimalHoras);
  const minutos = Math.round((decimalHoras - horas) * 60);
  const horasFinal = minutos === 60 ? horas + 1 : horas;
  const minutosFinal = minutos === 60 ? 0 : minutos;
  return horasFinal + ':' + String(minutosFinal).padStart(2, '0');
}

function animateNumber(elementId, from, to, duration = 600) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const start = performance.now();
  const update = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = from + (to - from) * ease;
    el.textContent = formatoHorasReloj(current);
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
  const anyOpen = ['formBg','detBg','asigFormBg','drawer','moreBg'].some(id => document.getElementById(id)?.classList.contains('open'));
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
  // Limpiar observers de grow
  if (window._growCleanup) { window._growCleanup(); window._growCleanup = null; }

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
  if (window._growObserver) { window._growObserver.disconnect(); window._growObserver = null; }
  // Limpiar clases de grow
  document.querySelectorAll('.sg-card').forEach(function(c) { c.classList.remove('sg-card','sg-visible'); c.style.transform=''; c.style.opacity=''; });
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
  } else if (cfg.scrollMode === 'onda') {
    // Limpiar listener anterior
    if (window._growCleanup) window._growCleanup();
    // Quitar animación fadeInUp que bloquea transform inline
    cardEls.forEach(function(card) {
      card.style.animation = 'none';
    });
    var scrollContainer = list.closest('.card-list') || list;
    var doGrow = function() {
      var containerRect = scrollContainer.getBoundingClientRect();
      var containerCenter = containerRect.top + containerRect.height / 2;
      cardEls.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(containerCenter - cardCenter);
        var maxDist = containerRect.height * 0.55;
        var progress = Math.max(0, 1 - (dist / maxDist));
        var eased = 1 - Math.pow(1 - progress, 3);
        var scale = 0.78 + eased * 0.25;
        var translateY = (1 - eased) * 12;
        var opacity = 0.3 + eased * 0.7;
        card.style.transform = 'scale(' + scale.toFixed(3) + ') translateY(' + translateY.toFixed(1) + 'px)';
        card.style.opacity = opacity.toFixed(2);
        card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
        card.style.willChange = 'transform, opacity';
      });
    };
    scrollContainer.addEventListener('scroll', doGrow, { passive: true });
    setTimeout(doGrow, 50);
    window._growCleanup = function() {
      scrollContainer.removeEventListener('scroll', doGrow);
      cardEls.forEach(function(card) {
        card.style.transform = '';
        card.style.opacity = '';
        card.style.transition = '';
        card.style.willChange = '';
      });
    };
  } else if (cfg.scrollMode === 'deslizar') {
    if (window._growCleanup) window._growCleanup();
    cardEls.forEach(function(card) { card.style.animation = 'none'; });
    var scrollContainer2 = list.closest('.card-list') || list;
    var doDeslizar = function() {
      var containerRect = scrollContainer2.getBoundingClientRect();
      var containerCenter = containerRect.top + containerRect.height / 2;
      cardEls.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(containerCenter - cardCenter);
        var maxDist = containerRect.height * 0.55;
        var progress = Math.max(0, 1 - (dist / maxDist));
        var eased = 1 - Math.pow(1 - progress, 3);
        var translateX = (1 - eased) * 60;
        var opacity = 0.2 + eased * 0.8;
        card.style.transform = 'translateX(' + translateX.toFixed(1) + 'px)';
        card.style.opacity = opacity.toFixed(2);
        card.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
      });
    };
    scrollContainer2.addEventListener('scroll', doDeslizar, { passive: true });
    setTimeout(doDeslizar, 50);
    window._growCleanup = function() {
      scrollContainer2.removeEventListener('scroll', doDeslizar);
      cardEls.forEach(function(card) { card.style.transform = ''; card.style.opacity = ''; card.style.transition = ''; });
    };
  } else if (cfg.scrollMode === 'voltear') {
    if (window._growCleanup) window._growCleanup();
    cardEls.forEach(function(card) { card.style.animation = 'none'; });
    var scrollContainer3 = list.closest('.card-list') || list;
    var doVoltear = function() {
      var containerRect = scrollContainer3.getBoundingClientRect();
      var containerCenter = containerRect.top + containerRect.height / 2;
      cardEls.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(containerCenter - cardCenter);
        var maxDist = containerRect.height * 0.55;
        var progress = Math.max(0, 1 - (dist / maxDist));
        var eased = 1 - Math.pow(1 - progress, 3);
        var rotateY = (1 - eased) * 25;
        var opacity = 0.3 + eased * 0.7;
        var scale = 0.92 + eased * 0.08;
        card.style.transform = 'perspective(800px) rotateY(' + rotateY.toFixed(1) + 'deg) scale(' + scale.toFixed(3) + ')';
        card.style.opacity = opacity.toFixed(2);
        card.style.transition = 'transform 0.4s ease-out, opacity 0.4s ease-out';
      });
    };
    scrollContainer3.addEventListener('scroll', doVoltear, { passive: true });
    setTimeout(doVoltear, 50);
    window._growCleanup = function() {
      scrollContainer3.removeEventListener('scroll', doVoltear);
      cardEls.forEach(function(card) { card.style.transform = ''; card.style.opacity = ''; card.style.transition = ''; });
    };
  } else if (cfg.scrollMode === 'elastico') {
    if (window._growCleanup) window._growCleanup();
    cardEls.forEach(function(card) { card.style.animation = 'none'; });
    var scrollContainer4 = list.closest('.card-list') || list;
    var doElastico = function() {
      var containerRect = scrollContainer4.getBoundingClientRect();
      var containerCenter = containerRect.top + containerRect.height / 2;
      cardEls.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(containerCenter - cardCenter);
        var maxDist = containerRect.height * 0.5;
        var progress = Math.max(0, 1 - (dist / maxDist));
        // Bounce easing
        var eased;
        if (progress < 0.5) { eased = 4 * progress * progress * progress; }
        else { eased = 1 - Math.pow(-2 * progress + 2, 3) / 2; }
        var scale = 0.75 + eased * 0.3;
        var translateY = (1 - eased) * 20;
        var opacity = 0.25 + eased * 0.75;
        card.style.transform = 'scale(' + scale.toFixed(3) + ') translateY(' + translateY.toFixed(1) + 'px)';
        card.style.opacity = opacity.toFixed(2);
        card.style.transition = 'transform 0.45s cubic-bezier(.34,1.56,.64,1), opacity 0.4s ease-out';
      });
    };
    scrollContainer4.addEventListener('scroll', doElastico, { passive: true });
    setTimeout(doElastico, 50);
    window._growCleanup = function() {
      scrollContainer4.removeEventListener('scroll', doElastico);
      cardEls.forEach(function(card) { card.style.transform = ''; card.style.opacity = ''; card.style.transition = ''; });
    };
  } else if (cfg.scrollMode === 'foco') {
    if (window._growCleanup) window._growCleanup();
    cardEls.forEach(function(card) { card.style.animation = 'none'; });
    var scrollContainer5 = list.closest('.card-list') || list;
    var doFoco = function() {
      var containerRect = scrollContainer5.getBoundingClientRect();
      var containerCenter = containerRect.top + containerRect.height / 2;
      cardEls.forEach(function(card) {
        var rect = card.getBoundingClientRect();
        var cardCenter = rect.top + rect.height / 2;
        var dist = Math.abs(containerCenter - cardCenter);
        var maxDist = containerRect.height * 0.45;
        var progress = Math.max(0, 1 - (dist / maxDist));
        var eased = 1 - Math.pow(1 - progress, 3);
        var scale = 0.88 + eased * 0.12;
        var blur = (1 - eased) * 3;
        var grayscale = (1 - eased) * 80;
        var opacity = 0.4 + eased * 0.6;
        card.style.transform = 'scale(' + scale.toFixed(3) + ')';
        card.style.opacity = opacity.toFixed(2);
        card.style.filter = 'blur(' + blur.toFixed(1) + 'px) grayscale(' + grayscale.toFixed(0) + '%)';
        card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out, filter 0.3s ease-out';
      });
    };
    scrollContainer5.addEventListener('scroll', doFoco, { passive: true });
    setTimeout(doFoco, 50);
    window._growCleanup = function() {
      scrollContainer5.removeEventListener('scroll', doFoco);
      cardEls.forEach(function(card) { card.style.transform = ''; card.style.opacity = ''; card.style.transition = ''; card.style.filter = ''; });
    };
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
    pic.innerHTML = '<img src="' + user.picture + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:none;outline:none;display:block">';
  } else if (initial) {
    initial.textContent = user.nombre ? user.nombre.charAt(0).toUpperCase() : '?';
  }
}

function mostrarBienvenida() {
  const user = getUser();
  if (!user) return;
  const nombre = user.nombre.split(' ')[0];
  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = '';
  document.getElementById('detBody').innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;padding:32px 24px 24px;text-align:center">'
      + '<img src="/img/logoapp.png" style="width:64px;height:64px;margin-bottom:20px;border-radius:16px;box-shadow:0 4px 20px rgba(26,43,64,0.15)">'
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
  mostrarBienvenidaPrecursorado();
}

function mostrarBienvenidaPrecursorado() {
  var detTitleEl = document.getElementById('det-title'); if (detTitleEl) detTitleEl.textContent = '';
  document.getElementById('detBody').innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;padding:32px 24px 8px;text-align:center">'
      + '<div style="width:56px;height:56px;border-radius:16px;background:var(--navy-light);display:flex;align-items:center;justify-content:center;margin-bottom:18px">'
        + '<svg viewBox="0 0 24 24" width="26" height="26" fill="var(--navy)"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>'
      + '</div>'
      + '<div style="font-size:19px;font-weight:800;color:var(--tx);margin-bottom:6px">¿Eres precursor?</div>'
      + '<div style="font-size:13px;color:var(--tx3);line-height:1.6;max-width:280px">Así preparamos tu Precursorado con la meta correcta desde el inicio</div>'
    + '</div>'
    + '<div style="padding:20px 24px 24px;display:flex;flex-direction:column;gap:10px">'
      + '<button onclick="mostrarSeleccionTipoPrecursor()" style="width:100%;padding:15px;border:none;background:var(--navy);color:#fff;border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">Sí, soy precursor</button>'
      + '<button onclick="finalizarBienvenidaPrecursorado(\'publicador\')" style="width:100%;padding:15px;border:1.5px solid var(--border);background:transparent;color:var(--tx);border-radius:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--f-sans)">No, soy publicador</button>'
    + '</div>';
}

function mostrarSeleccionTipoPrecursor() {
  document.getElementById('detBody').innerHTML =
    '<div style="display:flex;flex-direction:column;align-items:center;padding:32px 24px 8px;text-align:center">'
      + '<div style="font-size:19px;font-weight:800;color:var(--tx);margin-bottom:6px">¿Qué tipo de precursor?</div>'
      + '<div style="font-size:13px;color:var(--tx3);line-height:1.6;max-width:280px">Podrás cambiarlo después en cualquier momento</div>'
    + '</div>'
    + '<div style="padding:20px 24px 24px;display:flex;flex-direction:column;gap:10px">'
      + '<button onclick="finalizarBienvenidaPrecursorado(\'auxiliar\')" style="width:100%;padding:16px;border:1.5px solid var(--border);background:var(--card-bg);border-radius:14px;cursor:pointer;text-align:left;font-family:var(--f-sans)">'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx)">Auxiliar</div>'
        + '<div style="font-size:11.5px;color:var(--tx3);margin-top:2px">Meta: 30 horas al mes</div>'
      + '</button>'
      + '<button onclick="finalizarBienvenidaPrecursorado(\'regular\')" style="width:100%;padding:16px;border:1.5px solid var(--border);background:var(--card-bg);border-radius:14px;cursor:pointer;text-align:left;font-family:var(--f-sans)">'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx)">Regular</div>'
        + '<div style="font-size:11.5px;color:var(--tx3);margin-top:2px">Meta: 50 horas al mes</div>'
      + '</button>'
      + '<button onclick="finalizarBienvenidaPrecursorado(\'especial\')" style="width:100%;padding:16px;border:1.5px solid var(--border);background:var(--card-bg);border-radius:14px;cursor:pointer;text-align:left;font-family:var(--f-sans)">'
        + '<div style="font-size:14px;font-weight:700;color:var(--tx)">Especial</div>'
        + '<div style="font-size:11.5px;color:var(--tx3);margin-top:2px">Meta: 100 horas al mes</div>'
      + '</button>'
    + '</div>';
}

async function finalizarBienvenidaPrecursorado(tipo) {
  try {
    prec.tipo = tipo;
    await apiUpdatePrec({ tipo: tipo, meta_horas: prec.tipo==='regular' ? prec.metaReg : prec.tipo==='especial' ? prec.metaEsp : prec.metaAux });
  } catch(e) {}
  localStorage.setItem('st_welcomed', '1');
  closeDet();
  updateDrawerUser();
  const fab = document.getElementById('fabBtn'); if (fab) fab.style.display = '';
  if (currentView === 'precursorado') buildPrec();
  toast('¡Todo listo! ✔');
}

async function init() {
  loadTheme();
  loadThemeColor();
  prec.mes    = mesKey();
  informe.mes = mesKey();

  const [, , , loaded] = await Promise.all([
    loadCfg(),
    loadPrec(),
    loadTiposPersonalizados(),
    loadCards(),
  ]);
  if (!loaded) { cards = DEMO; nextId = 100; saveCards(); }

  const informesData = await apiGetInformes().catch(function(){ return []; });
  aplicarInforme(informesData);
  aplicarInformeHist(informesData);

  await Promise.all([
    loadAsig(),
    loadRecordatoriosPersonales(),
  ]);
  avanzarRecordatoriosSemanal(); // ya no bloquea el arranque

  applyLang();
  // ← CAMBIA goTo('home') POR ESTO:
  const rutaActual = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const vistaInicial = VISTA_POR_RUTA[rutaActual] || 'dashboard';
  history.replaceState({ view: vistaInicial }, '', '/' + (RUTA_POR_VISTA[vistaInicial] || 'inicio'));
  goTo(vistaInicial, true);

  window.addEventListener('popstate', function(e){
    const view = (e.state && e.state.view) || 'dashboard';
    goTo(view, true);
  });

  updateStats();
  renderList();
  // Si la app se abrió desde una notificación (app estaba cerrada), abrir esa tarjeta directo
  const openCardId = new URLSearchParams(window.location.search).get('openCard');
  if (openCardId) {
    setTimeout(function(){
      openDet(parseInt(openCardId));
      const url = new URL(window.location);
      url.searchParams.delete('openCard');
      window.history.replaceState({}, '', url);
    }, 400);
  }
  // schedInformeNotif(); // Deshabilitado temporalmente
  updateUserPosition();
  updateDrawerUser();
  const user = getUser();
  if (!localStorage.getItem('st_welcomed') && user && !user.congregacion) { setTimeout(() => mostrarBienvenida(), 800); }
  
  enforceViewVisibility();

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

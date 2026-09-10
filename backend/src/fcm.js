const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

let firebaseApp = null;

function initFirebase() {
  if (!firebaseApp) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccount);
    } else {
      // Desarrollo local
      const serviceAccount = require('./firebase-service-account.json');
      credential = cert(serviceAccount);
    }
    firebaseApp = getApps().length ? getApps()[0] : initializeApp({ credential });
  }
  return firebaseApp;
}

async function enviarNotificacionFCM(fcmToken, titulo, cuerpo, datos = {}) {
  try {
    const app = initFirebase();
    const message = {
      token: fcmToken,
      // Usar solo data para que Chrome no intercepte
      data: {
        titulo: titulo,
        cuerpo: cuerpo,
        ...Object.fromEntries(Object.entries(datos).map(([k,v]) => [k, String(v)]))
      },
      android: {
        priority: 'high'
      }
    };
    const response = await getMessaging(app).send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('FCM error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { enviarNotificacionFCM };

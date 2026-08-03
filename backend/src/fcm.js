const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (!initialized) {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } else {
      // Local development
      const serviceAccount = require('./firebase-service-account.json');
      credential = admin.credential.cert(serviceAccount);
    }
    admin.initializeApp({ credential });
    initialized = true;
  }
  return admin;
}

async function enviarNotificacionFCM(fcmToken, titulo, cuerpo, datos = {}) {
  try {
    const app = initFirebase();
    const message = {
      token: fcmToken,
      notification: { title: titulo, body: cuerpo },
      android: {
        priority: 'high',
        notification: {
          channelId: 'assendapp_channel',
          sound: 'default'
        }
      },
      data: Object.fromEntries(Object.entries(datos).map(([k,v]) => [k, String(v)]))
    };
    const response = await app.messaging().send(message);
    return { success: true, messageId: response };
  } catch (error) {
    console.error('FCM error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { enviarNotificacionFCM };

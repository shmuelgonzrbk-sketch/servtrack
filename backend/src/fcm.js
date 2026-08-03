const admin = require('firebase-admin');
const path = require('path');

let initialized = false;

function initFirebase() {
  if (!initialized) {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
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

/**
 * ================================================================
 * MI MINISTERIO — ejemplo de uso en tu app principal (main.js / App.js)
 * ================================================================
 *
 * ESTRUCTURA DE ARCHIVOS ESPERADA:
 *
 * src/
 *   notifications/
 *     NotificationManager.js         ← singleton exportado
 *     setupNotificationChannel.js    ← canal Android
 *     adapters/
 *       CapacitorAdapter.js
 *       WebSWAdapter.js
 *     store/
 *       NotifStore.js
 *   sw.js                            ← en /public o raíz del proyecto
 *
 * ================================================================
 */

import { notificationManager }      from './notifications/NotificationManager.js';
import { setupNotificationChannel } from './notifications/setupNotificationChannel.js';

/* ──────────────────────────────────────────────
   1. INICIALIZAR AL ARRANCAR LA APP
   ────────────────────────────────────────────── */

async function initApp() {
  // Primero crear el canal Android (no-op seguro en Web/iOS)
  await setupNotificationChannel();

  // Inicializar el manager (detecta entorno automáticamente)
  await notificationManager.init();

  console.log(`Adapter activo: ${notificationManager.adapterName}`);
  // → En Android real: "CapacitorAdapter"
  // → En navegador:    "WebSWAdapter"

  // Escuchar tap en notificación (ambos adapters emiten este evento)
  window.addEventListener('mm:notification-tapped', (e) => {
    const { cardId } = e.detail;
    console.log('Usuario tocó notificación, cardId:', cardId);
    // Aquí navegar a la tarjeta correspondiente
    // router.push(`/card/${cardId}`);
  });
}

initApp();

/* ──────────────────────────────────────────────
   2. PROGRAMAR UNA NOTIFICACIÓN
   ────────────────────────────────────────────── */

async function ejemploProgramar() {
  await notificationManager.scheduleNotification({
    id:      1001,                              // número único
    title:   '📖 Recordatorio de visita',
    body:    'Tienes una visita con Juan a las 10:00 am.',
    fireAt:  Date.now() + 60 * 60 * 1000,      // en 1 hora
    cardId:  'card-visita-juan-2024',
    vibrate: true,
    sound:   true,
  });
}

/* ──────────────────────────────────────────────
   3. CANCELAR NOTIFICACIONES
   ────────────────────────────────────────────── */

async function ejemploCancelar() {
  // Cancelar por ID individual
  await notificationManager.cancelNotification(1001);

  // Cancelar todas las notificaciones de una tarjeta
  await notificationManager.cancelByCard('card-visita-juan-2024');

  // Cancelar absolutamente todas
  await notificationManager.cancelAll();
}

/* ──────────────────────────────────────────────
   4. VER NOTIFICACIONES PENDIENTES
   ────────────────────────────────────────────── */

async function ejemploListar() {
  const pending = await notificationManager.getPending();
  console.log('Notificaciones pendientes:', pending);
  /*
   * [
   *   {
   *     id: "1001",
   *     title: "📖 Recordatorio de visita",
   *     body: "...",
   *     fireAt: 1718000000000,
   *     cardId: "card-visita-juan-2024",
   *     vibrate: true,
   *     sound: true
   *   }
   * ]
   */
}

/* ──────────────────────────────────────────────
   5. EJEMPLO COMPLETO EN COMPONENTE (Vue / React)
   ────────────────────────────────────────────── */

// ── VUE 3 ──
/*
import { notificationManager } from '@/notifications/NotificationManager';

export default {
  methods: {
    async addReminder(card, dateTime) {
      await notificationManager.scheduleNotification({
        id:      card.reminderId ?? Date.now(),
        title:   `Recordatorio: ${card.name}`,
        body:    card.notes || 'Tienes una actividad programada.',
        fireAt:  new Date(dateTime).getTime(),
        cardId:  card.id,
        vibrate: this.userPrefs.vibrate,
        sound:   this.userPrefs.sound,
      });
    },

    async removeReminder(card) {
      await notificationManager.cancelByCard(card.id);
    },
  },
};
*/

// ── REACT ──
/*
import { useEffect } from 'react';
import { notificationManager } from '../notifications/NotificationManager';

function ReminderButton({ card, scheduledAt }) {
  const handleSchedule = async () => {
    await notificationManager.scheduleNotification({
      id:      card.id + '_reminder',
      title:   `Recordatorio: ${card.name}`,
      body:    'Es hora de tu actividad',
      fireAt:  scheduledAt,
      cardId:  card.id,
      vibrate: true,
      sound:   true,
    });
  };

  return <button onClick={handleSchedule}>Programar recordatorio</button>;
}
*/
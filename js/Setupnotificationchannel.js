/* ================================================================
   MI MINISTERIO — SetupNotificationChannel.js
   Crea el canal de notificaciones en Android (Vanilla JS puro)
   ================================================================ */

async function setupNotificationChannel() {
  // Solo aplica en Android, es un no-op seguro en Web/iOS
  if (
    typeof window === 'undefined' ||
    !window.Capacitor ||
    !window.Capacitor.isNativePlatform ||
    !window.Capacitor.isNativePlatform()
  ) return;

  try {
    var LN = Capacitor.Plugins.LocalNotifications;
    await LN.createChannel({
      id:          'mm_reminders',
      name:        'Recordatorios de Ministerio',
      description: 'Notificaciones de actividades y recordatorios',
      importance:  5,       // IMPORTANCE_HIGH
      visibility:  1,       // VISIBILITY_PUBLIC
      sound:       'default',
      vibration:   true,
      lights:      true,
      lightColor:  '#3B82F6',
    });
    console.log('[Channel] Canal mm_reminders creado.');
  } catch (err) {
    if (String(err).indexOf('not implemented') === -1) {
      console.error('[Channel] Error:', err);
    }
  }
}
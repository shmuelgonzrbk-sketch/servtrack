const VAPID_PUBLIC_KEY = 'BOFx7vS4sGafkprhrak0w9kG03nQ3KFRPEhgYxZNPbkja5VUc5tVFq7bSEVwskKkSlsq_k4op8yJa2gACSI3DkI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push no soportado');
    return;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await sendSubscriptionToServer(existing);
      return;
    }

    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await sendSubscriptionToServer(subscription);
    console.log('✅ Suscrito a push notifications');
  } catch (err) {
    console.error('Error suscribiendo:', err);
  }
}

async function sendSubscriptionToServer(subscription) {
  const token = localStorage.getItem('st_token');
  if (!token) return;
  await fetch('http://localhost:3000/api/notificaciones/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({ subscription })
  });
}
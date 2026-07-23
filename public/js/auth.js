const GOOGLE_CLIENT_ID = '111121682803-0uqtc6j7n54jdt99rs3r52j00qf6nqh1.apps.googleusercontent.com';

function showAuthScreen() {
  const root = document.getElementById('root');
  root.innerHTML = `
    <style>
      .auth-bg {
        min-height: 100vh;
        background: linear-gradient(135deg, #0f1c2e 0%, #1a2b40 50%, #0d1f35 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px;
        position: relative;
        overflow: hidden;
      }
      .auth-bg::before {
        content: '';
        position: absolute;
        width: 500px;
        height: 500px;
        background: radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%);
        top: -100px;
        right: -100px;
        border-radius: 50%;
      }
      .auth-bg::after {
        content: '';
        position: absolute;
        width: 400px;
        height: 400px;
        background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);
        bottom: -80px;
        left: -80px;
        border-radius: 50%;
      }
      .auth-logo {
        text-align: center;
        margin-bottom: 36px;
        z-index: 1;
      }
      .auth-logo-icon {
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #3b82f6, #6366f1);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
        box-shadow: 0 8px 32px rgba(59,130,246,0.3);
      }
      .auth-logo-name {
        font-size: 26px;
        font-weight: 700;
        color: #fff;
        letter-spacing: -0.5px;
      }
      .auth-logo-sub {
        font-size: 13px;
        color: rgba(255,255,255,0.45);
        margin-top: 4px;
        letter-spacing: 0.3px;
      }
      .auth-card {
        width: 100%;
        max-width: 360px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        padding: 32px 28px;
        text-align: center;
        backdrop-filter: blur(20px);
        z-index: 1;
        box-shadow: 0 24px 64px rgba(0,0,0,0.4);
      }
      .auth-card-title {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin-bottom: 6px;
      }
      .auth-card-sub {
        font-size: 13px;
        color: rgba(255,255,255,0.4);
        margin-bottom: 28px;
        line-height: 1.5;
      }
      .auth-divider {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 20px 0;
      }
      .auth-divider-line {
        flex: 1;
        height: 1px;
        background: rgba(255,255,255,0.08);
      }
      .auth-divider-text {
        font-size: 11px;
        color: rgba(255,255,255,0.25);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .auth-footer {
        margin-top: 20px;
        font-size: 11px;
        color: rgba(255,255,255,0.2);
        line-height: 1.6;
        z-index: 1;
      }
      #authError {
        color: #f87171;
        font-size: 13px;
        margin-top: 16px;
        display: none;
        background: rgba(248,113,113,0.1);
        border-radius: 8px;
        padding: 8px 12px;
      }
    </style>

    <div class="auth-bg">
      <div class="auth-logo">
        <div class="auth-logo-icon">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div class="auth-logo-name">ServTrack</div>
        <div class="auth-logo-sub">Organiza tu ministerio</div>
      </div>

      <div class="auth-card">
        <div class="auth-card-title">Bienvenido</div>
        <div class="auth-card-sub">Inicia sesión para acceder<br>a tu cuenta personal</div>

        <div id="g_id_onload"
          data-client_id="${GOOGLE_CLIENT_ID}"
          data-callback="handleGoogleLogin"
          data-auto_prompt="false">
        </div>
        <div class="g_id_signin"
          data-type="standard"
          data-size="large"
          data-theme="filled_blue"
          data-text="sign_in_with"
          data-shape="pill"
          data-logo_alignment="left"
          data-width="300">
        </div>

        <div id="authError"></div>

        <div class="auth-divider">
          <div class="auth-divider-line"></div>
          <div class="auth-divider-text">seguro y privado</div>
          <div class="auth-divider-line"></div>
        </div>

        <div style="font-size:12px;color:rgba(255,255,255,0.25);line-height:1.6">
          Tus datos se guardan de forma<br>segura y solo tú puedes verlos
        </div>
      </div>

      <div class="auth-footer">
        ServTrack · Todos los derechos reservados
      </div>
    </div>
  `;
}

async function handleGoogleLogin(response) {
  const idToken = response.credential;

    const res = await fetch('https://servtrack-api.onrender.com/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken })
  });

  const data = await res.json();

  if (data.error) {
    const errorEl = document.getElementById('authError');
    if (errorEl) { errorEl.textContent = data.error; errorEl.style.display = 'block'; }
    return;
  }

  saveSession(data.token, data.user);
  location.reload();
}
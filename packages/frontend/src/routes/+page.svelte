<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';

  // Local form state
  let username = $state('');
  let password = $state('');
  let guestName = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);
  let view = $state<'login' | 'register' | 'guest'>('login');
  let regUsername = $state('');
  let regPassword = $state('');
  let regError = $state('');
  let isRegistering = $state(false);

  onMount(() => {
    chatStore.loadSystemSettings();
    // If already logged in, redirect to chat
    if (chatStore.authUser) {
      goto('/chat');
    }
  });

  async function handleLogin(e: Event) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isSubmitting) return;
    isSubmitting = true;
    errorMessage = '';
    const res = await chatStore.login(username.trim(), password.trim());
    isSubmitting = false;
    if (res.success) {
      goto('/chat');
    } else {
      errorMessage = res.error || 'Username atau password salah.';
    }
  }

  async function handleRegister(e: Event) {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword.trim() || isRegistering) return;
    isRegistering = true;
    regError = '';
    const res = await chatStore.register(regUsername.trim(), regPassword.trim());
    isRegistering = false;
    if (res.success) {
      goto('/chat');
    } else {
      regError = res.error || 'Pendaftaran gagal.';
    }
  }

  function handleGuestAccess(e: Event) {
    e.preventDefault();
    const name = guestName.trim() || 'Tamu-' + Math.floor(1000 + Math.random() * 9000);
    chatStore.setGuestNickname(name);
    goto('/chat');
  }
</script>

<svelte:head>
  <title>Login - BIMA Chat</title>
  <meta name="description" content="Masuk ke BIMA Chat, platform komunikasi realtime internal RSUD Bangil." />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
  <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
</svelte:head>

<div class="landing-page">
  <!-- Top App Bar -->
  <header class="landing-header">
    <div class="landing-header-inner">
      <div class="landing-brand">
        <span class="material-symbols-outlined landing-brand-icon" aria-hidden="true">chat_bubble</span>
        <span class="landing-brand-name">BIMA Chat</span>
      </div>
      <button
        type="button"
        onclick={() => uiStore.toggleDarkMode()}
        class="landing-theme-btn"
        title="Ubah tema"
        aria-label="Ubah mode gelap atau terang"
      >
        <span class="material-symbols-outlined" aria-hidden="true">{uiStore.isDarkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
    </div>
  </header>

  <!-- Main Content -->
  <main class="landing-main">
    <!-- Background blob -->
    <div class="landing-bg-blob" aria-hidden="true"></div>

    <!-- Login / Register / Guest Card -->
    <div class="landing-card">

      <!-- Logo & Greeting -->
      <div class="landing-logo-wrap">
        <div class="landing-logo-circle">
          <span class="material-symbols-outlined landing-logo-icon" aria-hidden="true" style="font-variation-settings:'FILL' 1;">chat</span>
        </div>
        {#if view === 'guest'}
          <h1 class="landing-title">Masuk sebagai Tamu</h1>
          <p class="landing-subtitle">Akses obrolan tanpa akun resmi</p>
        {:else if view === 'register'}
          <h1 class="landing-title">Buat Akun Baru</h1>
          <p class="landing-subtitle">Daftarkan akun resmi staf RSUD</p>
        {:else}
          <h1 class="landing-title">BIMA Chat</h1>
          <p class="landing-subtitle">Selamat Datang di BIMA Chat<br>Silakan masuk ke akun Anda.</p>
        {/if}
      </div>

      <!-- === LOGIN VIEW === -->
      {#if view === 'login'}
        <form onsubmit={handleLogin} class="landing-form">
          {#if errorMessage}
            <div class="landing-error" role="alert">
              <span class="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{errorMessage}</span>
            </div>
          {/if}

          <div class="landing-field">
            <label class="sr-only" for="loginUsername">Username</label>
            <div class="landing-input-wrap">
              <span class="material-symbols-outlined landing-input-icon" aria-hidden="true">person</span>
              <input
                id="loginUsername"
                type="text"
                bind:value={username}
                placeholder="Username"
                required
                autocomplete="username"
                class="landing-input"
              />
            </div>
          </div>

          <div class="landing-field">
            <label class="sr-only" for="loginPassword">Password</label>
            <div class="landing-input-wrap">
              <span class="material-symbols-outlined landing-input-icon" aria-hidden="true">lock</span>
              <input
                id="loginPassword"
                type="password"
                bind:value={password}
                placeholder="Password"
                required
                autocomplete="current-password"
                class="landing-input"
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} class="landing-btn-primary">
            {#if isSubmitting}
              <span class="landing-spinner" aria-hidden="true"></span>
              <span>Memproses...</span>
            {:else}
              Login
            {/if}
          </button>
        </form>

        <!-- Divider -->
        <div class="landing-divider">
          <div class="landing-divider-line"></div>
          <span class="landing-divider-text">atau</span>
          <div class="landing-divider-line"></div>
        </div>

        <!-- Guest Button -->
        {#if chatStore.systemSettings.allowGuest}
          <button
            type="button"
            onclick={() => (view = 'guest')}
            class="landing-btn-outline"
          >
            <span class="material-symbols-outlined landing-btn-icon" aria-hidden="true">person_outline</span>
            Masuk sebagai Tamu
          </button>
        {/if}

        <!-- Register Link -->
        {#if chatStore.systemSettings.allowRegistration}
          <p class="landing-footer-text">
            Belum punya akun?
            <button type="button" onclick={() => (view = 'register')} class="landing-link">
              Daftar sekarang
            </button>
          </p>
        {:else}
          <p class="landing-footer-text" style="color: var(--clr-on-surface-variant);">
            Pendaftaran mandiri dinonaktifkan. Hubungi admin untuk akun baru.
          </p>
        {/if}

      <!-- === REGISTER VIEW === -->
      {:else if view === 'register'}
        <form onsubmit={handleRegister} class="landing-form">
          {#if regError}
            <div class="landing-error" role="alert">
              <span class="material-symbols-outlined" aria-hidden="true">error</span>
              <span>{regError}</span>
            </div>
          {/if}

          <div class="landing-field">
            <label class="sr-only" for="regUsername">Username</label>
            <div class="landing-input-wrap">
              <span class="material-symbols-outlined landing-input-icon" aria-hidden="true">person</span>
              <input
                id="regUsername"
                type="text"
                bind:value={regUsername}
                placeholder="Username"
                required
                autocomplete="username"
                class="landing-input"
              />
            </div>
          </div>

          <div class="landing-field">
            <label class="sr-only" for="regPassword">Password</label>
            <div class="landing-input-wrap">
              <span class="material-symbols-outlined landing-input-icon" aria-hidden="true">lock</span>
              <input
                id="regPassword"
                type="password"
                bind:value={regPassword}
                placeholder="Password (min. 6 karakter)"
                required
                autocomplete="new-password"
                class="landing-input"
              />
            </div>
          </div>

          <button type="submit" disabled={isRegistering} class="landing-btn-primary">
            {#if isRegistering}
              <span class="landing-spinner" aria-hidden="true"></span>
              <span>Mendaftar...</span>
            {:else}
              Daftar Sekarang
            {/if}
          </button>
        </form>

        <p class="landing-footer-text" style="margin-top: 1.5rem;">
          Sudah punya akun?
          <button type="button" onclick={() => { view = 'login'; regError = ''; }} class="landing-link">
            Masuk di sini
          </button>
        </p>

      <!-- === GUEST VIEW === -->
      {:else if view === 'guest'}
        <form onsubmit={handleGuestAccess} class="landing-form">
          <div class="landing-field">
            <label for="guestNameInput" class="landing-field-label">Nama Tampilan / Panggilan</label>
            <div class="landing-input-wrap">
              <span class="material-symbols-outlined landing-input-icon" aria-hidden="true">badge</span>
              <input
                id="guestNameInput"
                type="text"
                bind:value={guestName}
                placeholder="contoh: Perawat Ana, Staff-IGD"
                class="landing-input"
              />
            </div>
            <p class="landing-field-hint">Kosongkan untuk menggunakan nama acak.</p>
          </div>

          <button type="submit" class="landing-btn-primary">
            <span class="material-symbols-outlined landing-btn-icon" aria-hidden="true">login</span>
            Masuk sebagai Tamu
          </button>
        </form>

        <button
          type="button"
          onclick={() => (view = 'login')}
          class="landing-btn-ghost"
          style="margin-top: 1rem;"
        >
          <span class="material-symbols-outlined landing-btn-icon" aria-hidden="true">arrow_back</span>
          Kembali ke Login
        </button>
      {/if}

    </div><!-- end card -->
  </main>

  <!-- Footer -->
  <footer class="landing-footer">
    <div class="landing-footer-inner">
      <div class="landing-footer-brand">
        <span class="landing-footer-brand-name">BIMA Chat</span>
        <span class="landing-footer-copy">© {new Date().getFullYear()} RSUD Bangil Kab. Pasuruan</span>
      </div>
      <nav class="landing-footer-nav" aria-label="Footer navigation">
        <a href="#" class="landing-footer-link">Bantuan</a>
        <a href="#" class="landing-footer-link">Privasi</a>
        <a href="#" class="landing-footer-link">Syarat &amp; Ketentuan</a>
      </nav>
    </div>
  </footer>
</div>

<style>
  /* ─── Font faces loaded via svelte:head ─── */
  :global(body) {
    font-family: 'Nunito Sans', sans-serif;
  }

  /* ─── CSS custom properties ─── */
  .landing-page {
    /* Light mode — clean neutral whites & greens */
    --clr-primary:             #008069;
    --clr-primary-container:   #e8f5f1;
    --clr-on-primary:          #ffffff;
    --clr-background:          #f0f2f5;
    --clr-surface:             #ffffff;
    --clr-surface-container:   #f0f2f5;
    --clr-surface-lowest:      #ffffff;
    --clr-on-surface:          #111b21;
    --clr-on-surface-variant:  #4b5563;
    --clr-outline:             #8d9db5;
    --clr-outline-variant:     #d1d5db;
    --clr-error:               #dc2626;
    --clr-error-container:     #fee2e2;
    --clr-secondary:           #6b7280;

    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background-color: var(--clr-background);
    color: var(--clr-on-surface);
  }

  /* Dark mode overrides — WhatsApp-style dark slate */
  :global(html.dark) .landing-page {
    --clr-primary:             #25d366;
    --clr-primary-container:   #1a3a2e;
    --clr-on-primary:          #0b1e18;
    --clr-background:          #111b21;
    --clr-surface:             #182229;
    --clr-surface-container:   #202c33;
    --clr-surface-lowest:      #182229;
    --clr-on-surface:          #e9edef;
    --clr-on-surface-variant:  #8696a0;
    --clr-outline:             #4a6070;
    --clr-outline-variant:     #2a3942;
    --clr-error:               #f87171;
    --clr-error-container:     #450a0a;
    --clr-secondary:           #8696a0;
  }

  /* ─── Header ─── */
  .landing-header {
    background-color: var(--clr-background);
    position: sticky;
    top: 0;
    z-index: 40;
  }
  .landing-header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;
  }
  .landing-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .landing-brand-icon {
    color: var(--clr-primary);
    font-size: 1.5rem;
  }
  .landing-brand-name {
    font-family: 'Literata', serif;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--clr-primary);
  }
  .landing-theme-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--clr-on-surface-variant);
    cursor: pointer;
    transition: background 0.15s;
  }
  .landing-theme-btn:hover {
    background: color-mix(in srgb, var(--clr-primary) 12%, transparent);
  }

  /* ─── Main ─── */
  .landing-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
  }
  .landing-bg-blob {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(ellipse 70% 60% at 50% 50%,
      color-mix(in srgb, var(--clr-primary) 8%, transparent) 0%,
      transparent 70%);
  }

  /* ─── Card ─── */
  .landing-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 26rem;
    background-color: var(--clr-surface-lowest);
    border-radius: 0.75rem;
    padding: 2rem 2rem 2.25rem;
    box-shadow: 0 4px 24px rgba(46, 50, 48, 0.08);
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ─── Logo ─── */
  .landing-logo-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 1.75rem;
  }
  .landing-logo-circle {
    width: 4rem;
    height: 4rem;
    background-color: var(--clr-primary);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--clr-primary) 35%, transparent);
  }
  .landing-logo-icon {
    color: var(--clr-on-primary);
    font-size: 1.875rem;
  }
  .landing-title {
    font-family: 'Literata', serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--clr-on-surface);
    margin: 0 0 0.375rem;
    text-align: center;
  }
  .landing-subtitle {
    font-size: 0.875rem;
    color: var(--clr-on-surface-variant);
    text-align: center;
    line-height: 1.55;
    margin: 0;
  }

  /* ─── Form ─── */
  .landing-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    width: 100%;
  }
  .landing-field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .landing-field-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--clr-on-surface-variant);
  }
  .landing-field-hint {
    font-size: 0.7rem;
    color: var(--clr-outline);
    margin: 0;
  }
  .landing-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .landing-input-icon {
    position: absolute;
    left: 0.75rem;
    color: var(--clr-outline);
    font-size: 1.25rem;
    pointer-events: none;
  }
  .landing-input {
    display: block;
    width: 100%;
    padding: 0.75rem 0.75rem 0.75rem 2.5rem;
    background-color: var(--clr-surface);
    border: 1px solid color-mix(in srgb, var(--clr-outline-variant) 70%, transparent);
    border-radius: 0.5rem;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 0.9375rem;
    color: var(--clr-on-surface);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .landing-input::placeholder {
    color: color-mix(in srgb, var(--clr-on-surface-variant) 55%, transparent);
  }
  .landing-input:focus {
    border-color: var(--clr-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--clr-primary) 18%, transparent);
  }

  /* ─── Buttons ─── */
  .landing-btn-primary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: var(--clr-primary);
    color: var(--clr-on-primary);
    border: none;
    border-radius: 0.75rem;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--clr-primary) 30%, transparent);
  }
  .landing-btn-primary:hover:not(:disabled) {
    background-color: color-mix(in srgb, var(--clr-primary) 87%, black);
  }
  .landing-btn-primary:active:not(:disabled) {
    transform: scale(0.98);
  }
  .landing-btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .landing-btn-outline {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: var(--clr-surface-lowest);
    color: var(--clr-on-surface);
    border: 1px solid var(--clr-outline-variant);
    border-radius: 0.75rem;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 0.25rem;
  }
  .landing-btn-outline:hover {
    background-color: var(--clr-surface-container);
  }

  .landing-btn-ghost {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.625rem 1rem;
    background: transparent;
    color: var(--clr-on-surface-variant);
    border: none;
    border-radius: 0.75rem;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
  }
  .landing-btn-ghost:hover {
    background: color-mix(in srgb, var(--clr-on-surface) 6%, transparent);
  }

  .landing-btn-icon {
    font-size: 1.125rem;
  }

  /* ─── Divider ─── */
  .landing-divider {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin: 1.25rem 0 0.5rem;
  }
  .landing-divider-line {
    flex: 1;
    height: 1px;
    background-color: color-mix(in srgb, var(--clr-outline-variant) 40%, transparent);
  }
  .landing-divider-text {
    font-size: 0.8125rem;
    color: var(--clr-on-surface-variant);
    white-space: nowrap;
  }

  /* ─── Error ─── */
  .landing-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
    background-color: var(--clr-error-container);
    color: var(--clr-error);
    border-radius: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .landing-error .material-symbols-outlined {
    font-size: 1.1rem;
  }

  /* ─── Footer text inside card ─── */
  .landing-footer-text {
    text-align: center;
    font-size: 0.875rem;
    color: var(--clr-on-surface-variant);
    margin-top: 1.5rem;
  }
  .landing-link {
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    font-size: inherit;
    font-weight: 700;
    color: var(--clr-primary);
    cursor: pointer;
    text-decoration: none;
    transition: color 0.15s;
  }
  .landing-link:hover {
    text-decoration: underline;
  }

  /* ─── Spinner ─── */
  .landing-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ─── Page Footer ─── */
  .landing-footer {
    background-color: var(--clr-surface-lowest);
    border-top: 1px solid color-mix(in srgb, var(--clr-outline-variant) 35%, transparent);
    margin-top: auto;
  }
  .landing-footer-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 2rem;
    max-width: 80rem;
    margin: 0 auto;
    width: 100%;
  }
  @media (min-width: 640px) {
    .landing-footer-inner {
      flex-direction: row;
      justify-content: space-between;
    }
  }
  .landing-footer-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .landing-footer-brand-name {
    font-family: 'Literata', serif;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--clr-primary);
  }
  .landing-footer-copy {
    font-size: 0.8125rem;
    color: var(--clr-secondary);
  }
  .landing-footer-nav {
    display: flex;
    gap: 1rem;
  }
  .landing-footer-link {
    font-size: 0.8125rem;
    color: var(--clr-on-surface-variant);
    text-decoration: underline;
    transition: color 0.15s;
  }
  .landing-footer-link:hover {
    color: var(--clr-primary);
  }

  /* ─── Responsive ─── */
  @media (min-width: 640px) {
    .landing-card {
      padding: 2.5rem 2.5rem 2.75rem;
    }
  }
</style>

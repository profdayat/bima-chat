<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import './landing.css';

  type LandingView = 'login' | 'register' | 'guest';

  // Local form state
  let username = $state('');
  let password = $state('');
  let guestName = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);
  let view = $state<LandingView>('login');
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

  async function handleLogin(e: SubmitEvent): Promise<void> {
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

  async function handleRegister(e: SubmitEvent): Promise<void> {
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

  function handleGuestAccess(e: SubmitEvent): void {
    e.preventDefault();
    const name = guestName.trim() || 'Tamu-' + Math.floor(1000 + Math.random() * 9000);
    chatStore.setGuestNickname(name);
    goto('/chat');
  }
</script>

<svelte:head>
  <title>Login - BIMA Chat</title>
  <meta name="description" content="Masuk ke BIMA Chat, platform komunikasi realtime internal RSUD Bangil." />
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

        {#if chatStore.systemSettings.allowGuest}
          <div class="landing-divider">
            <div class="landing-divider-line"></div>
            <span class="landing-divider-text">atau</span>
            <div class="landing-divider-line"></div>
          </div>

          <button
            type="button"
            onclick={() => (view = 'guest')}
            class="landing-btn-outline"
          >
            <span class="material-symbols-outlined landing-btn-icon" aria-hidden="true">person_outline</span>
            Masuk sebagai Tamu
          </button>
        {/if}

        {#if chatStore.systemSettings.allowRegistration}
          <p class="landing-footer-text">
            Belum punya akun?
            <button type="button" onclick={() => { view = 'register'; errorMessage = ''; }} class="landing-link">
              Daftar di sini
            </button>
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
        <span class="landing-footer-link">Bantuan</span>
        <span class="landing-footer-link">Privasi</span>
        <span class="landing-footer-link">Syarat &amp; Ketentuan</span>
      </nav>
    </div>
  </footer>
</div>

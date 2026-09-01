<script lang="ts">
  import { chatStore } from '../stores/chat.svelte';
  import Modal from './Modal.svelte';

  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

  let isRegister = $state(false);
  let username = $state('');
  let password = $state('');
  let errorMessage = $state('');
  let isSubmitting = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!username.trim() || !password.trim() || isSubmitting) return;

    isSubmitting = true;
    errorMessage = '';

    if (isRegister) {
      const res = await chatStore.register(username.trim(), password.trim());
      if (res.success) { isOpen = false; username = ''; password = ''; }
      else errorMessage = res.error || 'Registrasi gagal.';
    } else {
      const res = await chatStore.login(username.trim(), password.trim());
      if (res.success) { isOpen = false; username = ''; password = ''; }
      else errorMessage = res.error || 'Login gagal.';
    }

    isSubmitting = false;
  }

  function toggleMode() {
    isRegister = !isRegister;
    errorMessage = '';
  }
</script>

<Modal
  bind:isOpen
  title={isRegister ? 'Buat Akun Staf BIMA Chat' : 'Masuk ke BIMA Chat'}
  subtitle={isRegister ? 'Daftarkan akun untuk identitas resmi RSUD' : 'Gunakan akun untuk mengirim pesan resmi RSUD'}
  maxWidth="max-w-sm"
>
  <form onsubmit={handleSubmit} class="p-5 space-y-4">
    {#if errorMessage}
      <div class="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
        <span>⚠️</span><span>{errorMessage}</span>
      </div>
    {/if}

    <div>
      <label for="authUsername" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">Username</label>
      <input
        id="authUsername"
        type="text"
        bind:value={username}
        placeholder="contoh: dr_dayat"
        required
        class="w-full text-sm py-2.5 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none"
      />
    </div>

    <div>
      <label for="authPassword" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">Password</label>
      <input
        id="authPassword"
        type="password"
        bind:value={password}
        placeholder="Minimal 6 karakter"
        required
        class="w-full text-sm py-2.5 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none"
      />
    </div>

    <button
      type="submit"
      disabled={!username.trim() || !password.trim() || isSubmitting}
      class="w-full py-2.5 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-semibold text-sm rounded-xl transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isSubmitting ? 'Memproses...' : isRegister ? 'Daftar Sekarang' : 'Masuk'}
    </button>

    <div class="text-center pt-1">
      <button
        type="button"
        onclick={toggleMode}
        class="text-xs text-[#00a884] dark:text-[#25d366] hover:underline font-medium cursor-pointer"
      >
        {isRegister ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Buat akun baru'}
      </button>
    </div>
  </form>
</Modal>

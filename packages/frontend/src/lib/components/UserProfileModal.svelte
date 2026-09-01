<script lang="ts">
  import { chatStore, getApiBase } from '../stores/chat.svelte';
  import Modal from './Modal.svelte';

  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

  let displayName = $state(chatStore.authUser?.displayName || chatStore.currentUsername);
  let avatarUrl = $state(chatStore.authUser?.avatarUrl || '');
  let oldPassword = $state('');
  let newPassword = $state('');
  let profileMessage = $state('');
  let profileError = $state('');
  let passwordMessage = $state('');
  let passwordError = $state('');
  let isSavingProfile = $state(false);
  let isSavingPassword = $state(false);

  $effect(() => {
    if (isOpen) {
      displayName = chatStore.authUser?.displayName || chatStore.currentUsername;
      avatarUrl = chatStore.authUser?.avatarUrl || '';
      oldPassword = '';
      newPassword = '';
      profileMessage = '';
      profileError = '';
      passwordMessage = '';
      passwordError = '';
    }
  });

  async function handleSaveProfile(e: Event) {
    e.preventDefault();
    if (!displayName.trim() || isSavingProfile) return;

    isSavingProfile = true;
    profileMessage = '';
    profileError = '';

    if (chatStore.authUser) {
      const res = await chatStore.updateProfile(displayName.trim(), avatarUrl.trim() || undefined);
      if (res.success) {
        profileMessage = 'Profil berhasil diperbarui!';
      } else {
        profileError = res.error || 'Gagal memperbarui profil.';
      }
    } else {
      chatStore.setGuestNickname(displayName.trim());
      profileMessage = 'Nickname tamu diperbarui!';
    }
    isSavingProfile = false;
  }

  async function handleChangePassword(e: Event) {
    e.preventDefault();
    if (!oldPassword.trim() || !newPassword.trim() || isSavingPassword) return;

    isSavingPassword = true;
    passwordMessage = '';
    passwordError = '';

    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chatStore.authToken}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        passwordMessage = 'Password berhasil diperbarui!';
        oldPassword = '';
        newPassword = '';
      } else {
        passwordError = data.message || 'Gagal memperbarui password.';
      }
    } catch (err: any) {
      passwordError = err.message || 'Error koneksi server.';
    }
    isSavingPassword = false;
  }
</script>

<Modal
  bind:isOpen
  title="Pengaturan Profil"
  subtitle="Ubah profil dan kata sandi akun Anda"
  maxWidth="max-w-md"
>
  <div class="p-5 space-y-5">
    <!-- Profile Form -->
    <form onsubmit={handleSaveProfile} class="space-y-3.5">
      <h3 class="text-xs font-bold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wider">Detail Profil</h3>

      {#if profileMessage}
        <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-1.5">
          <span>✓</span><span>{profileMessage}</span>
        </div>
      {/if}
      {#if profileError}
        <div class="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-1.5">
          <span>⚠️</span><span>{profileError}</span>
        </div>
      {/if}

      <div>
        <label for="displayName" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">Nama Tampilan</label>
        <input
          id="displayName"
          type="text"
          bind:value={displayName}
          required
          class="w-full text-sm py-2 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none"
        />
      </div>

      {#if chatStore.authUser}
        <div>
          <label for="avatarUrl" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">URL Avatar (Opsional)</label>
          <input
            id="avatarUrl"
            type="url"
            bind:value={avatarUrl}
            placeholder="https://example.com/foto.jpg"
            class="w-full text-sm py-2 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none"
          />
        </div>
      {/if}

      <button
        type="submit"
        disabled={isSavingProfile}
        class="w-full py-2.5 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-semibold text-xs rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
      >
        {isSavingProfile ? 'Menyimpan...' : 'Simpan Profil'}
      </button>
    </form>

    <!-- Password Form -->
    {#if chatStore.authUser}
      <form onsubmit={handleChangePassword} class="space-y-3.5 pt-4 border-t border-black/10 dark:border-white/10">
        <h3 class="text-xs font-bold text-[#54656f] dark:text-[#8696a0] uppercase tracking-wider">Ubah Password</h3>

        {#if passwordMessage}
          <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg flex items-center gap-1.5">
            <span>✓</span><span>{passwordMessage}</span>
          </div>
        {/if}
        {#if passwordError}
          <div class="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center gap-1.5">
            <span>⚠️</span><span>{passwordError}</span>
          </div>
        {/if}

        <div>
          <label for="oldPassword" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">Password Lama</label>
          <input id="oldPassword" type="password" bind:value={oldPassword} required
            class="w-full text-sm py-2 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none" />
        </div>

        <div>
          <label for="newPassword" class="block text-xs font-semibold text-[#54656f] dark:text-[#8696a0] mb-1">Password Baru (Min. 6 karakter)</label>
          <input id="newPassword" type="password" bind:value={newPassword} required minlength="6"
            class="w-full text-sm py-2 px-3 bg-[#f0f2f5] dark:bg-[#2a3942] border border-black/10 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#00a884] text-[#111b21] dark:text-[#e9edef] outline-none" />
        </div>

        <button
          type="submit"
          disabled={isSavingPassword}
          class="w-full py-2.5 bg-[#00a884] hover:bg-[#00a884]/90 text-white font-semibold text-xs rounded-xl transition shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isSavingPassword ? 'Memproses...' : 'Ubah Password'}
        </button>
      </form>
    {/if}
  </div>
</Modal>

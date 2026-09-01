<script lang="ts">
  import { chatStore, getApiBase } from '../stores/chat.svelte';
  import BottomSheet from './BottomSheet.svelte';

  let { isOpen = $bindable(false) }: { isOpen: boolean } = $props();

  let activeTab = $state('stats');
  let stats = $state({ users: 0, messages: 0, channels: 0 });
  let usersList = $state<any[]>([]);
  let isLoading = $state(false);
  let actionMessage = $state('');

  $effect(() => {
    if (isOpen) {
      loadData();
    }
  });

  async function loadData() {
    isLoading = true;
    actionMessage = '';
    const base = getApiBase();
    try {
      const statsRes = await fetch(`${base}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
      });
      if (statsRes.ok) stats = await statsRes.json();

      const usersRes = await fetch(`${base}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
      });
      if (usersRes.ok) usersList = await usersRes.json();
    } catch (e) {
      console.error(e);
    } finally {
      isLoading = false;
    }
  }

  async function updateUserStatus(userId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'true' ? 'false' : 'true';
    const base = getApiBase();
    const res = await fetch(`${base}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chatStore.authToken}` },
      body: JSON.stringify({ role: usersList.find(u => u.id === userId)?.role || 'staff', isActive: nextStatus })
    });
    if (res.ok) { actionMessage = 'Status user berhasil diubah!'; loadData(); }
  }

  async function updateUserRole(userId: string, currentRole: string) {
    const nextRole = currentRole === 'admin' ? 'staff' : 'admin';
    const base = getApiBase();
    const res = await fetch(`${base}/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${chatStore.authToken}` },
      body: JSON.stringify({ role: nextRole, isActive: usersList.find(u => u.id === userId)?.isActive || 'true' })
    });
    if (res.ok) { actionMessage = 'Role user berhasil diubah!'; loadData(); }
  }

  async function handleDeleteChannel(channelId: string) {
    if (!confirm('Hapus channel ini beserta semua pesannya?')) return;
    const base = getApiBase();
    const res = await fetch(`${base}/api/admin/channels/${channelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
    });
    if (res.ok) { actionMessage = 'Channel berhasil dihapus!'; chatStore.loadChannels(); loadData(); }
  }
</script>

<BottomSheet
  bind:isOpen
  title="Admin Panel BIMA Chat"
  subtitle="Kelola pengguna, channel, dan pantau sistem RSUD Bangil"
  maxWidth="max-w-3xl"
  fullHeight={true}
>
  <!-- Navigation Tabs -->
  <div class="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
    {#each [['stats', '📊 Statistik'], ['users', '👥 Kelola User'], ['channels', '# Kelola Channel']] as [tab, label]}
      <button
        onclick={() => (activeTab = tab)}
        class="flex-1 py-3 text-xs font-bold text-center border-b-2 transition
          {activeTab === tab
            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-gray-850'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}"
      >
        {label}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="p-4 md:p-6 space-y-4">
    {#if actionMessage}
      <div class="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg animate-fadeIn">
        ✓ {actionMessage}
      </div>
    {/if}

    {#if isLoading}
      <div class="flex flex-col items-center justify-center py-16 gap-3">
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-gray-400">Memuat data...</p>
      </div>

    {:else if activeTab === 'stats'}
      <div class="grid grid-cols-3 gap-3">
        <div class="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-center">
          <span class="block text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.users}</span>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 block">Total User</span>
        </div>
        <div class="p-4 bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-2xl text-center">
          <span class="block text-2xl font-black text-teal-700 dark:text-teal-400">{stats.messages}</span>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 block">Total Pesan</span>
        </div>
        <div class="p-4 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 rounded-2xl text-center">
          <span class="block text-2xl font-black text-cyan-700 dark:text-cyan-400">{stats.channels}</span>
          <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1 block">Channel Aktif</span>
        </div>
      </div>
      <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <h4 class="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Informasi Sistem</h4>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Backend Elysia + Svelte 5 + Redis Pub/Sub dengan blue-green zero-downtime deployment, siap melayani komunikasi internal staff RSUD Bangil secara instan.
        </p>
      </div>

    {:else if activeTab === 'users'}
      <div class="space-y-2">
        {#each usersList as user (user.id)}
          <div class="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {(user.displayName || user.username).slice(0, 2).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-sm text-gray-900 dark:text-white truncate">{user.displayName || user.username}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="px-1.5 py-0.5 rounded text-[10px] font-bold {user.role === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}">{user.role.toUpperCase()}</span>
                <span class="px-1.5 py-0.5 rounded text-[10px] font-medium {user.isActive === 'true' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}">{user.isActive === 'true' ? 'Aktif' : 'Suspended'}</span>
              </div>
            </div>
            {#if user.id !== chatStore.authUser?.id}
              <div class="flex items-center gap-1 shrink-0">
                <button
                  onclick={() => updateUserStatus(user.id, user.isActive)}
                  class="px-2 py-1 text-[10px] font-bold rounded-lg transition {user.isActive === 'true' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'}"
                >
                  {user.isActive === 'true' ? 'Suspend' : 'Aktifkan'}
                </button>
                <button
                  onclick={() => updateUserRole(user.id, user.role)}
                  class="px-2 py-1 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                >
                  → {user.role === 'admin' ? 'Staff' : 'Admin'}
                </button>
              </div>
            {:else}
              <span class="text-xs text-gray-400 italic shrink-0">Anda</span>
            {/if}
          </div>
        {/each}
      </div>

    {:else if activeTab === 'channels'}
      <div class="space-y-2">
        {#each chatStore.channels as chan (chan.id)}
          <div class="p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-between">
            <div>
              <span class="font-bold text-gray-900 dark:text-white">#{chan.name}</span>
              <span class="text-[10px] text-gray-400 block mt-0.5">{chan.id.slice(0, 8)}...</span>
            </div>
            {#if chan.name !== 'general'}
              <button
                onclick={() => handleDeleteChannel(chan.id)}
                class="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 text-xs font-bold rounded-lg transition"
              >
                Hapus
              </button>
            {:else}
              <span class="text-xs text-gray-400 italic">Default</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</BottomSheet>

<script lang="ts">
  import { onMount } from 'svelte';
  import { chatStore, type User, type AdminStats } from '$lib/stores/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { getApiBase, getAuthHeaders } from '$lib/utils';

  import AdminStatsTab from '$lib/components/admin/AdminStatsTab.svelte';
  import AdminUsersTab from '$lib/components/admin/AdminUsersTab.svelte';
  import AdminChannelsTab from '$lib/components/admin/AdminChannelsTab.svelte';
  import AdminSettingsTab from '$lib/components/admin/AdminSettingsTab.svelte';

  type AdminTab = 'stats' | 'users' | 'channels' | 'settings';

  let activeTab = $state<AdminTab>('stats');
  let stats = $state<AdminStats>({ users: 0, messages: 0, channels: 0 });
  let usersList = $state<User[]>([]);
  let isLoading = $state(false);
  let actionMessage = $state('');
  let userSearch = $state('');

  let isCreatingChannel = $state(false);
  let isSubmittingChannel = $state(false);

  // System Settings state
  let allowGuest = $state(true);
  let allowRegistration = $state(true);
  let isSavingSettings = $state(false);

  onMount(() => {
    loadData();
    loadSettings();
    chatStore.loadChannels();
  });

  async function loadData(): Promise<void> {
    isLoading = true;
    actionMessage = '';
    const base = getApiBase();
    try {
      const headers = getAuthHeaders(chatStore.authToken);
      const statsRes = await fetch(`${base}/api/admin/stats`, { headers });
      if (statsRes.ok) {
        stats = (await statsRes.json()) as AdminStats;
      }

      const usersRes = await fetch(`${base}/api/admin/users`, { headers });
      if (usersRes.ok) {
        usersList = (await usersRes.json()) as User[];
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      isLoading = false;
    }
  }

  async function updateUserStatus(userId: string, currentStatus: string | boolean | undefined): Promise<void> {
    const nextStatus = (currentStatus === 'true' || currentStatus === true) ? 'false' : 'true';
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(chatStore.authToken),
        body: JSON.stringify({
          role: usersList.find(u => u.id === userId)?.role || 'staff',
          isActive: nextStatus
        })
      });
      if (res.ok) {
        actionMessage = `Status pengguna berhasil diperbarui ke: ${nextStatus === 'true' ? 'Aktif' : 'Suspended'}`;
        loadData();
      }
    } catch (e) {
      console.error('Failed to update user status', e);
    }
  }

  async function updateUserRole(userId: string, currentRole: string): Promise<void> {
    const nextRole = currentRole === 'admin' ? 'staff' : 'admin';
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(chatStore.authToken),
        body: JSON.stringify({
          role: nextRole,
          isActive: usersList.find(u => u.id === userId)?.isActive || 'true'
        })
      });
      if (res.ok) {
        actionMessage = `Role pengguna berhasil diubah menjadi: ${nextRole.toUpperCase()}`;
        loadData();
      }
    } catch (e) {
      console.error('Failed to update user role', e);
    }
  }

  async function handleCreateChannel(name: string): Promise<void> {
    isSubmittingChannel = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/channels`, {
        method: 'POST',
        headers: getAuthHeaders(chatStore.authToken),
        body: JSON.stringify({ name })
      });
      if (res.ok) {
        actionMessage = `Channel #${name} berhasil dibuat.`;
        isCreatingChannel = false;
        chatStore.loadChannels();
        loadData();
      }
    } catch (e) {
      console.error('Error creating channel', e);
    } finally {
      isSubmittingChannel = false;
    }
  }

  async function handleDeleteChannel(channelId: string, channelName: string): Promise<void> {
    if (!confirm(`Apakah Anda yakin ingin menghapus channel #${channelName}? Seluruh riwayat pesan di channel ini akan dihapus secara permanen.`)) {
      return;
    }
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/admin/channels/${channelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(chatStore.authToken)
      });
      if (res.ok) {
        actionMessage = `Channel #${channelName} berhasil dihapus.`;
        chatStore.loadChannels();
        loadData();
      }
    } catch (e) {
      console.error('Error deleting channel', e);
    }
  }

  async function loadSettings(): Promise<void> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/settings/public`);
      if (res.ok) {
        const data = (await res.json()) as { allowGuest?: boolean; allowRegistration?: boolean };
        allowGuest = data.allowGuest !== false;
        allowRegistration = data.allowRegistration !== false;
      }
    } catch (e) {
      console.error('Error loading settings', e);
    }
  }

  async function handleSaveSettings(): Promise<void> {
    isSavingSettings = true;
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(chatStore.authToken),
        body: JSON.stringify({ allowGuest, allowRegistration })
      });
      if (res.ok) {
        actionMessage = 'Pengaturan sistem berhasil disimpan.';
        chatStore.loadSystemSettings();
      }
    } catch (e) {
      console.error('Error saving settings', e);
    } finally {
      isSavingSettings = false;
    }
  }
</script>

<svelte:head>
  <title>Dashboard Admin | BIMA Chat RSUD Bangil</title>
  <meta name="description" content="Dashboard administrasi dan manajemen pengguna BIMA Chat RSUD Bangil." />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
  <!-- Top Navigation Bar -->
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <!-- Brand & Back Button -->
      <div class="flex items-center space-x-3">
        <a
          href="/chat"
          class="p-2 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-1.5 text-xs font-semibold"
          title="Kembali ke Ruang Chat"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
          </svg>
          <span class="hidden sm:inline">Ke Ruang Chat</span>
        </a>

        <div class="h-6 w-px bg-gray-200 dark:bg-gray-700"></div>

        <div class="flex items-center space-x-2.5">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            ⚙️
          </div>
          <div>
            <h1 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
              Admin Panel BIMA Chat
            </h1>
            <p class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              Sistem Manajemen Realtime Chat RSUD Bangil
            </p>
          </div>
        </div>
      </div>

      <!-- Right Controls -->
      <div class="flex items-center space-x-2 sm:space-x-3">
        <!-- Dark Mode Toggle -->
        <button
          type="button"
          onclick={() => uiStore.toggleDarkMode()}
          class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition cursor-pointer"
          title="Ubah Mode Gelap/Terang"
          aria-label="Ubah Mode Gelap atau Terang"
        >
          {#if uiStore.isDarkMode}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
            </svg>
          {/if}
        </button>

        {#if chatStore.authUser}
          <div class="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 py-1 px-2.5 rounded-xl">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {chatStore.authUser.username} ({chatStore.authUser.role})
            </span>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
    {#if !chatStore.authUser || chatStore.authUser.role !== 'admin'}
      <!-- Access Denied Card -->
      <div class="p-8 max-w-md mx-auto text-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl shadow-xl space-y-4 my-12">
        <div class="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
          🔒
        </div>
        <h2 class="text-xl font-black text-gray-900 dark:text-white">Akses Terbatas</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Halaman ini khusus untuk Administrator RSUD Bangil. Silakan login menggunakan akun yang memiliki hak akses administrator.
        </p>
        <div class="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
          <a
            href="/chat"
            class="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition shadow-md shadow-emerald-600/20"
          >
            Kembali ke Chat & Login
          </a>
        </div>
      </div>
    {:else}
      <!-- Alert Message -->
      {#if actionMessage}
        <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div class="flex items-center gap-2">
            <span>✓</span>
            <span>{actionMessage}</span>
          </div>
          <button type="button" onclick={() => (actionMessage = '')} class="text-emerald-600 hover:text-emerald-800 text-sm cursor-pointer">✕</button>
        </div>
      {/if}

      <!-- Navigation Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-xs overflow-x-auto">
        <button
          type="button"
          onclick={() => (activeTab = 'stats')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer
            {activeTab === 'stats'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>📊</span>
          <span>Statistik & Sistem</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'users')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer
            {activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>👥</span>
          <span>Kelola Pengguna ({usersList.length})</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'channels')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer
            {activeTab === 'channels'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>💬</span>
          <span>Kelola Channel ({chatStore.channels.length})</span>
        </button>

        <button
          type="button"
          onclick={() => (activeTab = 'settings')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer
            {activeTab === 'settings'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>⚙️</span>
          <span>Pengaturan Sistem</span>
        </button>
      </div>

      <!-- Tab Content Panels -->
      {#if activeTab === 'stats'}
        <AdminStatsTab {stats} />
      {:else if activeTab === 'users'}
        <AdminUsersTab
          users={usersList}
          searchQuery={userSearch}
          onSearchChange={(q) => (userSearch = q)}
          onRefresh={loadData}
          onUpdateStatus={updateUserStatus}
          onUpdateRole={updateUserRole}
        />
      {:else if activeTab === 'channels'}
        <AdminChannelsTab
          channels={chatStore.channels}
          isCreating={isCreatingChannel}
          isSubmitting={isSubmittingChannel}
          onToggleCreating={() => (isCreatingChannel = !isCreatingChannel)}
          onCreateChannel={handleCreateChannel}
          onDeleteChannel={handleDeleteChannel}
        />
      {:else if activeTab === 'settings'}
        <AdminSettingsTab
          {allowGuest}
          {allowRegistration}
          isSaving={isSavingSettings}
          onToggleGuest={() => (allowGuest = !allowGuest)}
          onToggleRegistration={() => (allowRegistration = !allowRegistration)}
          onSave={handleSaveSettings}
        />
      {/if}
    {/if}
  </main>
</div>

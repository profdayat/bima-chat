<script lang="ts">
  import { onMount } from 'svelte';
  import { chatStore, getApiBase, type Channel } from '$lib/stores/chat.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { goto } from '$app/navigation';

  let activeTab = $state<'stats' | 'users' | 'channels'>('stats');
  let stats = $state({ users: 0, messages: 0, channels: 0 });
  let usersList = $state<any[]>([]);
  let isLoading = $state(false);
  let actionMessage = $state('');
  let userSearch = $state('');
  let isCreatingChannel = $state(false);
  let newChannelName = $state('');
  let isSubmittingChannel = $state(false);

  onMount(() => {
    if (!chatStore.authUser || chatStore.authUser.role !== 'admin') {
      // Allow a brief check or stay on page with access-denied state
    }
    loadData();
    chatStore.loadChannels();
  });

  let filteredUsers = $derived(
    usersList.filter(u =>
      (u.displayName || u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(userSearch.toLowerCase())
    )
  );

  async function loadData() {
    isLoading = true;
    actionMessage = '';
    const base = getApiBase();
    try {
      // Fetch stats
      const statsRes = await fetch(`${base}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
      });
      if (statsRes.ok) {
        stats = await statsRes.json();
      }

      // Fetch users
      const usersRes = await fetch(`${base}/api/admin/users`, {
        headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
      });
      if (usersRes.ok) {
        usersList = await usersRes.json();
      }
    } catch (e) {
      console.error('Error loading admin data:', e);
    } finally {
      isLoading = false;
    }
  }

  async function updateUserStatus(userId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'true' ? 'false' : 'true';
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chatStore.authToken}`
        },
        body: JSON.stringify({
          role: usersList.find(u => u.id === userId)?.role || 'staff',
          isActive: nextStatus
        })
      });
      if (res.ok) {
        actionMessage = `Status akun berhasil diubah menjadi ${nextStatus === 'true' ? 'Aktif' : 'Suspended'}`;
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function updateUserRole(userId: string, currentRole: string) {
    const nextRole = currentRole === 'admin' ? 'staff' : 'admin';
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${chatStore.authToken}`
        },
        body: JSON.stringify({
          role: nextRole,
          isActive: usersList.find(u => u.id === userId)?.isActive || 'true'
        })
      });
      if (res.ok) {
        actionMessage = `Role pengguna berhasil diubah menjadi ${nextRole.toUpperCase()}`;
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeleteChannel(channelId: string, channelName: string) {
    if (!confirm(`Hapus channel #${channelName}? Semua pesan di dalamnya akan terhapus secara permanen!`)) return;
    const base = getApiBase();
    try {
      const res = await fetch(`${base}/api/admin/channels/${channelId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${chatStore.authToken}` }
      });
      if (res.ok) {
        actionMessage = `Channel #${channelName} berhasil dihapus!`;
        chatStore.loadChannels();
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateChannel(e: Event) {
    e.preventDefault();
    if (!newChannelName.trim() || isSubmittingChannel) return;
    isSubmittingChannel = true;
    const created = await chatStore.createChannel(newChannelName.trim());
    isSubmittingChannel = false;
    if (created) {
      actionMessage = `Channel #${created.name} berhasil dibuat!`;
      newChannelName = '';
      isCreatingChannel = false;
      loadData();
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard — BIMA Chat</title>
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
          onclick={() => uiStore.toggleDarkMode()}
          class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
          title="Ubah Mode Gelap/Terang"
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
          <button onclick={() => (actionMessage = '')} class="text-emerald-600 hover:text-emerald-800 text-sm">✕</button>
        </div>
      {/if}

      <!-- Navigation Tabs -->
      <div class="flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-xs overflow-x-auto">
        <button
          onclick={() => (activeTab = 'stats')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2
            {activeTab === 'stats'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>📊</span>
          <span>Statistik & Sistem</span>
        </button>

        <button
          onclick={() => (activeTab = 'users')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2
            {activeTab === 'users'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>👥</span>
          <span>Kelola Pengguna ({usersList.length})</span>
        </button>

        <button
          onclick={() => (activeTab = 'channels')}
          class="flex-1 min-w-[120px] py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2
            {activeTab === 'channels'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}"
        >
          <span>💬</span>
          <span>Kelola Channel ({chatStore.channels.length})</span>
        </button>
      </div>

      <!-- Tab 1: Stats & Overview -->
      {#if activeTab === 'stats'}
        <div class="space-y-6 animate-fadeIn">
          <!-- Metric Cards -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <!-- Users Card -->
            <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total User</p>
                  <p class="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.users}</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
                  👥
                </div>
              </div>
              <p class="text-[11px] text-gray-400 mt-3">Akun staff & admin terdaftar</p>
            </div>

            <!-- Messages Card -->
            <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Pesan</p>
                  <p class="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-400 mt-2">{stats.messages}</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center text-xl shadow-inner">
                  💬
                </div>
              </div>
              <p class="text-[11px] text-gray-400 mt-3">Tersimpan di PostgreSQL database</p>
            </div>

            <!-- Channels Card -->
            <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channel Aktif</p>
                  <p class="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{stats.channels}</p>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center text-xl shadow-inner">
                  #
                </div>
              </div>
              <p class="text-[11px] text-gray-400 mt-3">Ruang chat poli & unit kerja</p>
            </div>
          </div>

          <!-- Infrastructure & System Info -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Server Status -->
            <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs space-y-4">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Status Infrastruktur Realtime</span>
              </h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
                  <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Backend Server (Elysia Bun)</span>
                  <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Online (:8080)
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
                  <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Database (PostgreSQL)</span>
                  <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected (:5432)
                  </span>
                </div>
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
                  <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Pub/Sub Engine (Redis)</span>
                  <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connected (:6379)
                  </span>
                </div>
              </div>
            </div>

            <!-- Architecture Info -->
            <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs space-y-3">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>🛡️</span>
                <span>Arsitektur & Keamanan</span>
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Sistem chat RSUD Bangil menggunakan autentikasi berbasis JWT token, otorisasi peran (Role-Based Access Control) bertingkat, dan enkripsi password menggunakan algoritma Bcrypt.
              </p>
              <div class="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl">
                <p class="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  🚀 Blue-Green Zero Downtime Deployment
                </p>
                <p class="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                  Pembaruan backend dan frontend dapat diterapkan kapan saja tanpa memutus koneksi realtime pengguna aktif.
                </p>
              </div>
            </div>
          </div>
        </div>

      <!-- Tab 2: User Management -->
      {:else if activeTab === 'users'}
        <div class="space-y-4 animate-fadeIn">
          <!-- Search & Filter Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-700">
            <div class="relative w-full sm:w-72">
              <input
                type="text"
                bind:value={userSearch}
                placeholder="Cari user berdasarkan nama / role..."
                class="w-full text-xs py-2 pl-9 pr-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
              />
              <span class="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
            </div>
            <button
              onclick={loadData}
              class="w-full sm:w-auto px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <span>🔄</span>
              <span>Refresh Data</span>
            </button>
          </div>

          <!-- Users List Table -->
          <div class="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th class="py-3.5 px-4 sm:px-6">Pengguna</th>
                    <th class="py-3.5 px-4">Role</th>
                    <th class="py-3.5 px-4">Status</th>
                    <th class="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-150 dark:divide-gray-700">
                  {#each filteredUsers as user (user.id)}
                    <tr class="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition">
                      <!-- User Info -->
                      <td class="py-3.5 px-4 sm:px-6">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                            {(user.displayName || user.username || '').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p class="font-bold text-gray-900 dark:text-white text-sm">
                              {user.displayName || user.username}
                            </p>
                            <p class="text-[11px] text-gray-400">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      <!-- Role Badge -->
                      <td class="py-3.5 px-4">
                        <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold
                          {user.role === 'admin'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'}">
                          {user.role.toUpperCase()}
                        </span>
                      </td>

                      <!-- Status Badge -->
                      <td class="py-3.5 px-4">
                        <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold
                          {user.isActive === 'true'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}">
                          {user.isActive === 'true' ? 'Aktif' : 'Suspended'}
                        </span>
                      </td>

                      <!-- Actions -->
                      <td class="py-3.5 px-4 sm:px-6 text-right">
                        {#if user.id !== chatStore.authUser?.id}
                          <div class="flex items-center justify-end gap-2">
                            <!-- Toggle Active/Suspend -->
                            <button
                              onclick={() => updateUserStatus(user.id, user.isActive)}
                              class="py-1.5 px-3 rounded-xl text-xs font-bold transition
                                {user.isActive === 'true'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'}"
                            >
                              {user.isActive === 'true' ? 'Suspend' : 'Aktifkan'}
                            </button>

                            <!-- Toggle Role -->
                            <button
                              onclick={() => updateUserRole(user.id, user.role)}
                              class="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                            >
                              Jadikan {user.role === 'admin' ? 'Staff' : 'Admin'}
                            </button>
                          </div>
                        {:else}
                          <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold italic">Akun Anda</span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      <!-- Tab 3: Channel Management -->
      {:else if activeTab === 'channels'}
        <div class="space-y-4 animate-fadeIn">
          <!-- Create Channel Action Bar -->
          <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-700">
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">Daftar Ruang Chat (Channels)</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kelola channel resmi untuk komunikasi antar unit kerja</p>
            </div>
            <button
              onclick={() => (isCreatingChannel = !isCreatingChannel)}
              class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Buat Channel Baru</span>
            </button>
          </div>

          <!-- New Channel Inline Form -->
          {#if isCreatingChannel}
            <form onsubmit={handleCreateChannel} class="p-5 bg-emerald-50/80 dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-3 animate-fadeIn">
              <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Form Tambah Channel Baru</h4>
              <div class="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  bind:value={newChannelName}
                  placeholder="contoh: poli-bedah atau humas-rsud"
                  class="flex-1 text-xs py-2 px-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                  required
                />
                <div class="flex gap-2">
                  <button
                    type="submit"
                    disabled={!newChannelName.trim() || isSubmittingChannel}
                    class="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50"
                  >
                    {isSubmittingChannel ? 'Menyimpan...' : 'Simpan Channel'}
                  </button>
                  <button
                    type="button"
                    onclick={() => (isCreatingChannel = false)}
                    class="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          {/if}

          <!-- Channels Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each chatStore.channels as channel (channel.id)}
              <div class="p-5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
                <div>
                  <div class="flex items-center justify-between">
                    <span class="text-base font-black text-gray-900 dark:text-white flex items-center gap-1">
                      <span class="text-emerald-500">#</span>
                      <span>{channel.name}</span>
                    </span>
                    {#if channel.name === 'general'}
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        Default
                      </span>
                    {/if}
                  </div>
                  <p class="text-[11px] text-gray-400 mt-1 font-mono">{channel.id}</p>
                </div>

                <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <a
                    href="/chat/{channel.id}"
                    class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Masuk Channel</span>
                    <span>&rarr;</span>
                  </a>

                  {#if channel.name !== 'general'}
                    <button
                      onclick={() => handleDeleteChannel(channel.id, channel.name)}
                      class="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition"
                    >
                      Hapus
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </main>
</div>

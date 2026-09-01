<script lang="ts">
  import { onMount } from 'svelte';
  import { chatStore, type Channel, type User } from '../stores/chat.svelte';
  import { uiStore } from '../stores/ui.svelte';
  import { goto } from '$app/navigation';

  let searchQuery = $state('');
  let isCreating = $state(false);
  let newChannelName = $state('');
  let isSubmitting = $state(false);
  let isEditingName = $state(false);
  let editedName = $state('');
  let activeTab = $state<'all' | 'channels' | 'direct'>('all');

  onMount(() => {
    chatStore.loadChannels();
    chatStore.loadUsers();
  });

  let filteredChannels = $derived(
    chatStore.channels.filter((c: Channel) =>
      c.type !== 'dm' && c.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  let filteredStaffUsers = $derived(
    chatStore.usersList.filter((u: User) =>
      u.id !== chatStore.authUser?.id &&
      ((u.displayName || u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
       (u.role || '').toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  async function handleCreateChannel(e: Event) {
    e.preventDefault();
    if (!newChannelName.trim() || isSubmitting) return;

    isSubmitting = true;
    const created = await chatStore.createChannel(newChannelName.trim());
    isSubmitting = false;

    if (created) {
      newChannelName = '';
      isCreating = false;
      uiStore.setSidebar(false);
      goto(`/chat/${created.id}`);
    }
  }

  function handleStartDM(targetUser: User) {
    uiStore.setSidebar(false);
    goto(`/chat/@${targetUser.username}`);
  }

  function startEditName() {
    editedName = chatStore.currentUsername;
    isEditingName = true;
  }

  function saveName() {
    if (editedName.trim()) {
      chatStore.setGuestNickname(editedName.trim());
    }
    isEditingName = false;
  }

  function selectChannel(id: string) {
    uiStore.setSidebar(false);
    goto(`/chat/${id}`);
  }
</script>

<aside class="w-full border-r border-[#d1d7db] dark:border-[#222d34] bg-white dark:bg-[#111b21] flex flex-col h-full select-none shadow-xs relative z-10">
  <!-- WhatsApp Web Style Top Header Bar -->
  <div class="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#d1d7db] dark:border-[#222d34] flex items-center justify-between">
    <!-- User Avatar & Profile Quick Trigger -->
    <button
      onclick={() => uiStore.openProfileModal()}
      class="flex items-center gap-2.5 hover:opacity-80 transition text-left"
      title="Profil Anda"
    >
      {#if chatStore.authUser?.avatarUrl}
        <img
          src={chatStore.authUser.avatarUrl}
          alt={chatStore.authUser?.displayName || chatStore.currentUsername}
          class="w-9 h-9 rounded-full object-cover shadow-xs shrink-0 border border-black/10 dark:border-white/10"
        />
      {:else}
        <div class="w-9 h-9 rounded-full bg-[#00a884] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
          {(chatStore.authUser?.displayName || chatStore.currentUsername).slice(0, 2).toUpperCase()}
        </div>
      {/if}
      <div class="min-w-0">
        <p class="text-[13px] font-bold text-[#111b21] dark:text-[#e9edef] truncate max-w-[120px]">
          {chatStore.currentUsername}
        </p>
        <p class="text-[10px] text-[#00a884] dark:text-[#25d366] font-semibold">
          {chatStore.authUser ? chatStore.authUser.role.toUpperCase() : 'TAMU'}
        </p>
      </div>
    </button>

    <!-- Top Action Icons (Dark mode, Admin, Close) -->
    <div class="flex items-center gap-1 text-[#54656f] dark:text-[#aebac1]">
      <!-- New Channel Icon -->
      <button
        onclick={() => (isCreating = !isCreating)}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition"
        title="Buat Channel Baru"
        aria-label="Buat Channel Baru"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
      </button>

      <!-- Admin Panel Gear (if admin) -->
      {#if chatStore.authUser?.role === 'admin'}
        <a
          href="/admin"
          onclick={() => uiStore.setSidebar(false)}
          class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition"
          title="Dashboard Admin"
          aria-label="Dashboard Admin"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </a>
      {/if}

      <!-- Dark Mode Toggle -->
      <!-- Sound Notification Toggle -->
      <button
        onclick={() => chatStore.toggleSound()}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition text-[#54656f] dark:text-[#aebac1]"
        title={chatStore.isSoundEnabled ? 'Nada Pesan Aktif (Klik untuk matikan)' : 'Nada Pesan Hening (Klik untuk aktifkan)'}
        aria-label="Toggle Nada Pesan"
      >
        {#if chatStore.isSoundEnabled}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
          </svg>
        {:else}
          <svg class="w-5 h-5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
          </svg>
        {/if}
      </button>

      <!-- Theme Switcher -->
      <button
        onclick={() => uiStore.toggleDarkMode()}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition"
        title="Ubah Tema"
        aria-label="Ubah Tema"
      >
        {#if uiStore.isDarkMode}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"></path>
          </svg>
        {:else}
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
          </svg>
        {/if}
      </button>

      <!-- Mobile Close Drawer (X) -->
      <button
        onclick={() => uiStore.setSidebar(false)}
        class="md:hidden p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition"
        aria-label="Tutup menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>

  <!-- WhatsApp Web Search & Filter Header -->
  <div class="p-2 border-b border-[#d1d7db] dark:border-[#222d34] space-y-2">
    <!-- Search bar -->
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari atau mulai obrolan baru"
        class="w-full text-[13px] py-1.5 pl-9 pr-3 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg text-[#111b21] dark:text-[#d1d7db] placeholder-[#8696a0] border-0 focus:ring-0 outline-none"
      />
      <svg class="w-4 h-4 text-[#8696a0] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </div>

    <!-- WhatsApp Filter Chips -->
    <div class="flex gap-1.5 px-0.5 overflow-x-auto select-none">
      <button
        onclick={() => (activeTab = 'all')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap
          {activeTab === 'all'
            ? 'bg-[#00a884] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Semua
      </button>
      <button
        onclick={() => (activeTab = 'channels')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap
          {activeTab === 'channels'
            ? 'bg-[#00a884] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Channel ({filteredChannels.length})
      </button>
      <button
        onclick={() => (activeTab = 'direct')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap
          {activeTab === 'direct'
            ? 'bg-[#00a884] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Pribadi / DM ({filteredStaffUsers.length})
      </button>
    </div>

    <!-- Inline Create Channel Form -->
    {#if isCreating}
      <form onsubmit={handleCreateChannel} class="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg space-y-2 animate-fadeIn border border-[#00a884]/30">
        <label for="newChanInput" class="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Nama Channel Baru:</label>
        <div class="flex items-center space-x-1">
          <span class="text-[#8696a0] text-sm font-bold">#</span>
          <input
            id="newChanInput"
            type="text"
            bind:value={newChannelName}
            placeholder="contoh: poli-anak"
            class="w-full text-xs py-1.5 px-2 bg-white dark:bg-[#2a3942] rounded-md text-[#111b21] dark:text-[#e9edef] border-0 outline-none"
            disabled={isSubmitting}
            required
          />
        </div>
        <div class="flex justify-end space-x-1.5 pt-1">
          <button
            type="button"
            onclick={() => (isCreating = false)}
            class="text-xs px-2.5 py-1 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!newChannelName.trim() || isSubmitting}
            class="text-xs px-3 py-1 bg-[#00a884] hover:bg-[#00a884]/90 text-white rounded-md font-bold disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Membuat...' : 'Buat Channel'}
          </button>
        </div>
      </form>
    {/if}
  </div>

  <!-- WhatsApp Chat List Items -->
  <div class="flex-1 overflow-y-auto divide-y divide-[#d1d7db]/40 dark:divide-[#222d34]/60">
    <!-- 1. Channels Section -->
    {#if activeTab === 'all' || activeTab === 'channels'}
      {#if chatStore.isLoadingChannels}
        <div class="p-6 text-center text-xs text-[#8696a0] space-y-2">
          <div class="animate-spin w-4 h-4 border-2 border-[#00a884] border-t-transparent rounded-full mx-auto"></div>
          <p>Memuat percakapan...</p>
        </div>
      {:else}
        {#each filteredChannels as channel (channel.id)}
          {@const isActive = chatStore.activeChannelId === channel.id || chatStore.activeChannelId === channel.name}
          <button
            onclick={() => selectChannel(channel.id)}
            class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 group
              {isActive
                ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'}"
          >
            <!-- Avatar -->
            <div class="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
              #
            </div>

            <!-- Content preview (WhatsApp Style) -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center justify-between">
                <span class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  {channel.name}
                </span>
                <span class="text-[11px] text-[#667781] dark:text-[#8696a0] shrink-0 ml-2">
                  RSUD
                </span>
              </div>
              <p class="text-[13px] text-[#667781] dark:text-[#8696a0] truncate mt-0.5">
                Channel komunikasi tim internal
              </p>
            </div>
          </button>
        {/each}
      {/if}
    {/if}

    <!-- 2. Direct Messages (Staff 1-on-1) Section -->
    {#if activeTab === 'all' || activeTab === 'direct'}
      {#if filteredStaffUsers.length > 0}
        {#if activeTab === 'all'}
          <div class="px-4 py-1.5 bg-[#f0f2f5]/60 dark:bg-[#202c33]/60 text-[11px] font-bold text-[#8696a0] uppercase tracking-wide">
            Pesan Pribadi Antar Staf
          </div>
        {/if}

        {#each filteredStaffUsers as user (user.id)}
          <button
            onclick={() => handleStartDM(user)}
            class="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] group"
          >
            <!-- User Avatar with Green online dot -->
            <div class="relative w-12 h-12 rounded-full shrink-0 shadow-2xs">
              {#if user.avatarUrl}
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  class="w-12 h-12 rounded-full object-cover border border-black/5 dark:border-white/5"
                />
              {:else}
                <div class="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-base">
                  {(user.displayName || user.username).slice(0, 2).toUpperCase()}
                </div>
              {/if}
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-white dark:border-[#111b21]"></span>
            </div>

            <!-- User details -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center justify-between">
                <span class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  {user.displayName || user.username}
                </span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-[#00a884]/15 text-[#00a884] dark:text-[#25d366] font-bold shrink-0 ml-2">
                  {user.role.toUpperCase()}
                </span>
              </div>
              <p class="text-[13px] text-[#667781] dark:text-[#8696a0] truncate mt-0.5 flex items-center gap-1">
                <span>Klik untuk chat 1-on-1</span>
              </p>
            </div>
          </button>
        {/each}
      {/if}
    {/if}
  </div>

  <!-- Bottom Quick Auth / Profile Footer -->
  {#if !chatStore.authUser}
    <div class="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#222d34]">
      <button
        onclick={() => uiStore.openAuthModal()}
        class="w-full py-2 px-3 bg-[#00a884] hover:bg-[#00a884]/90 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
        </svg>
        <span>Masuk Akun Staf RSUD</span>
      </button>
    </div>
  {/if}
</aside>

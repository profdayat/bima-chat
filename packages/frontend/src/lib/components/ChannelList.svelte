<script lang="ts">
  import { onMount } from 'svelte';
  import { chatStore, formatWhatsAppTimestamp, type Channel, type User } from '../stores/chat.svelte';
  import { uiStore } from '../stores/ui.svelte';
  import { goto } from '$app/navigation';

  let searchQuery = $state('');
  let isCreating = $state(false);
  let newChannelName = $state('');
  let isSubmitting = $state(false);
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
      goto(`/chat/${created.id}`);
    }
  }

  function handleStartDM(targetUser: User) {
    goto(`/chat/@${targetUser.username}`);
  }

  function selectChannel(id: string) {
    goto(`/chat/${id}`);
  }
</script>

<aside class="w-full border-r border-[#d1d7db] dark:border-[#222d34] bg-white dark:bg-[#111b21] flex flex-col h-full select-none shadow-xs relative z-10">
  <!-- WhatsApp Authentic Top Header Bar -->
  <div class="px-4 py-3 bg-[#f0f2f5] dark:bg-[#1f2c34] border-b border-[#d1d7db] dark:border-[#222d34] flex items-center justify-between">
    <!-- Brand / User Info -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        onclick={() => uiStore.openProfileModal()}
        class="relative hover:opacity-85 transition cursor-pointer"
        title="Profil Anda"
      >
        {#if chatStore.authUser?.avatarUrl}
          <img
            src={chatStore.authUser.avatarUrl}
            alt={chatStore.authUser?.displayName || chatStore.currentUsername}
            width="40"
            height="40"
            loading="lazy"
            decoding="async"
            class="w-10 h-10 rounded-full object-cover shadow-xs shrink-0 border border-black/10 dark:border-white/10"
          />
        {:else}
          <div class="w-10 h-10 rounded-full bg-[#008069] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
            {(chatStore.authUser?.displayName || chatStore.currentUsername).slice(0, 2).toUpperCase()}
          </div>
        {/if}
      </button>

      <div class="min-w-0">
        <h1 class="text-lg font-bold text-[#111b21] dark:text-white leading-tight">
          BIMA Chat
        </h1>
        <p class="text-[11px] text-[#008069] dark:text-[#00a884] font-medium leading-none truncate max-w-[130px]">
          {chatStore.currentUsername} ({chatStore.authUser ? chatStore.authUser.role.toUpperCase() : 'TAMU'})
        </p>
      </div>
    </div>

    <!-- Header Action Icons -->
    <div class="flex items-center gap-1 text-[#4b5563] dark:text-[#aebac1]">
      <!-- New Channel Icon -->
      <button
        type="button"
        onclick={() => (isCreating = !isCreating)}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
        title="Buat Channel Baru"
        aria-label="Buat Channel Baru"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
      </button>

      <!-- Admin Panel Link -->
      {#if chatStore.authUser?.role === 'admin'}
        <a
          href="/admin"
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

      <!-- Sound Toggle -->
      <button
        type="button"
        onclick={() => chatStore.toggleSound()}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
        title={chatStore.isSoundEnabled ? 'Nada Pesan Aktif' : 'Nada Pesan Hening'}
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
        type="button"
        onclick={() => uiStore.toggleDarkMode()}
        class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition cursor-pointer"
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
    </div>
  </div>

  <!-- WhatsApp Search Bar & Filter Chips -->
  <div class="p-2 border-b border-[#d1d7db] dark:border-[#222d34] space-y-2 bg-white dark:bg-[#111b21]">
    <!-- Search bar -->
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari atau mulai obrolan baru"
        aria-label="Cari atau mulai obrolan baru"
        class="w-full text-[13.5px] py-1.5 pl-9 pr-8 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] border-0 focus:ring-0 outline-none"
      />
      <svg class="w-4 h-4 text-[#667781] dark:text-[#8696a0] absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      {#if searchQuery}
        <button
          type="button"
          onclick={() => (searchQuery = '')}
          class="absolute right-2.5 top-2 text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white"
          title="Hapus pencarian"
        >
          ✕
        </button>
      {/if}
    </div>

    <!-- WhatsApp Filter Chips (Horizontal scrollable pills) -->
    <div class="flex gap-1.5 px-0.5 overflow-x-auto select-none no-scrollbar" role="tablist" aria-label="Filter obrolan">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'all'}
        onclick={() => (activeTab = 'all')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap cursor-pointer
          {activeTab === 'all'
            ? 'bg-[#008069] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Semua
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'channels'}
        onclick={() => (activeTab = 'channels')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap cursor-pointer
          {activeTab === 'channels'
            ? 'bg-[#008069] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Channel ({filteredChannels.length})
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'direct'}
        onclick={() => (activeTab = 'direct')}
        class="px-3 py-1 rounded-full text-[12px] font-semibold transition whitespace-nowrap cursor-pointer
          {activeTab === 'direct'
            ? 'bg-[#008069] text-white'
            : 'bg-[#f0f2f5] dark:bg-[#202c33] text-[#667781] dark:text-[#8696a0] hover:bg-[#e9edef] dark:hover:bg-[#2a3942]'}"
      >
        Pribadi / Staf ({filteredStaffUsers.length})
      </button>
    </div>

    <!-- Inline Create Channel Form -->
    {#if isCreating}
      <form onsubmit={handleCreateChannel} class="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg space-y-2 animate-fadeIn border border-[#008069]/30">
        <label for="newChanInput" class="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Nama Channel Baru:</label>
        <div class="flex items-center space-x-1">
          <span class="text-[#667781] dark:text-[#8696a0] text-sm font-bold">#</span>
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
            class="text-xs px-2.5 py-1 text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!newChannelName.trim() || isSubmitting}
            class="text-xs px-3 py-1 bg-[#008069] hover:bg-[#007a60] text-white rounded-md font-bold disabled:opacity-50 transition cursor-pointer"
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
        <div class="divide-y divide-[#d1d7db]/40 dark:divide-[#222d34]/60 animate-pulse" aria-busy="true" aria-label="Memuat daftar obrolan...">
          {#each Array(4) as _}
            <div class="w-full flex items-center gap-3 px-4 py-3 h-[72px]">
              <div class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
              <div class="flex-1 space-y-2">
                <div class="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="h-3 w-40 bg-gray-200/80 dark:bg-gray-700/60 rounded"></div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        {#each filteredChannels as channel (channel.id)}
          {@const isActive = chatStore.activeChannelId === channel.id || chatStore.activeChannelId === channel.name}
          <button
            onclick={() => selectChannel(channel.id)}
            class="w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100 group cursor-pointer
              {isActive
                ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'}"
          >
            <!-- Avatar Circle -->
            <div class="w-12 h-12 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-2xs">
              #
            </div>

            <!-- Content preview (WhatsApp Authentic Style) -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center justify-between">
                <span class="text-[15.5px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  {channel.name}
                </span>
                <span class="text-[11.5px] shrink-0 ml-2 {channel.unreadCount ? 'text-[#00a884] font-bold' : 'text-[#667781] dark:text-[#8696a0]'}">
                  {channel.lastMessage?.createdAt ? formatWhatsAppTimestamp(channel.lastMessage.createdAt) : ''}
                </span>
              </div>
              <div class="flex items-center justify-between mt-0.5">
                <p class="text-[13px] text-[#667781] dark:text-[#8696a0] truncate pr-2">
                  {#if channel.lastMessage}
                    {#if channel.lastMessage.attachments && channel.lastMessage.attachments.length > 0}
                      <span class="inline-flex items-center gap-1 text-[#111b21] dark:text-[#e9edef]">
                        <span>📷</span>
                        <span>Foto</span>
                      </span>
                    {:else}
                      <span class="font-medium text-[#111b21]/80 dark:text-[#e9edef]/80">~ {channel.lastMessage.senderName}:</span>
                      <span>{channel.lastMessage.text}</span>
                    {/if}
                  {:else}
                    <span class="italic text-gray-400 dark:text-gray-500 text-[12px]">Belum ada pesan</span>
                  {/if}
                </p>
                {#if channel.unreadCount && channel.unreadCount > 0}
                  <span class="min-w-[18px] h-[18px] px-1 bg-[#00a884] text-white font-bold text-[10.5px] rounded-full flex items-center justify-center shrink-0">
                    {channel.unreadCount}
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    {/if}

    <!-- 2. Direct Messages (Staff 1-on-1) Section -->
    {#if activeTab === 'all' || activeTab === 'direct'}
      {#if filteredStaffUsers.length > 0}
        {#if activeTab === 'all'}
          <div class="px-4 py-2 bg-[#f0f2f5]/80 dark:bg-[#202c33]/80 text-[11px] font-bold text-[#667781] dark:text-[#8696a0] uppercase tracking-wide">
            Pesan Pribadi Antar Staf
          </div>
        {/if}

        {#each filteredStaffUsers as user (user.id)}
          <button
            onclick={() => handleStartDM(user)}
            class="w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] group cursor-pointer"
          >
            <!-- User Avatar with Green online dot -->
            <div class="relative w-12 h-12 rounded-full shrink-0 shadow-2xs">
              {#if user.avatarUrl}
                <img
                  src={user.avatarUrl}
                  alt={user.displayName || user.username}
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                  class="w-12 h-12 rounded-full object-cover border border-black/5 dark:border-white/5"
                />
              {:else}
                <div class="w-12 h-12 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-base">
                  {(user.displayName || user.username).slice(0, 2).toUpperCase()}
                </div>
              {/if}
              <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a884] border-2 border-white dark:border-[#111b21]"></span>
            </div>

            <!-- User details -->
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <div class="flex items-center justify-between">
                <span class="text-[15.5px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
                  {user.displayName || user.username}
                </span>
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-[#008069]/15 text-[#008069] dark:text-[#00a884] font-bold shrink-0 ml-2">
                  {user.role.toUpperCase()}
                </span>
              </div>
              <p class="text-[13px] text-[#667781] dark:text-[#8696a0] truncate mt-0.5 flex items-center gap-1">
                <span>Klik untuk kirim pesan pribadi</span>
              </p>
            </div>
          </button>
        {/each}
      {/if}
    {/if}
  </div>

  <!-- WhatsApp Floating Action Button (FAB) on mobile -->
  <div class="md:hidden absolute bottom-5 right-5 z-20">
    <button
      type="button"
      onclick={() => (isCreating = !isCreating)}
      class="w-14 h-14 bg-[#00a884] hover:bg-[#008069] active:scale-95 text-white rounded-2xl shadow-xl flex items-center justify-center transition-all cursor-pointer"
      title="Buat Channel Baru"
      aria-label="Buat Channel Baru"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path>
      </svg>
    </button>
  </div>

  <!-- Bottom Quick Auth Footer if not logged in -->
  {#if !chatStore.authUser}
    <div class="p-3 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-[#d1d7db] dark:border-[#222d34]">
      <button
        onclick={() => uiStore.openAuthModal()}
        class="w-full py-2 px-3 bg-[#008069] hover:bg-[#007a60] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
        </svg>
        <span>Masuk Akun Staf RSUD</span>
      </button>
    </div>
  {/if}
</aside>

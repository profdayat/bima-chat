<script lang="ts">
  import type { User } from '$lib/types';
  import { chatStore } from '$lib/stores/chat.svelte';

  interface Props {
    channelId: string;
    channelDisplayName: string;
    isDirectMessage: boolean;
    dmTargetUser?: User | null;
    isTargetOnline: boolean;
    isTargetTyping: boolean;
    typingUsers: string[];
    isSearchOpen: boolean;
    onToggleSearch: () => void;
  }

  let {
    channelId,
    channelDisplayName,
    isDirectMessage,
    dmTargetUser,
    isTargetOnline,
    isTargetTyping,
    typingUsers,
    isSearchOpen,
    onToggleSearch
  }: Props = $props();
</script>

<header class="px-4 h-[60px] min-h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#d1d7db] dark:border-[#222d34] flex items-center justify-between z-20 select-none shadow-2xs shrink-0 sticky top-0">
  <div class="flex items-center space-x-3 min-w-0">
    <!-- Mobile Back Arrow Button: Returns to /chat full-screen list -->
    <a
      href="/chat"
      class="md:hidden p-1.5 -ml-1 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition flex items-center justify-center shrink-0 mr-1 cursor-pointer"
      title="Kembali ke daftar obrolan"
      aria-label="Kembali ke daftar obrolan"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"></path>
      </svg>
    </a>

    <!-- Avatar or Channel Icon -->
    {#if isDirectMessage}
      {#if dmTargetUser?.avatarUrl}
        <img
          src={dmTargetUser.avatarUrl}
          alt={channelDisplayName}
          width="40"
          height="40"
          loading="lazy"
          decoding="async"
          class="w-10 h-10 rounded-full object-cover shadow-xs shrink-0 select-none border border-black/10 dark:border-white/10"
        />
      {:else}
        <div class="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 select-none">
          {(channelDisplayName || 'U').slice(0, 2).toUpperCase()}
        </div>
      {/if}
    {:else}
      <div class="w-10 h-10 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 select-none">
        #
      </div>
    {/if}

    <div class="min-w-0">
      <h1 class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] flex items-center gap-1.5 leading-tight truncate">
        <span>{channelDisplayName}</span>
        {#if isDirectMessage && dmTargetUser}
          <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#008069]/20 text-[#008069] dark:text-[#00a884]">
            {dmTargetUser.role.toUpperCase()}
          </span>
        {/if}
      </h1>
      <div class="text-[12px] truncate leading-tight">
        {#if isDirectMessage}
          {#if isTargetTyping}
            <span class="text-[#008069] dark:text-[#00a884] font-medium animate-pulse">sedang mengetik...</span>
          {:else if isTargetOnline}
            <span class="text-[#008069] dark:text-[#00a884] font-medium">Online</span>
          {:else}
            <span class="text-[#667781] dark:text-[#8696a0]">Offline</span>
          {/if}
        {:else}
          {#if typingUsers.length > 0}
            <span class="text-[#008069] dark:text-[#00a884] font-medium animate-pulse">{typingUsers.join(', ')} sedang mengetik...</span>
          {:else}
            <span class="text-[#667781] dark:text-[#8696a0]">{chatStore.onlineCount} online • BIMA Chat RSUD</span>
          {/if}
        {/if}
      </div>
    </div>
  </div>

  <!-- Header Actions (Search & SSE Status) -->
  <div class="flex items-center gap-1.5 shrink-0 ml-2">
    <!-- Search inside chat button -->
    <button
      type="button"
      onclick={onToggleSearch}
      class="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition text-[#54656f] dark:text-[#aebac1] cursor-pointer"
      title="Cari pesan dalam obrolan"
      aria-label="Cari pesan dalam obrolan"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
    </button>

    <!-- Live SSE Status Indicator -->
    <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors
      {chatStore.isConnected 
        ? 'bg-emerald-500/10 text-[#008069] dark:text-[#00a884] border-[#008069]/30' 
        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'}"
    >
      <span class="relative flex h-2 w-2">
        {#if chatStore.isConnected}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-[#008069] dark:bg-[#00a884]"></span>
        {:else}
          <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        {/if}
      </span>
      <span class="text-[11px] leading-none hidden sm:inline">{chatStore.isConnected ? 'Terhubung' : 'Menghubungkan...'}</span>
    </div>
  </div>
</header>

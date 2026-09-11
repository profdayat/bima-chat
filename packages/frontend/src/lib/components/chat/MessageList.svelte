<script lang="ts">
  import type { ChatMessage as ChatMessageType, MessageGroup } from '$lib/types';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatSkeleton from '$lib/components/ChatSkeleton.svelte';
  import DateDivider from './DateDivider.svelte';
  import { chatStore } from '$lib/stores/chat.svelte';

  interface Props {
    messagesContainer: HTMLElement | undefined;
    messageGroups: MessageGroup[];
    pinnedMessages: ChatMessageType[];
    isDirectMessage: boolean;
    channelDisplayName: string;
    isLoadingHistory: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    isScrolledUp: boolean;
    newMessagesWhileScrolledUp: number;
    isScrolling: boolean;
    activeFloatingDate: string;
    onScroll: () => void;
    onScrollToBottom: () => void;
    onJumpToMessage: (id: string) => void;
  }

  let {
    messagesContainer = $bindable(),
    messageGroups,
    pinnedMessages,
    isDirectMessage,
    channelDisplayName,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    isScrolledUp,
    newMessagesWhileScrolledUp,
    isScrolling,
    activeFloatingDate,
    onScroll,
    onScrollToBottom,
    onJumpToMessage
  }: Props = $props();

  let activePinIndex = $state(0);
  let safePinIndex = $derived(
    pinnedMessages.length > 0 ? ((activePinIndex % pinnedMessages.length) + pinnedMessages.length) % pinnedMessages.length : 0
  );
  let currentPinned = $derived(pinnedMessages[safePinIndex]);
</script>

<!-- Pinned Message Docked Banner under Header -->
{#if pinnedMessages.length > 0 && currentPinned}
  <div class="absolute top-[60px] inset-x-0 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#e9edef] dark:border-[#222d34] px-3.5 py-2 text-xs flex items-center justify-between text-[#111b21] dark:text-[#e9edef] shrink-0 select-none shadow-xs z-20 animate-fadeIn">
    <button
      type="button"
      onclick={() => {
        onJumpToMessage(currentPinned.id);
        if (pinnedMessages.length > 1) {
          activePinIndex = (safePinIndex + 1) % pinnedMessages.length;
        }
      }}
      class="flex items-center gap-2.5 min-w-0 flex-1 text-left hover:opacity-85 transition cursor-pointer group py-0.5"
      title={pinnedMessages.length > 1 ? "Klik untuk loncat ke pesan (klik lagi untuk pin berikutnya)" : "Klik untuk loncat ke pesan yang disematkan"}
    >
      <!-- Left indicator bar for pinned messages -->
      <div class="w-1 h-7 rounded-full bg-[#00a884] shrink-0"></div>
      <span class="text-[#008069] dark:text-[#00a884] font-bold text-sm shrink-0">📌</span>
      <div class="min-w-0 flex-1 truncate">
        <div class="flex items-center gap-1.5 leading-tight">
          <span class="font-bold text-[#008069] dark:text-[#00a884] truncate">
            {currentPinned.sender?.displayName || currentPinned.sender?.username || 'Pesan Disematkan'}
          </span>
          {#if pinnedMessages.length > 1}
            <span class="text-[10px] text-[#667781] dark:text-[#8696a0] font-normal">
              ({safePinIndex + 1}/{pinnedMessages.length})
            </span>
          {/if}
        </div>
        <p class="text-[#667781] dark:text-[#8696a0] truncate mt-0.5">
          {currentPinned.text || (currentPinned.attachments && currentPinned.attachments.length > 0 ? '[Lampiran berkas]' : 'Pesan')}
        </p>
      </div>
    </button>

    <div class="flex items-center gap-1.5 shrink-0 ml-3">
      {#if pinnedMessages.length > 1}
        <div class="flex items-center gap-0.5 mr-1">
          <button
            type="button"
            onclick={() => {
              activePinIndex = (safePinIndex - 1 + pinnedMessages.length) % pinnedMessages.length;
              onJumpToMessage(pinnedMessages[activePinIndex].id);
            }}
            class="w-7 h-7 flex items-center justify-center text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            title="Pesan sematan sebelumnya"
            aria-label="Pesan sematan sebelumnya"
          >
            ‹
          </button>
          <button
            type="button"
            onclick={() => {
              activePinIndex = (safePinIndex + 1) % pinnedMessages.length;
              onJumpToMessage(pinnedMessages[activePinIndex].id);
            }}
            class="w-7 h-7 flex items-center justify-center text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-[#e9edef] rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
            title="Pesan sematan berikutnya"
            aria-label="Pesan sematan berikutnya"
          >
            ›
          </button>
        </div>
      {/if}

      <button
        type="button"
        onclick={() => chatStore.togglePinMessage(currentPinned.id, false)}
        class="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#8696a0] hover:text-rose-500 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
        title="Lepas sematan"
        aria-label="Lepas sematan"
      >
        ✕
      </button>
    </div>
  </div>
{/if}

<!-- Messages Area with WhatsApp Doodle Wallpaper -->
<main
  bind:this={messagesContainer}
  onscroll={onScroll}
  class="flex-1 overflow-y-auto px-3 md:px-5 py-3 relative min-h-0 wa-chat-wallpaper"
>
  {#if isLoadingHistory}
    <ChatSkeleton />
  {:else}
    {#if isLoadingMore}
      <div class="py-2 flex items-center justify-center gap-2 text-xs text-[#4b5563] dark:text-[#9ca3af]">
        <div class="w-3.5 h-3.5 border-2 border-[#008069] border-t-transparent rounded-full animate-spin"></div>
        <span>Memuat riwayat pesan...</span>
      </div>
    {:else if !hasMore && chatStore.messages.length > 0}
      <div class="py-3 text-center">
        <span class="px-3 py-1 bg-white/70 dark:bg-[#182229]/80 backdrop-blur-xs rounded-md text-[11px] font-medium text-[#4b5563] dark:text-[#9ca3af] shadow-2xs">
          Awal percakapan {isDirectMessage ? 'dengan ' + channelDisplayName : '#' + channelDisplayName}
        </span>
      </div>
    {/if}

    {#if chatStore.messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
        <div class="w-16 h-16 rounded-full bg-white/80 dark:bg-[#202c33] text-[#008069] dark:text-[#00a884] flex items-center justify-center text-2xl font-bold shadow-xs">
          {isDirectMessage ? '💬' : '#'}
        </div>
        <div>
          <h3 class="font-bold text-[#111b21] dark:text-[#e9edef] text-base">
            {isDirectMessage ? 'Percakapan Pribadi dengan ' + channelDisplayName : 'Selamat datang di #' + channelDisplayName + '!'}
          </h3>
          <p class="text-xs text-[#4b5563] dark:text-[#9ca3af] max-w-sm mt-1">
            {isDirectMessage ? 'Kirim pesan privat langsung kepada rekan kerja Anda.' : 'Belum ada pesan. Mulai obrolan dengan mengetik pesan di bawah.'}
          </p>
        </div>
      </div>
    {:else}
      <!-- WhatsApp Floating Scroll Date Pill -->
      <div
        class="sticky top-2 inset-x-0 z-30 flex justify-center pointer-events-none transition-all duration-300
          {isScrolling ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}"
      >
        <span class="px-3.5 py-1 bg-white/95 dark:bg-[#182229]/95 backdrop-blur-md text-[12px] font-semibold text-[#667781] dark:text-[#8696a0] rounded-lg shadow-md border border-black/5 dark:border-white/10 pointer-events-auto select-none">
          {activeFloatingDate || (messageGroups[messageGroups.length - 1]?.dateLabel || '')}
        </span>
      </div>

      {#each messageGroups as group (group.key)}
        <div data-date-group={group.dateLabel} class="relative w-full mb-3">
          <DateDivider dateLabel={group.dateLabel} />

          <!-- Messages for this day -->
          <div class="space-y-1.5">
            {#each group.messages as msg (msg.id || Math.random())}
              {@const isSelf = (msg.sender?.username || msg.sender) === chatStore.currentUsername}
              <ChatMessage
                message={msg}
                isSelf={isSelf}
              />
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  {/if}
</main>

<!-- Floating Scroll-to-Bottom Button (WhatsApp Style) -->
{#if isScrolledUp}
  <div class="absolute bottom-20 right-4 md:right-6 z-20">
    <button
      type="button"
      onclick={onScrollToBottom}
      class="w-10 h-10 bg-white dark:bg-[#202c33] text-[#54656f] dark:text-[#aebac1] rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition relative flex items-center justify-center active:scale-95 border border-black/5 dark:border-white/5 cursor-pointer"
      title="Gulir ke pesan terbaru"
      aria-label="Gulir ke pesan terbaru"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
      </svg>

      {#if newMessagesWhileScrolledUp > 0}
        <span class="absolute -top-1 -right-1 bg-[#008069] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
          {newMessagesWhileScrolledUp > 9 ? '9+' : newMessagesWhileScrolledUp}
        </span>
      {/if}
    </button>
  </div>
{/if}

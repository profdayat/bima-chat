<script lang="ts">
  import type { Channel } from '$lib/types';
  import { formatWhatsAppTimestamp } from '$lib/utils';
  import { chatStore } from '$lib/stores/chat.svelte';

  interface Props {
    channel: Channel;
    isActive: boolean;
    onSelect: (channelId: string) => void;
  }

  let { channel, isActive, onSelect }: Props = $props();

  let isDM = $derived(channel.type === 'dm');
  let targetUser = $derived(isDM ? channel.targetUser : null);
  let displayName = $derived(isDM ? (targetUser?.displayName || targetUser?.username || 'Staff RSUD') : channel.name);
  let isOnline = $derived(isDM && targetUser?.username ? chatStore.isUserOnline(targetUser.username) : false);
  let isTyping = $derived(
    chatStore.isTypingInChannel(channel.id) ||
    chatStore.isTypingInChannel(channel.name) ||
    Boolean(targetUser?.username && chatStore.isTypingInChannel(targetUser.username))
  );
</script>

<button
  type="button"
  onclick={() => onSelect(channel.id)}
  class="w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors duration-100 group cursor-pointer
    {isActive
      ? 'bg-[#f0f2f5] dark:bg-[#2a3942]'
      : 'hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]'}"
>
  <!-- Avatar (Channel Hash or User Avatar with Realtime Online Dot) -->
  <div class="relative w-12 h-12 rounded-full shrink-0 shadow-2xs">
    {#if isDM}
      {#if targetUser?.avatarUrl}
        <img
          src={targetUser.avatarUrl}
          alt={displayName}
          width="48"
          height="48"
          loading="lazy"
          decoding="async"
          class="w-12 h-12 rounded-full object-cover border border-black/5 dark:border-white/5"
        />
      {:else}
        <div class="w-12 h-12 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-base">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      {/if}
      <!-- Realtime Online Dot -->
      {#if isOnline}
        <span class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#00a884] border-2 border-white dark:border-[#111b21]"></span>
      {/if}
    {:else}
      <div class="w-12 h-12 rounded-full bg-[#008069] text-white flex items-center justify-center font-bold text-lg shrink-0">
        #
      </div>
    {/if}
  </div>

  <!-- Content preview -->
  <div class="flex-1 min-w-0 flex flex-col justify-center">
    <div class="flex items-center justify-between">
      <span class="text-[15.5px] font-semibold text-[#111b21] dark:text-[#e9edef] truncate">
        {displayName}
      </span>
      <span class="text-[11.5px] shrink-0 ml-2 {channel.unreadCount ? 'text-[#00a884] font-bold' : 'text-[#667781] dark:text-[#8696a0]'}">
        {channel.lastMessage?.createdAt ? formatWhatsAppTimestamp(channel.lastMessage.createdAt) : ''}
      </span>
    </div>
    <div class="flex items-center justify-between mt-0.5">
      <div class="text-[13px] text-[#667781] dark:text-[#8696a0] truncate pr-2">
        {#if isTyping}
          <span class="text-[#008069] dark:text-[#00a884] font-medium italic animate-pulse">
            sedang mengetik...
          </span>
        {:else if channel.lastMessage}
          {#if channel.lastMessage.attachments && channel.lastMessage.attachments.length > 0}
            <span class="inline-flex items-center gap-1 text-[#111b21] dark:text-[#e9edef]">
              <span>📷</span>
              <span>Foto</span>
            </span>
          {:else}
            {#if !isDM}
              <span class="font-medium text-[#111b21]/80 dark:text-[#e9edef]/80">~ {channel.lastMessage.senderName}:</span>
            {/if}
            <span>{channel.lastMessage.text}</span>
          {/if}
        {:else}
          <span class="italic text-gray-400 dark:text-gray-500 text-[12px]">Belum ada pesan</span>
        {/if}
      </div>
      {#if channel.unreadCount && channel.unreadCount > 0}
        <span class="min-w-[18px] h-[18px] px-1 bg-[#00a884] text-white font-bold text-[10.5px] rounded-full flex items-center justify-center shrink-0">
          {channel.unreadCount}
        </span>
      {/if}
    </div>
  </div>
</button>

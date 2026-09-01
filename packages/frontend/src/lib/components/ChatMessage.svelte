<script lang="ts">
  import { chatStore, type ChatMessage as MsgType, type MessageStatus } from '../stores/chat.svelte';
  import AttachmentPreview from './AttachmentPreview.svelte';
  import ReactionsView from './ReactionsView.svelte';
  import { goto } from '$app/navigation';

  let { message, isSelf = false }: { message: MsgType; isSelf?: boolean } = $props();

  function formatTime(timestamp: string | undefined) {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function getSenderColor(name: string) {
    const colors = [
      'text-[#53bdeb] dark:text-[#53bdeb]',
      'text-[#e58237] dark:text-[#e58237]',
      'text-[#a855f7] dark:text-[#c084fc]',
      'text-[#06b6d4] dark:text-[#22d3ee]',
      'text-[#10b981] dark:text-[#34d399]',
      'text-[#ec4899] dark:text-[#f472b6]'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  let senderName = $derived(
    message.sender?.username || (typeof message.sender === 'string' ? message.sender : message.type === 'webhook_inbound' ? 'Webhook System' : 'Staff RSUD')
  );
  let isWebhook = $derived(message.type === 'webhook_inbound');
  let msgStatus: MessageStatus = $derived(message.status || 'sent');

  // Find the message that this is replying to
  let repliedMessage = $derived(
    message.replyToId ? chatStore.messages.find(m => m.id === message.replyToId) : null
  );

  let showMenu = $state(false);
  let showCustomEmoji = $state(false);
  const QUICK_EMOJIS = ['👍', '❤️', '😂', '😲', '😢', '🙏'];
  const EXTRA_EMOJIS = ['🔥', '🎉', '👏', '💯', '🤔', '💪', '🤝', '🩺'];

  function handleReact(emoji: string) {
    chatStore.reactToMessage(message.id, emoji);
    showMenu = false;
    showCustomEmoji = false;
  }

  function startReply() {
    chatStore.replyingToMessage = message;
    showMenu = false;
  }

  async function handleReplyPrivately() {
    showMenu = false;
    if (!message.sender?.id || message.sender.id === 'guest' || message.sender.id === 'anon') return;
    const dmChan = await chatStore.startDirectMessage(message.sender.id);
    if (dmChan) {
      goto(`/chat/${dmChan.id}`);
    }
  }

  function copyMessageText() {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
    }
    showMenu = false;
  }

  function togglePin() {
    chatStore.togglePinMessage(message.id, !message.isPinned);
    showMenu = false;
  }

  function handleDelete() {
    if (confirm('Hapus pesan ini?')) {
      chatStore.deleteMessage(message.id);
    }
    showMenu = false;
  }
</script>

<svelte:window onclick={(e) => {
  // Close menu on outside click
  const target = e.target as HTMLElement;
  if (!target.closest(`#menu-${message.id}`) && !target.closest(`#btn-menu-${message.id}`)) {
    showMenu = false;
    showCustomEmoji = false;
  }
}} />

<div id="msg-{message.id}" class="flex w-full mb-2 {isSelf ? 'justify-end' : 'justify-start'} group transition-all duration-300 rounded-lg relative">
  <div class="flex items-start gap-2 max-w-[90%] md:max-w-[75%] {isSelf ? 'flex-row-reverse' : 'flex-row'}">
    <!-- Top-Aligned Profile Avatar Photo (WhatsApp Style) -->
    {#if !isSelf}
      <div
        class="w-8 h-8 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0 select-none mt-0.5 overflow-hidden"
        title={senderName}
      >
        {#if message.sender?.avatarUrl}
          <img src={message.sender.avatarUrl} alt={senderName} class="w-full h-full object-cover" />
        {:else}
          {senderName.slice(0, 2).toUpperCase()}
        {/if}
      </div>
    {/if}

    <div class="flex flex-col gap-0.5 min-w-0 {isSelf ? 'items-end' : 'items-start'} relative group/bubble">
      <!-- WhatsApp Web Message Bubble with Pointy Tail to Avatar -->
      <div
        class="relative px-3.5 py-1.5 rounded-lg shadow-xs text-sm max-w-full break-words transition-colors
          {isSelf
            ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none'
            : 'bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none'}"
      >
        <!-- WhatsApp Authentic Bubble Tail (Pointing to Avatar / Profile) -->
        {#if isSelf}
          <span data-testid="tail-out" class="absolute top-0 -right-2 w-2 h-[13px] text-[#d9fdd3] dark:text-[#005c4b] pointer-events-none z-10">
            <svg viewBox="0 0 8 13" width="8" height="13" class="w-full h-full block fill-current">
              <title>tail-out</title>
              <path d="M5.188,0H0v11.193l6.467-8.625C7.526,1.156,6.958,0,5.188,0z"></path>
            </svg>
          </span>
        {:else}
          <span data-testid="tail-in" class="absolute top-0 -left-2 w-2 h-[13px] text-white dark:text-[#202c33] pointer-events-none z-10">
            <svg viewBox="0 0 8 13" width="8" height="13" class="w-full h-full block fill-current">
              <title>tail-in</title>
              <path d="M1.533,2.568L8,11.193V0L2.812,0C1.042,0,0.474,1.156,1.533,2.568z"></path>
            </svg>
          </span>
        {/if}

        <!-- WhatsApp Header in Group: Sender Name and Info -->
        {#if !isSelf}
          <div class="flex items-center justify-between gap-3 text-xs font-bold {getSenderColor(senderName)} mb-0.5 select-none pr-5">
            <span class="truncate">~ {senderName}</span>
            <span class="text-[10px] text-[#667781] dark:text-[#8696a0] font-normal shrink-0">
              {isWebhook ? 'WEBHOOK' : 'RSUD'}
            </span>
          </div>
        {/if}

        {#if message.isPinned}
          <div class="text-[10px] text-amber-500 font-bold mb-0.5 select-none flex items-center gap-0.5">
            📌 Pinned
          </div>
        {/if}

        <!-- Replied Quote inside Bubble (WhatsApp Style) -->
        {#if repliedMessage}
          <div class="mb-1.5 p-2 bg-black/5 dark:bg-[#182229] rounded-md text-xs border-l-4 border-[#00a884] max-w-full text-left truncate">
            <p class="font-bold text-[#00a884] dark:text-[#53bdeb] text-[11.5px]">
              ~ {repliedMessage.sender?.username || 'Staff RSUD'}
            </p>
            <p class="text-[#54656f] dark:text-[#8696a0] text-[12.5px] truncate mt-0.5">
              {repliedMessage.text}
            </p>
          </div>
        {/if}

        <!-- Attachments preview (WhatsApp: Image above text/caption) -->
        {#if message.attachments}
          <div class="-mx-2 -mt-0.5 mb-1">
            <AttachmentPreview attachments={message.attachments} />
          </div>
        {/if}

        <!-- Content text + Inline Floating Timestamp (WhatsApp Web Style) -->
        {#if message.text && message.text.trim().length > 0}
          <div class="text-[14px] leading-relaxed select-text overflow-hidden pr-2">
            <span>{message.text}</span>

            <!-- Timestamp & Status Checkmarks Floated inline -->
            <span
              class="inline-flex items-center gap-1 float-right translate-y-1.5 ml-2.5 text-[11px] select-none text-[#667781] dark:text-[#8696a0]"
            >
              <span>{formatTime(message.timestamp)}</span>

              {#if isSelf}
                {#if msgStatus === 'pending'}
                  <svg class="w-3.5 h-3.5 animate-spin inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                {:else if msgStatus === 'sent'}
                  <svg class="w-3.5 h-3.5 opacity-70 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Terkirim">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                {:else if msgStatus === 'delivered'}
                  <div class="inline-flex -space-x-2 opacity-70" title="Tersampaikan">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                {:else if msgStatus === 'read'}
                  <div class="inline-flex -space-x-2 text-[#53bdeb]" title="Dibaca">
                    <svg class="w-3.5 h-3.5 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <svg class="w-3.5 h-3.5 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                {/if}
              {/if}
            </span>
          </div>
        {:else}
          <!-- Timestamp & Status Checkmarks for media-only messages without caption -->
          <div class="flex items-center justify-end gap-1 text-[11px] select-none text-[#667781] dark:text-[#8696a0] -mt-0.5 pt-0.5">
            <span>{formatTime(message.timestamp)}</span>

            {#if isSelf}
              {#if msgStatus === 'pending'}
                <svg class="w-3.5 h-3.5 animate-spin inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              {:else if msgStatus === 'sent'}
                <svg class="w-3.5 h-3.5 opacity-70 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" title="Terkirim">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              {:else if msgStatus === 'delivered'}
                <div class="inline-flex -space-x-2 opacity-70" title="Tersampaikan">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              {:else if msgStatus === 'read'}
                <div class="inline-flex -space-x-2 text-[#53bdeb]" title="Dibaca">
                  <svg class="w-3.5 h-3.5 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <svg class="w-3.5 h-3.5 stroke-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              {/if}
            {/if}
          </div>
        {/if}

        <!-- WhatsApp Downward Chevron (∨) Menu Button on Hover -->
        <button
          id="btn-menu-{message.id}"
          onclick={() => (showMenu = !showMenu)}
          class="absolute top-1 right-1 p-0.5 rounded text-[#8696a0] hover:text-[#111b21] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 opacity-0 group-hover/bubble:opacity-100 transition-opacity"
          title="Menu Pesan"
          aria-label="Menu Pesan"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>

      <!-- Emoji reactions display under message bubble -->
      <ReactionsView messageId={message.id} reactions={message.reactions || []} />

      <!-- WhatsApp Web Context Menu & Quick Reaction Bar Popup -->
      {#if showMenu}
        <div
          id="menu-{message.id}"
          class="absolute {isSelf ? 'right-0' : 'left-0'} top-full mt-1.5 z-40 w-56 bg-white dark:bg-[#233138] rounded-xl shadow-2xl border border-black/10 dark:border-white/10 py-1.5 animate-fadeIn select-none text-[#111b21] dark:text-[#d1d7db]"
        >
          <!-- Quick Reaction Emoji Pill on Top (WhatsApp Style) -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50/70 dark:bg-[#182229]/60 rounded-t-xl">
            <div class="flex items-center gap-1.5">
              {#each QUICK_EMOJIS as emoji}
                <button
                  onclick={() => handleReact(emoji)}
                  class="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-base"
                >
                  {emoji}
                </button>
              {/each}
            </div>
            <button
              onclick={() => (showCustomEmoji = !showCustomEmoji)}
              class="w-6 h-6 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-[#8696a0] hover:text-white"
              title="Emoji lainnya"
            >
              +
            </button>
          </div>

          <!-- Extended Emoji Shelf (if clicked +) -->
          {#if showCustomEmoji}
            <div class="flex flex-wrap gap-1 px-3 py-2 border-b border-black/5 dark:border-white/5 bg-gray-50 dark:bg-[#182229]">
              {#each EXTRA_EMOJIS as emoji}
                <button
                  onclick={() => handleReact(emoji)}
                  class="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-base"
                >
                  {emoji}
                </button>
              {/each}
            </div>
          {/if}

          <!-- Context Menu Options (WhatsApp Web Style) -->
          <div class="py-1 text-[13.5px]">
            <!-- 1. Reply -->
            <button
              onclick={startReply}
              class="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#182229] transition text-left"
            >
              <svg class="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
              </svg>
              <span>Balas</span>
            </button>

            <!-- 2. Reply Privately (if from other user) -->
            {#if !isSelf && message.sender?.id}
              <button
                onclick={handleReplyPrivately}
                class="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#182229] transition text-left"
              >
                <svg class="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
                <span>Balas secara pribadi</span>
              </button>
            {/if}

            <!-- 3. Copy Text -->
            {#if message.text}
              <button
                onclick={copyMessageText}
                class="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#182229] transition text-left"
              >
                <svg class="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                </svg>
                <span>Salin</span>
              </button>
            {/if}

            <!-- 4. Pin / Unpin -->
            <button
              onclick={togglePin}
              class="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#f5f6f6] dark:hover:bg-[#182229] transition text-left"
            >
              <svg class="w-4 h-4 text-[#8696a0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v2a2 2 0 01-.586 1.414L15 12v5l-3 3-3-3v-5L5.586 8.414A2 2 0 015 7V5z"></path>
              </svg>
              <span>{message.isPinned ? 'Lepas Sematan' : 'Sematkan'}</span>
            </button>

            <!-- 5. Delete (if self or admin) -->
            {#if isSelf || chatStore.authUser?.role === 'admin'}
              <div class="border-t border-black/5 dark:border-white/5 my-1"></div>
              <button
                onclick={handleDelete}
                class="w-full flex items-center gap-3 px-4 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition text-left"
              >
                <svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Hapus</span>
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

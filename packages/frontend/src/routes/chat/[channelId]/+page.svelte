<script lang="ts">
  import { page } from '$app/stores';
  import { chatStore, getApiBase, type ChatMessage as MsgType } from '$lib/stores/chat.svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatSkeleton from '$lib/components/ChatSkeleton.svelte';
  import { browser } from '$app/environment';
  import { untrack, tick, onMount, onDestroy } from 'svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { saveMessagesToLocal, loadMessagesFromLocal, setLastSyncTimestamp } from '$lib/stores/localdb';

  let channelId = $derived($page.params.channelId);
  let channelInfo = $derived(chatStore.channels.find(c => c.id === channelId || c.name === channelId));
  
  // Check if current view is a Direct Message (1-on-1)
  let isDirectMessage = $derived(
    channelId.startsWith('@') || channelId.startsWith('dm:') || channelInfo?.type === 'dm' || (channelInfo?.name || '').startsWith('dm:')
  );

  let dmTargetUsername = $derived(
    channelId.startsWith('@') ? channelId.slice(1) : ''
  );

  // Find the other user for Direct Message header display
  let dmTargetUser = $derived.by(() => {
    if (!isDirectMessage) return null;
    if (channelInfo?.targetUser) return channelInfo.targetUser;
    if (dmTargetUsername) {
      const found = chatStore.usersList.find(u => u.username === dmTargetUsername);
      if (found) return found;
    }
    const nameOrId = channelInfo?.name || channelId || '';
    if (nameOrId.startsWith('dm:')) {
      const parts = nameOrId.replace(/^dm:/, '').split('_');
      const otherId = parts.find(p => p !== (chatStore.authUser?.id || 'guest'));
      if (otherId) {
        return chatStore.usersList.find(u => u.id === otherId) || null;
      }
    }
    return null;
  });

  let channelDisplayName = $derived.by(() => {
    if (isDirectMessage && dmTargetUser) {
      return dmTargetUser.displayName || dmTargetUser.username;
    }
    if (dmTargetUsername) return dmTargetUsername;
    return channelInfo?.name || channelId;
  });

  let inputText = $state('');
  let messagesContainer: HTMLElement | undefined = $state();
  let isSending = $state(false);
  let currentLoadedChannel = '';
  let typingTimer: any = null;

  // Infinite Scroll & Loading States
  let isLoadingHistory = $state(true);
  let isLoadingMore = $state(false);
  let hasMore = $state(true);
  let isScrolledUp = $state(false);
  let newMessagesWhileScrolledUp = $state(0);

  // Floating Scroll Date State (WhatsApp Auto-hide)
  let isScrolling = $state(false);
  let scrollHideTimer: any = null;
  let activeFloatingDate = $state('');

  // File Upload State
  let fileInput: HTMLInputElement;
  let cameraInput: HTMLInputElement;
  let isUploadingFile = $state(false);
  let uploadedFiles = $state<{ url: string; name: string; type: string; size: number }[]>([]);

  // Emoji Picker State & Categories
  let showEmojiPicker = $state(false);
  let selectedEmojiCategory = $state<'frequent' | 'faces' | 'medical' | 'gestures'>('frequent');

  const EMOJI_CATEGORIES = {
    frequent: {
      title: 'Sering Digunakan',
      icon: '⭐',
      emojis: ['👍', '❤️', '😂', '🙏', '😊', '🔥', '🎉', '👏', '😍', '🤔', '😭', '😎', '💯', '✨', '⭐', '✅']
    },
    faces: {
      title: 'Wajah & Emosi',
      icon: '😊',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😉', '🥰', '😘', '😋', '🥳', '🤩', '😏', '😌', '😴', '😷', '🤒', '🤕', '🥺', '😡', '🤯']
    },
    medical: {
      title: 'Medis & RSUD',
      icon: '🩺',
      emojis: ['🩺', '🏥', '💊', '💉', '🚑', '🩹', '🩸', '🧬', '👨‍⚕️', '👩‍⚕️', '🧑‍⚕️', '🧪', '🩻', '📋', '🚨', '🧼']
    },
    gestures: {
      title: 'Simbol & Gerakan',
      icon: '👍',
      emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤝', '🙌', '💪', '👏', '🙏', '❤️', '🧡', '💛', '💚', '💙', '💜']
    }
  };

  function insertEmoji(emoji: string) {
    inputText += emoji;
  }

  // Pinned Messages derived list
  let pinnedMessages = $derived(
    chatStore.messages.filter(m => m.isPinned)
  );

  let viewportHeight = $state<number | null>(null);

  onMount(() => {
    chatStore.loadUsers();
    chatStore.loadChannels();

    if (browser && window.visualViewport) {
      const updateViewport = () => {
        if (window.visualViewport) {
          viewportHeight = window.visualViewport.height;
          window.scrollTo(0, 0);
        }
      };
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
      updateViewport();

      return () => {
        window.visualViewport?.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('scroll', updateViewport);
      };
    }
  });

  $effect(() => {
    const id = channelId;
    if (browser && id && id !== currentLoadedChannel) {
      currentLoadedChannel = id;
      untrack(() => {
        hasMore = true;
        isScrolledUp = false;
        newMessagesWhileScrolledUp = 0;
        chatStore.fetchChannelInfo(id);
        loadHistory(id);
        chatStore.connect(id);
        uploadedFiles = [];
        chatStore.replyingToMessage = null;
      });
    }

    return () => {
      untrack(() => {
        chatStore.disconnect();
      });
    };
  });

  async function loadHistory(id: string) {
    isLoadingHistory = true;
    try {
      // 1. LOCAL-FIRST: Instantly show cached messages from IndexedDB (0ms)
      if (browser) {
        const cached = await loadMessagesFromLocal(id, 30);
        if (cached.length > 0) {
          chatStore.setMessages(id, cached);
          isLoadingHistory = false; // Remove skeleton immediately
          await tick();
          scrollToBottom(true);
        }
      }

      // 2. BACKGROUND SYNC: Fetch fresh messages from backend (Redis-cached)
      const base = getApiBase();
      const headers: Record<string, string> = {};
      if (chatStore.authToken) {
        headers['Authorization'] = `Bearer ${chatStore.authToken}`;
      }
      const username = chatStore.currentUsername;
      const res = await fetch(`${base}/api/chat/history/${encodeURIComponent(id)}?username=${encodeURIComponent(username)}&limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data?.messages || []);
        hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : (rawList.length >= 30);

        const adapted = rawList.map((m: any) => ({
          id: m.id,
          channelId: m.channelId || id,
          text: m.content,
          status: m.status || 'sent',
          replyToId: m.replyToId,
          attachments: m.attachments,
          reactions: m.reactions || [],
          isPinned: m.isPinned || false,
          sender: m.sender || { id: m.senderId || 'anon', username: m.senderName || 'Staff RSUD' },
          timestamp: m.createdAt,
          type: m.type
        }));

        chatStore.setMessages(id, adapted);
        await tick();
        scrollToBottom(true);

        // 3. Persist to IndexedDB for next visit
        if (browser && adapted.length > 0) {
          saveMessagesToLocal(adapted);
          const lastMsg = adapted[adapted.length - 1];
          if (lastMsg?.timestamp) {
            setLastSyncTimestamp(id, lastMsg.timestamp);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      isLoadingHistory = false;
    }
  }

  async function loadOlderMessages() {
    if (isLoadingMore || !hasMore || !channelId || chatStore.messages.length === 0 || !messagesContainer) return;

    isLoadingMore = true;
    const oldestMsg = chatStore.messages[0];
    const oldScrollHeight = messagesContainer.scrollHeight;

    try {
      const base = getApiBase();
      const headers: Record<string, string> = {};
      if (chatStore.authToken) {
        headers['Authorization'] = `Bearer ${chatStore.authToken}`;
      }
      const username = chatStore.currentUsername;
      const res = await fetch(`${base}/api/chat/history/${encodeURIComponent(channelId)}?before=${oldestMsg.id}&username=${encodeURIComponent(username)}&limit=30`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : (data?.messages || []);
        hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : (rawList.length >= 30);

        if (rawList.length > 0) {
          const adapted = rawList.map((m: any) => ({
            id: m.id,
            channelId: m.channelId,
            text: m.content,
            status: m.status || 'sent',
            replyToId: m.replyToId,
            attachments: m.attachments,
            reactions: m.reactions || [],
            isPinned: m.isPinned || false,
            sender: m.sender || { id: m.senderId || 'anon', username: m.senderName || 'Staff RSUD' },
            timestamp: m.createdAt,
            type: m.type
          }));

          chatStore.prependMessages(channelId, adapted);
          await tick();

          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight - oldScrollHeight;
          }
        }
      }
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      isLoadingMore = false;
    }
  }

  function handleScroll() {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;

    // Trigger WhatsApp floating date pill on scroll & auto-hide after 1.5s
    isScrolling = true;
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    scrollHideTimer = setTimeout(() => {
      isScrolling = false;
    }, 1500);

    // Track active date based on visible group
    const groupEls = messagesContainer.querySelectorAll('[data-date-group]');
    for (let i = groupEls.length - 1; i >= 0; i--) {
      const el = groupEls[i] as HTMLElement;
      const rect = el.getBoundingClientRect();
      const containerRect = messagesContainer.getBoundingClientRect();
      if (rect.top <= containerRect.top + 90) {
        activeFloatingDate = el.getAttribute('data-date-group') || '';
        break;
      }
    }

    if (scrollTop < 80 && hasMore && !isLoadingMore && !isLoadingHistory) {
      loadOlderMessages();
    }

    const distFromBottom = scrollHeight - scrollTop - clientHeight;
    isScrolledUp = distFromBottom > 220;

    if (!isScrolledUp) {
      newMessagesWhileScrolledUp = 0;
    }
  }

  onDestroy(() => {
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    if (typingTimer) clearTimeout(typingTimer);
  });

  let previousMessageCount = 0;
  $effect(() => {
    const count = chatStore.messages.length;
    if (count > previousMessageCount) {
      if (isScrolledUp && !isLoadingHistory && !isLoadingMore) {
        newMessagesWhileScrolledUp++;
      } else if (!isScrolledUp && !isLoadingHistory) {
        scrollToBottom();
      }
    }
    previousMessageCount = count;
  });

  function scrollToBottom(force = false) {
    setTimeout(() => {
      if (messagesContainer) {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: force ? 'auto' : 'smooth'
        });
        isScrolledUp = false;
        newMessagesWhileScrolledUp = 0;
      }
    }, 30);
  }

  function formatDateHeader(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return 'HARI INI';
      }
      if (date.toDateString() === yesterday.toDateString()) {
        return 'KEMARIN';
      }

      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  // Group messages chronologically by date for floating date headers
  let messageGroupsByDate = $derived.by(() => {
    const sorted = [...chatStore.messages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    const groupsMap: Record<string, MsgType[]> = {};
    const order: string[] = [];

    for (const msg of sorted) {
      const label = formatDateHeader(msg.timestamp);
      if (!groupsMap[label]) {
        groupsMap[label] = [];
        order.push(label);
      }
      groupsMap[label].push(msg);
    }

    return order.map((dateLabel, idx) => ({
      key: `${dateLabel}_${idx}`,
      dateLabel,
      messages: groupsMap[dateLabel]
    }));
  });

  function jumpToMessage(id: string) {
    const el = document.getElementById(`msg-${id}`);
    if (el && messagesContainer) {
      const elOffsetTop = el.offsetTop;
      messagesContainer.scrollTo({
        top: Math.max(0, elOffsetTop - 100),
        behavior: 'smooth'
      });
      el.classList.add('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'ring-offset-transparent');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'ring-offset-transparent');
      }, 2500);
    }
  }

  function handleInputChange() {
    if (!channelId) return;
    chatStore.sendTyping(channelId, true);
    
    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      chatStore.sendTyping(channelId, false);
    }, 2000);
  }

  async function handleFileUpload(e: Event) {
    const filesList = fileInput.files;
    if (!filesList || filesList.length === 0) return;

    isUploadingFile = true;
    const base = getApiBase();
    
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${base}/api/chat/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const uploaded = await res.json();
          uploadedFiles = [...uploadedFiles, uploaded];
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    }
    isUploadingFile = false;
    fileInput.value = '';
  }

  function removeUploadedFile(index: number) {
    uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
  }

  async function sendMessage() {
    if ((!inputText.trim() && uploadedFiles.length === 0) || !channelId || isSending) return;

    if (typingTimer) clearTimeout(typingTimer);
    chatStore.sendTyping(channelId, false);

    const text = inputText.trim();
    const filesToSend = [...uploadedFiles];
    const replyToId = chatStore.replyingToMessage?.id || undefined;

    inputText = '';
    uploadedFiles = [];
    chatStore.replyingToMessage = null;
    scrollToBottom();

    isSending = true;
    try {
      await chatStore.sendChatMessage(channelId, text, filesToSend, replyToId);
      scrollToBottom();
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      isSending = false;
    }
  }

  let typingUsers = $derived(chatStore.currentTypingUsers);
  let canSend = $derived((inputText.trim().length > 0 || uploadedFiles.length > 0) && !isSending);
</script>

<svelte:head>
  <title>{channelDisplayName} — BIMA Chat</title>
</svelte:head>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement;
  if (!target.closest('#emoji-picker-panel') && !target.closest('#btn-toggle-emoji')) {
    showEmojiPicker = false;
  }
}} />

<div class="flex flex-col h-full max-h-full min-h-0 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] relative" style={viewportHeight ? `height: ${viewportHeight}px; max-height: ${viewportHeight}px;` : "height: 100%;"}>
  <!-- WhatsApp Web Style Top Header -->
  <header class="px-4 py-2.5 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-[#d1d7db] dark:border-[#222d34] flex items-center justify-between z-20 select-none shadow-2xs shrink-0 sticky top-0">
    <div class="flex items-center space-x-3">
      <!-- Mobile Hamburger Button -->
      <button
        onclick={() => uiStore.toggleSidebar()}
        class="md:hidden p-1 text-[#54656f] dark:text-[#aebac1] hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition"
        aria-label="Open sidebar"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
      </button>

      <!-- Avatar or Channel Icon -->
      {#if isDirectMessage}
        <div class="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 select-none">
          {(channelDisplayName || 'U').slice(0, 2).toUpperCase()}
        </div>
      {:else}
        <div class="w-10 h-10 rounded-full bg-[#00a884] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0 select-none">
          #
        </div>
      {/if}

      <div class="min-w-0">
        <h2 class="text-[15px] font-semibold text-[#111b21] dark:text-[#e9edef] flex items-center gap-1.5 leading-tight truncate">
          <span>{channelDisplayName}</span>
          {#if isDirectMessage && dmTargetUser}
            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#00a884]/20 text-[#00a884] dark:text-[#25d366]">
              {dmTargetUser.role.toUpperCase()}
            </span>
          {/if}
        </h2>
        <div class="text-[12px] text-[#667781] dark:text-[#8696a0] truncate">
          {#if isDirectMessage}
            <span class="text-[#00a884] dark:text-[#25d366] font-medium">Online</span>
          {:else}
            <span>{chatStore.onlineCount} online • BIMA Chat RSUD</span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Live SSE Status Indicator -->
    <div class="flex items-center gap-2">
      <div class="flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
        {chatStore.isConnected 
          ? 'bg-emerald-500/10 text-[#00a884] dark:text-[#25d366] border-[#00a884]/30' 
          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'}"
      >
        <span class="flex h-2 w-2 relative mr-1.5">
          {#if chatStore.isConnected}
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-[#00a884]"></span>
          {:else}
            <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          {/if}
        </span>
        <span class="text-[11px] font-semibold">{chatStore.isConnected ? 'Terhubung' : 'Menghubungkan...'}</span>
      </div>
    </div>
  </header>

  <!-- Pinned Message Interactive Banner -->
  {#if pinnedMessages.length > 0}
    {@const latestPinned = pinnedMessages[pinnedMessages.length - 1]}
    <div class="px-4 py-2 bg-[#f0f2f5] dark:bg-[#182229] border-b border-[#d1d7db] dark:border-[#222d34] text-xs flex items-center justify-between text-[#111b21] dark:text-[#e9edef] shrink-0 select-none shadow-2xs">
      <button
        type="button"
        onclick={() => jumpToMessage(latestPinned.id)}
        class="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition cursor-pointer"
        title="Klik untuk loncat ke pesan yang disematkan"
      >
        <span class="text-amber-500 font-bold text-sm shrink-0">📌</span>
        <div class="min-w-0 truncate">
          <span class="font-bold text-[#00a884] dark:text-[#25d366] mr-1">
            {latestPinned.sender?.username || 'Pesan Disematkan'}:
          </span>
          <span class="text-[#54656f] dark:text-[#8696a0] truncate">
            "{latestPinned.text}"
          </span>
        </div>
      </button>

      <div class="flex items-center gap-2 shrink-0 ml-2">
        {#if pinnedMessages.length > 1}
          <span class="text-[10px] bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold text-[#54656f] dark:text-[#8696a0]">
            {pinnedMessages.length} Pinned
          </span>
        {/if}
        <button
          type="button"
          onclick={() => chatStore.togglePinMessage(latestPinned.id, false)}
          class="p-1 text-[#8696a0] hover:text-rose-500 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition"
          title="Lepas sematan (Unpin)"
          aria-label="Lepas sematan"
        >
          ✕
        </button>
      </div>
    </div>
  {/if}

  <!-- Messages Area with WhatsApp Doodle Wallpaper (Clean full width) -->
  <main
    bind:this={messagesContainer}
    onscroll={handleScroll}
    class="flex-1 overflow-y-auto px-3 md:px-5 py-3 relative min-h-0 wa-chat-wallpaper"
  >
    {#if isLoadingHistory}
      <ChatSkeleton />
    {:else}
      {#if isLoadingMore}
        <div class="py-2 flex items-center justify-center gap-2 text-xs text-[#667781] dark:text-[#8696a0]">
          <div class="w-3.5 h-3.5 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin"></div>
          <span>Memuat riwayat pesan...</span>
        </div>
      {:else if !hasMore && chatStore.messages.length > 0}
        <div class="py-3 text-center">
          <span class="px-3 py-1 bg-white/70 dark:bg-[#182229]/80 backdrop-blur-xs rounded-md text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] shadow-2xs">
            Awal percakapan {isDirectMessage ? 'dengan ' + channelDisplayName : '#' + channelDisplayName}
          </span>
        </div>
      {/if}

      {#if chatStore.messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-center p-8 space-y-3">
          <div class="w-16 h-16 rounded-full bg-white/80 dark:bg-[#202c33] text-[#00a884] dark:text-[#25d366] flex items-center justify-center text-2xl font-bold shadow-xs">
            {isDirectMessage ? '💬' : '#'}
          </div>
          <div>
            <h3 class="font-bold text-[#111b21] dark:text-[#e9edef] text-base">
              {isDirectMessage ? 'Percakapan Pribadi dengan ' + channelDisplayName : 'Selamat datang di #' + channelDisplayName + '!'}
            </h3>
            <p class="text-xs text-[#667781] dark:text-[#8696a0] max-w-sm mt-1">
              {isDirectMessage ? 'Kirim pesan privat langsung kepada rekan kerja Anda.' : 'Belum ada pesan. Mulai obrolan dengan mengetik pesan di bawah.'}
            </p>
          </div>
        </div>
      {:else}
        <!-- WhatsApp Floating Scroll Date Pill (8px below header, appears on scroll, auto-hides after 1.5s) -->
        <div
          class="sticky top-2 inset-x-0 z-30 flex justify-center pointer-events-none transition-all duration-300
            {isScrolling ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}"
        >
          <span class="px-3 py-1 bg-white/95 dark:bg-[#182229]/95 backdrop-blur-md text-[11.5px] font-semibold text-[#54656f] dark:text-[#8696a0] rounded-lg shadow-md border border-black/5 dark:border-white/10 uppercase tracking-wide pointer-events-auto select-none">
            {activeFloatingDate || (messageGroupsByDate[messageGroupsByDate.length - 1]?.dateLabel || '')}
          </span>
        </div>

        {#each messageGroupsByDate as group (group.key)}
          <div data-date-group={group.dateLabel} class="relative w-full mb-3">
            <!-- In-stream Day Separator (Clean WhatsApp style) -->
            <div class="flex justify-center py-1.5 select-none">
              <span class="px-3 py-0.5 bg-white/85 dark:bg-[#182229]/85 backdrop-blur-xs text-[11px] font-medium text-[#54656f] dark:text-[#8696a0] rounded-md shadow-2xs border border-black/5 dark:border-white/5 uppercase tracking-wide">
                {group.dateLabel}
              </span>
            </div>

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
        onclick={() => scrollToBottom()}
        class="w-10 h-10 bg-white dark:bg-[#202c33] text-[#54656f] dark:text-[#aebac1] rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-[#2a3942] transition relative flex items-center justify-center active:scale-95 border border-black/5 dark:border-white/5"
        title="Gulir ke pesan terbaru"
        aria-label="Gulir ke pesan terbaru"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
        </svg>

        {#if newMessagesWhileScrolledUp > 0}
          <span class="absolute -top-1 -right-1 bg-[#00a884] text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
            {newMessagesWhileScrolledUp > 9 ? '9+' : newMessagesWhileScrolledUp}
          </span>
        {/if}
      </button>
    </div>
  {/if}

  <!-- Floating WhatsApp Input Bar (Authentic WhatsApp Mobile & Web Floating Pill) -->
  <footer class="p-2 md:p-3 relative z-20 shrink-0 pb-safe bg-transparent">
    <!-- Reply Quote Preview Floating Box -->
    {#if chatStore.replyingToMessage}
      <div class="max-w-4xl mx-auto mb-2 px-4 py-2 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-md border-l-4 border-[#00a884] flex items-center justify-between text-xs animate-fadeIn border border-black/5 dark:border-white/5">
        <div class="min-w-0 pr-2">
          <p class="font-bold text-[#00a884] text-[11.5px]">
            Membalas @{chatStore.replyingToMessage.sender?.username || 'Staff RSUD'}
          </p>
          <p class="text-[#54656f] dark:text-[#8696a0] truncate text-[12px] mt-0.5">
            "{chatStore.replyingToMessage.text}"
          </p>
        </div>
        <button
          type="button"
          onclick={() => (chatStore.replyingToMessage = null)}
          class="text-[#8696a0] hover:text-[#111b21] dark:hover:text-white font-bold p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition"
          title="Batal membalas"
        >
          ✕
        </button>
      </div>
    {/if}

    <!-- Typing Indicator -->
    {#if typingUsers.length > 0}
      <div class="max-w-4xl mx-auto mb-1.5 px-3 py-1 bg-white/80 dark:bg-[#182229]/80 backdrop-blur-xs rounded-full text-[11px] text-[#00a884] dark:text-[#25d366] flex items-center gap-1.5 animate-fadeIn italic shadow-2xs w-fit">
        <div class="flex space-x-1 items-center">
          <span class="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce"></span>
          <span class="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span class="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </div>
        <span>{typingUsers.join(', ')} sedang mengetik...</span>
      </div>
    {/if}

    <!-- Uploaded Files Preview Shelf -->
    {#if uploadedFiles.length > 0}
      <div class="max-w-4xl mx-auto mb-2 p-2 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-md flex flex-wrap gap-2 animate-fadeIn border border-black/5 dark:border-white/5">
        {#each uploadedFiles as file, index}
          <div class="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-[#2a3942] rounded-xl text-xs">
            <span class="truncate max-w-xs text-[#111b21] dark:text-[#e9edef]">{file.name}</span>
            <button
              type="button"
              onclick={() => removeUploadedFile(index)}
              class="text-rose-500 font-bold ml-1 hover:opacity-80 transition"
              title="Hapus"
            >
              ✕
            </button>
          </div>
        {/each}
      </div>
    {/if}

    <!-- Floating Emoji Reaction Picker Panel (WhatsApp Reactions & Emojis) -->
    {#if showEmojiPicker}
      <div
        id="emoji-picker-panel"
        class="max-w-md mx-auto mb-2 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-3 animate-fadeIn select-none z-30"
      >
        <!-- Category Tabs -->
        <div class="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2 mb-2">
          <div class="flex items-center gap-1 overflow-x-auto py-0.5">
            {#each (Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>) as cat}
              <button
                type="button"
                onclick={() => (selectedEmojiCategory = cat)}
                class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition {selectedEmojiCategory === cat ? 'bg-[#00a884]/20 text-[#00a884] dark:text-[#25d366]' : 'text-[#8696a0] hover:bg-black/5 dark:hover:bg-white/5'}"
              >
                <span>{EMOJI_CATEGORIES[cat].icon}</span>
                <span class="text-[11px] whitespace-nowrap">{EMOJI_CATEGORIES[cat].title}</span>
              </button>
            {/each}
          </div>
          <button
            type="button"
            onclick={() => (showEmojiPicker = false)}
            class="text-[#8696a0] hover:text-[#111b21] dark:hover:text-white p-1 rounded-md text-xs font-bold shrink-0 ml-1"
            title="Tutup"
          >
            ✕
          </button>
        </div>

        <!-- Emoji Grid -->
        <div class="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto py-1">
          {#each EMOJI_CATEGORIES[selectedEmojiCategory].emojis as emoji}
            <button
              type="button"
              onclick={() => insertEmoji(emoji)}
              class="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 active:scale-95 transition-transform rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              title={emoji}
            >
              {emoji}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Floating Pill Form + Circular Action Button -->
    <form
      onsubmit={(e) => { e.preventDefault(); sendMessage(); }}
      class="flex items-center gap-2 max-w-4xl mx-auto w-full"
    >
      <!-- Left Pill Capsule Container (Transparent surroundings like authentic WhatsApp) -->
      <div class="flex-1 bg-white dark:bg-[#1f2c34] rounded-full h-12 flex items-center px-3 shadow-md border border-black/5 dark:border-white/5 transition-all min-w-0">
        <!-- Emoji Smiley Button (Far Left like authentic WhatsApp) -->
        <button
          id="btn-toggle-emoji"
          type="button"
          onclick={() => (showEmojiPicker = !showEmojiPicker)}
          class="p-1 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center mr-1"
          title="Pilih emoji & reaksi"
          aria-label="Pilih emoji & reaksi"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </button>

        <!-- Hidden Standard File input -->
        <input
          type="file"
          bind:this={fileInput}
          onchange={handleFileUpload}
          multiple
          class="hidden"
        />

        <!-- Hidden Camera File input -->
        <input
          type="file"
          bind:this={cameraInput}
          onchange={handleFileUpload}
          accept="image/*"
          capture="environment"
          class="hidden"
        />

        <!-- Text Input Field (Ketik pesan) -->
        <input
          type="text"
          bind:value={inputText}
          oninput={handleInputChange}
          onfocus={() => {
            setTimeout(() => {
              window.scrollTo(0, 0);
              scrollToBottom(true);
            }, 120);
          }}
          placeholder="Ketik pesan"
          class="flex-1 bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#8696a0] text-[15px] px-1 py-2 border-0 focus:ring-0 outline-none min-w-0"
          autocomplete="off"
        />

        <!-- Paperclip / Lampiran Button (Right inside capsule like WhatsApp) -->
        <button
          type="button"
          onclick={() => fileInput.click()}
          class="p-1 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center mr-0.5"
          title="Lampirkan berkas"
          aria-label="Lampirkan berkas"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
          </svg>
        </button>

        <!-- Camera icon button (Far Right inside capsule like WhatsApp) -->
        <button
          type="button"
          onclick={() => cameraInput ? cameraInput.click() : fileInput.click()}
          class="p-1 text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center"
          title="Kamera / Foto"
          aria-label="Kamera / Foto"
        >
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
        </button>
      </div>

      <!-- Right Circular Green Floating Action Button (48px Circle matching h-12 pill) -->
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Kirim Pesan"
        class="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all shrink-0
          {canSend
            ? 'bg-[#00a884] hover:bg-[#008f6f] active:scale-95 text-white shadow-md cursor-pointer'
            : 'bg-[#00a884]/40 dark:bg-[#00a884]/30 text-white/60 dark:text-white/40 cursor-not-allowed shadow-none'}"
      >
        {#if isSending}
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {:else}
          <!-- Send Paperplane Icon (Solid fill, nicely sized) -->
          <svg class="w-5 h-5 fill-current transform translate-x-0.5" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        {/if}
      </button>
    </form>
  </footer>
</div>

<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { untrack, tick, onMount, onDestroy } from 'svelte';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { saveMessagesToLocal, loadMessagesFromLocal, setLastSyncTimestamp } from '$lib/stores/localdb';
  import { getApiBase, formatDateHeader } from '$lib/utils';
  import type { ChatMessage, Attachment, MessageGroup, User, MessageSender } from '$lib/types';

  import ChatHeader from '$lib/components/chat/ChatHeader.svelte';
  import InChatSearchBar from '$lib/components/chat/InChatSearchBar.svelte';
  import MessageList from '$lib/components/chat/MessageList.svelte';
  import ChatInput from '$lib/components/chat/ChatInput.svelte';

  interface RawMessageItem {
    id: string;
    channelId?: string;
    content: string;
    status?: ChatMessage['status'];
    replyToId?: string | null;
    attachments?: Attachment[] | null;
    reactions?: { emoji: string; username: string }[];
    isPinned?: boolean;
    sender?: MessageSender;
    senderId?: string;
    senderName?: string;
    createdAt: string;
    type?: string;
  }

  let channelId = $derived($page.params.channelId);
  let channelInfo = $derived(chatStore.channels.find(c => c.id === channelId || c.name === channelId));

  // Check if current view is a Direct Message (1-on-1)
  let isDirectMessage = $derived(
    channelId.startsWith('@') || channelId.startsWith('dm:') || channelInfo?.type === 'dm' || (channelInfo?.name || '').startsWith('dm:')
  );

  let dmTargetUsername = $derived(
    channelId.startsWith('@') ? channelId.slice(1) : ''
  );

  // Find the other user for Direct Message header display (strictly never ourselves)
  let dmTargetUser = $derived.by((): User | null => {
    if (!isDirectMessage) return null;
    const myId = chatStore.authUser?.id;
    const myUsername = chatStore.currentUsername;

    // 1. If channelInfo has targetUser, make sure it is NOT ourselves
    if (channelInfo?.targetUser) {
      const t = channelInfo.targetUser;
      if (t.id !== myId && t.username !== myUsername) {
        return t;
      }
    }

    // 2. If route is @username, resolve from usersList
    if (dmTargetUsername && dmTargetUsername !== myUsername) {
      const found = chatStore.usersList.find(u => u.username === dmTargetUsername);
      if (found && found.id !== myId && found.username !== myUsername) return found;
    }

    // 3. Fallback: Parse dm:UUID_UUID name and find the other user
    const nameOrId = channelInfo?.name || channelId || '';
    if (nameOrId.startsWith('dm:')) {
      const parts = nameOrId.replace(/^dm:/, '').split('_');
      const otherId = parts.find(p => p !== myId && p !== myUsername);
      if (otherId) {
        const found = chatStore.usersList.find(u => u.id === otherId || u.username === otherId);
        if (found && found.id !== myId && found.username !== myUsername) return found;
      }
    }
    return null;
  });

  let channelDisplayName = $derived.by((): string => {
    if (isDirectMessage && dmTargetUser) {
      return dmTargetUser.displayName || dmTargetUser.username;
    }
    if (dmTargetUsername) return dmTargetUsername;
    return channelInfo?.name || channelId;
  });

  let messagesContainer = $state<HTMLElement | undefined>();
  let isSending = $state(false);
  let currentLoadedChannel = '';
  let typingTimer: ReturnType<typeof setTimeout> | null = null;

  // Infinite Scroll & Loading States
  let isLoadingHistory = $state(true);
  let isLoadingMore = $state(false);
  let hasMore = $state(true);
  let isScrolledUp = $state(false);
  let newMessagesWhileScrolledUp = $state(0);

  // Floating Date Header State
  let isScrolling = $state(false);
  let scrollHideTimer: ReturnType<typeof setTimeout> | null = null;
  let activeFloatingDate = $state('');

  // In-chat search state
  let isSearchOpen = $state(false);
  let inChatSearchQuery = $state('');

  // Pinned Messages from dedicated store (instant 0ms, independent of 30-message history lazy load)
  let pinnedMessages = $derived(chatStore.pinnedMessages);

  onMount(() => {
    chatStore.loadUsers();
    chatStore.loadChannels();
  });

  onDestroy(() => {
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    if (typingTimer) clearTimeout(typingTimer);
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
        chatStore.loadPinnedMessages(id);
        loadHistory(id);
        chatStore.connect(id);
        chatStore.replyingToMessage = null;
      });
    }

    return () => {
      untrack(() => {
        // Fall back to general presence so user stays online in global list
        chatStore.connect('general');
      });
    };
  });

  async function loadHistory(id: string): Promise<void> {
    isLoadingHistory = true;
    try {
      if (browser) {
        const cached = await loadMessagesFromLocal(id, 30);
        if (cached.length > 0) {
          chatStore.setMessages(id, cached);
          isLoadingHistory = false;
          await tick();
          scrollToBottom(true);
        }
      }

      const base = getApiBase();
      const headers: Record<string, string> = {};
      if (chatStore.authToken) {
        headers['Authorization'] = `Bearer ${chatStore.authToken}`;
      }
      const username = chatStore.currentUsername;
      const res = await fetch(`${base}/api/chat/history/${encodeURIComponent(id)}?username=${encodeURIComponent(username)}&limit=30`, { headers });
      if (res.ok) {
        const data = (await res.json()) as { messages?: RawMessageItem[]; hasMore?: boolean } | RawMessageItem[];
        const rawList: RawMessageItem[] = Array.isArray(data) ? data : (data?.messages || []);
        hasMore = typeof (data as { hasMore?: boolean }).hasMore === 'boolean'
          ? (data as { hasMore?: boolean }).hasMore!
          : (rawList.length >= 30);

        const adapted: ChatMessage[] = rawList.map((m) => ({
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
        isLoadingHistory = false;
        await tick();
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

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

  async function loadOlderMessages(): Promise<void> {
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
        const data = (await res.json()) as { messages?: RawMessageItem[]; hasMore?: boolean } | RawMessageItem[];
        const rawList: RawMessageItem[] = Array.isArray(data) ? data : (data?.messages || []);
        hasMore = typeof (data as { hasMore?: boolean }).hasMore === 'boolean'
          ? (data as { hasMore?: boolean }).hasMore!
          : (rawList.length >= 30);

        if (rawList.length > 0) {
          const adapted: ChatMessage[] = rawList.map((m) => ({
            id: m.id,
            channelId: m.channelId || channelId,
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

          if (browser) {
            saveMessagesToLocal(adapted);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load older messages', e);
    } finally {
      isLoadingMore = false;
    }
  }

  function handleScroll(): void {
    if (!messagesContainer) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainer;

    isScrolling = true;
    if (scrollHideTimer) clearTimeout(scrollHideTimer);
    scrollHideTimer = setTimeout(() => {
      isScrolling = false;
    }, 1500);

    const dateHeaders = messagesContainer.querySelectorAll('[data-date-group]');
    for (let i = dateHeaders.length - 1; i >= 0; i--) {
      const el = dateHeaders[i] as HTMLElement;
      if (el.offsetTop <= scrollTop + 80) {
        activeFloatingDate = el.getAttribute('data-date-group') || '';
        break;
      }
    }

    if (scrollTop < 80 && !isLoadingMore && hasMore && !isLoadingHistory) {
      loadOlderMessages();
    }

    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    isScrolledUp = distanceFromBottom > 150;

    if (!isScrolledUp) {
      newMessagesWhileScrolledUp = 0;
    }
  }

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

  function scrollToBottom(force = false): void {
    if (messagesContainer) {
      if (force) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else {
        messagesContainer.scrollTo({
          top: messagesContainer.scrollHeight,
          behavior: 'smooth'
        });
      }
      isScrolledUp = false;
      newMessagesWhileScrolledUp = 0;
    }
  }

  // Group messages chronologically by date for floating date headers
  let messageGroupsByDate = $derived.by((): MessageGroup[] => {
    let sourceMessages = chatStore.messages;
    if (inChatSearchQuery.trim()) {
      const q = inChatSearchQuery.trim().toLowerCase();
      sourceMessages = sourceMessages.filter(m => (m.text || '').toLowerCase().includes(q) || (m.sender?.username || '').toLowerCase().includes(q));
    }

    const sorted = [...sourceMessages].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    const groupsMap: Record<string, ChatMessage[]> = {};
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

  let isJumpingToMessage = $state(false);

  async function jumpToMessage(id: string): Promise<void> {
    if (!id || isJumpingToMessage) return;
    isJumpingToMessage = true;

    try {
      let el = document.getElementById(`msg-${id}`);

      // If message is not rendered in current DOM (e.g. beyond 30 loaded messages)
      if (!el && channelId) {
        const result = await chatStore.loadMessageContext(channelId, id);
        if (result && result.messages.length > 0) {
          await tick();
          el = document.getElementById(`msg-${id}`);
        }
      }

      if (el && messagesContainer) {
        const elOffsetTop = el.offsetTop;
        messagesContainer.scrollTo({
          top: Math.max(0, elOffsetTop - 100),
          behavior: 'smooth'
        });
        el.classList.add('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'ring-offset-transparent');
        setTimeout(() => {
          el?.classList.remove('ring-2', 'ring-[#00a884]', 'ring-offset-4', 'ring-offset-transparent');
        }, 2500);
      }
    } finally {
      isJumpingToMessage = false;
    }
  }

  function handleTypingChange(): void {
    if (!channelId) return;
    chatStore.sendTyping(channelId, true);

    if (typingTimer) clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      chatStore.sendTyping(channelId, false);
    }, 2000);
  }

  async function handleSendMessage(text: string, files: Attachment[]): Promise<void> {
    if (!channelId || isSending) return;

    if (typingTimer) clearTimeout(typingTimer);
    chatStore.sendTyping(channelId, false);

    const replyToId = chatStore.replyingToMessage?.id || undefined;
    chatStore.replyingToMessage = null;
    scrollToBottom();

    isSending = true;
    try {
      await chatStore.sendChatMessage(channelId, text, files, replyToId);
      scrollToBottom();
    } catch (e) {
      console.error('Failed to send message', e);
    } finally {
      isSending = false;
    }
  }

  let isTargetOnline = $derived(
    isDirectMessage && dmTargetUser?.username && dmTargetUser.username !== chatStore.currentUsername
      ? chatStore.isUserOnline(dmTargetUser.username)
      : false
  );

  let typingUsers = $derived(
    chatStore.getTypingUsers(channelId).length > 0
      ? chatStore.getTypingUsers(channelId)
      : chatStore.currentTypingUsers
  );

  let isTargetTyping = $derived(
    isDirectMessage
      ? (dmTargetUser?.username
          ? chatStore.getTypingUsers(channelId).includes(dmTargetUser.username) ||
            chatStore.getTypingUsers(chatStore.activeChannelId).includes(dmTargetUser.username) ||
            chatStore.getTypingUsers(dmTargetUser.username).includes(dmTargetUser.username)
          : typingUsers.length > 0)
      : typingUsers.length > 0
  );
</script>

<svelte:head>
  <title>{channelDisplayName} | BIMA Chat RSUD Bangil</title>
  <meta name="description" content="Ruang obrolan {channelDisplayName} - Platform Komunikasi Realtime RSUD Bangil" />
</svelte:head>

<div class="flex flex-col h-full max-h-full min-h-0 overflow-hidden bg-[#efeae2] dark:bg-[#0b141a] relative">
  <!-- WhatsApp Authentic Top Header -->
  <ChatHeader
    {channelId}
    {channelDisplayName}
    {isDirectMessage}
    {dmTargetUser}
    {isTargetOnline}
    {isTargetTyping}
    {typingUsers}
    {isSearchOpen}
    onToggleSearch={() => {
      isSearchOpen = !isSearchOpen;
      if (!isSearchOpen) inChatSearchQuery = '';
    }}
  />

  <!-- In-Chat Search Bar Drawer -->
  {#if isSearchOpen}
    <InChatSearchBar
      searchQuery={inChatSearchQuery}
      onInput={(query) => (inChatSearchQuery = query)}
      onClose={() => {
        isSearchOpen = false;
        inChatSearchQuery = '';
      }}
    />
  {/if}

  <!-- Messages Timeline List -->
  <MessageList
    bind:messagesContainer
    messageGroups={messageGroupsByDate}
    {pinnedMessages}
    {isDirectMessage}
    {channelDisplayName}
    {isLoadingHistory}
    {isLoadingMore}
    {hasMore}
    {isScrolledUp}
    {newMessagesWhileScrolledUp}
    {isScrolling}
    {activeFloatingDate}
    onScroll={handleScroll}
    onScrollToBottom={() => scrollToBottom()}
    onJumpToMessage={jumpToMessage}
  />

  <!-- Floating WhatsApp Input Bar -->
  <ChatInput
    {channelId}
    {isSending}
    replyingToMessage={chatStore.replyingToMessage}
    onCancelReply={() => (chatStore.replyingToMessage = null)}
    onSendMessage={handleSendMessage}
    onTypingChange={handleTypingChange}
    onFocusInput={() => {
      setTimeout(() => {
        window.scrollTo(0, 0);
        scrollToBottom(true);
      }, 120);
    }}
  />
</div>

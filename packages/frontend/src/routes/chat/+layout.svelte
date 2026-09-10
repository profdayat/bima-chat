<script lang="ts">
  import ChannelList from '$lib/components/ChannelList.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import UserProfileModal from '$lib/components/UserProfileModal.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { chatStore } from '$lib/stores/chat.svelte';
  import { browser } from '$app/environment';
  import { onMount, untrack } from 'svelte';
  import { page } from '$app/stores';

  let { children } = $props();

  let sidebarWidth = $state(400); // Default wide sidebar like WhatsApp Web
  let isResizing = $state(false);

  // Check if a specific chat room / channel is currently open
  let isChannelSelected = $derived(Boolean($page.params.channelId));

  onMount(() => {
    if (browser) {
      const savedWidth = localStorage.getItem('rsud_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (parsed >= 240 && parsed <= 750) {
          sidebarWidth = parsed;
        }
      }

      // Connect immediately to presence as soon as the user opens the chat app (even at /chat)
      // so user is instantly ONLINE to all colleagues without needing to enter a chat first!
      const targetChannel = $page.params.channelId || 'general';
      chatStore.connect(targetChannel);
    }
  });

  // Ensure presence remains active when navigating between channel list /chat and channels
  $effect(() => {
    const channelParam = $page.params.channelId;
    if (browser && !channelParam) {
      untrack(() => {
        if (!chatStore.isConnected || chatStore.activeChannelId !== 'general') {
          chatStore.connect('general');
        }
      });
    }
  });

  function startResizing(e: MouseEvent) {
    e.preventDefault();
    isResizing = true;

    function onMouseMove(moveEvent: MouseEvent) {
      const maxAllowed = Math.floor(window.innerWidth * 0.6);
      const newWidth = Math.min(Math.max(moveEvent.clientX, 240), Math.max(450, maxAllowed));
      sidebarWidth = newWidth;
    }

    function onMouseUp() {
      isResizing = false;
      if (browser) {
        localStorage.setItem('rsud_sidebar_width', sidebarWidth.toString());
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }
</script>

<div class="flex h-full w-full max-h-full overflow-hidden relative bg-[#efeae2] dark:bg-[#0b141a] {isResizing ? 'cursor-col-resize select-none pointer-events-auto' : ''}">
  <!-- Sidebar / Chat List: Full screen on mobile when at /chat, fixed width on desktop -->
  <div
    class="{isChannelSelected ? 'hidden md:flex' : 'flex'} w-full md:w-auto md:flex-shrink-0 h-full relative"
    style="width: {isChannelSelected || typeof window === 'undefined' ? undefined : undefined}; {typeof window !== 'undefined' && window.innerWidth >= 768 ? `width: ${sidebarWidth}px;` : ''}"
  >
    <div class="w-full h-full overflow-hidden">
      <ChannelList />
    </div>

    <!-- Adjustable Drag Handle Separator (Desktop only) -->
    <div
      aria-hidden="true"
      onmousedown={startResizing}
      class="hidden md:flex absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#008069] active:bg-[#008069] transition-colors z-30 group items-center justify-center select-none"
      title="Tarik untuk memperlebar / memperkecil sidebar"
    >
      <div class="w-0.5 h-full bg-transparent group-hover:bg-[#008069] group-active:bg-[#008069] transition-colors"></div>
    </div>
  </div>

  <!-- Chat Content Area: Hidden on mobile when at /chat (list view), full screen on mobile when at /chat/[channelId], flex-1 on desktop -->
  <div class="{isChannelSelected ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 h-full max-h-full overflow-hidden relative">
    {@render children()}
  </div>
</div>

<!-- Global Modals & Bottom Sheets (Rendered at Root Viewport Level) -->
<AuthModal bind:isOpen={uiStore.isAuthModalOpen} />
<UserProfileModal bind:isOpen={uiStore.isProfileModalOpen} />

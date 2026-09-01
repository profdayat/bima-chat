<script lang="ts">
  import ChannelList from '$lib/components/ChannelList.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import UserProfileModal from '$lib/components/UserProfileModal.svelte';
  import { uiStore } from '$lib/stores/ui.svelte';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  let { children } = $props();

  let sidebarWidth = $state(400); // Default wide sidebar like WhatsApp Web
  let isResizing = $state(false);

  onMount(() => {
    if (browser) {
      const savedWidth = localStorage.getItem('rsud_sidebar_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (parsed >= 240 && parsed <= 750) {
          sidebarWidth = parsed;
        }
      }
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
  <!-- Desktop Resizable Sidebar -->
  <div
    class="hidden md:flex md:flex-shrink-0 h-full relative"
    style="width: {sidebarWidth}px;"
  >
    <div class="w-full h-full overflow-hidden">
      <ChannelList />
    </div>

    <!-- Adjustable Drag Handle Separator -->
    <div
      aria-hidden="true"
      onmousedown={startResizing}
      class="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-[#008069] active:bg-[#008069] transition-colors z-30 group flex items-center justify-center select-none"
      title="Tarik untuk memperlebar / memperkecil sidebar"
    >
      <div class="w-0.5 h-full bg-transparent group-hover:bg-[#008069] group-active:bg-[#008069] transition-colors"></div>
    </div>
  </div>

  <!-- Mobile Drawer Sidebar -->
  {#if uiStore.isSidebarOpen}
    <!-- Backdrop overlay -->
    <button
      type="button"
      onclick={() => uiStore.setSidebar(false)}
      class="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 md:hidden transition-opacity duration-300"
      aria-label="Close sidebar"
    ></button>

    <!-- Sidebar wrapper with slide-in animation -->
    <div class="fixed inset-y-0 left-0 z-40 w-80 md:hidden animate-slideIn">
      <ChannelList />
    </div>
  {/if}

  <!-- Main Chat Content Area (Flexibly Adapts to Sidebar Width) -->
  <div class="flex-1 flex flex-col min-w-0 h-full max-h-full overflow-hidden relative">
    {@render children()}
  </div>
</div>

<!-- Global Modals & Bottom Sheets (Rendered at Root Viewport Level) -->
<AuthModal bind:isOpen={uiStore.isAuthModalOpen} />
<UserProfileModal bind:isOpen={uiStore.isProfileModalOpen} />

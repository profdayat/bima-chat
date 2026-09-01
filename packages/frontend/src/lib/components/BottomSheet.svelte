<script lang="ts">
  import { onMount } from 'svelte';

  let {
    isOpen = $bindable(false),
    title = '',
    subtitle = '',
    maxWidth = 'max-w-2xl',
    fullHeight = false,
    children
  }: {
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    maxWidth?: string;
    fullHeight?: boolean;
    children?: import('svelte').Snippet;
  } = $props();

  let sheetEl: HTMLDivElement | undefined = $state();
  let startY = $state(0);
  let currentY = $state(0);
  let startTime = $state(0);
  let isDragging = $state(false);
  let isClosing = $state(false);

  // Lock body scrolling when sheet is open
  $effect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      currentY = 0;
      isClosing = false;
    } else {
      document.body.style.overflow = '';
      currentY = 0;
    }
    return () => {
      document.body.style.overflow = '';
    };
  });

  function close() {
    isClosing = true;
    setTimeout(() => {
      isOpen = false;
      isClosing = false;
      currentY = 0;
    }, 200);
  }

  function handlePointerDown(e: PointerEvent) {
    // Only drag on left click / touch
    if (e.button !== 0) return;
    startY = e.clientY;
    startTime = Date.now();
    isDragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    if (deltaY > 0) {
      currentY = deltaY;
    } else {
      // Elastic resistance when dragging upwards
      currentY = deltaY * 0.15;
    }
  }

  function handlePointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const deltaY = e.clientY - startY;
    const duration = Math.max(Date.now() - startTime, 1);
    const velocity = deltaY / duration; // px per ms

    // If dragged down more than 100px or swiped fast downwards
    if (deltaY > 100 || velocity > 0.45) {
      close();
    } else {
      // Snap back to open position
      currentY = 0;
    }
  }
</script>

{#if isOpen}
  <!-- Full Screen Wrapper -->
  <div class="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center p-0 md:p-4 overflow-hidden animate-fadeIn">
    <!-- Backdrop Overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      onclick={close}
      style="opacity: {Math.max(0.1, 1 - currentY / 400)};"
    ></div>

    <!-- Sheet / Modal Panel -->
    <div
      bind:this={sheetEl}
      class="relative z-10 w-full md:{maxWidth} bg-white dark:bg-gray-900 rounded-t-[28px] md:rounded-2xl shadow-2xl overflow-hidden flex flex-col {fullHeight ? 'h-[90vh] md:h-auto md:max-h-[85vh]' : 'max-h-[90vh] md:max-h-[85vh]'} border-t md:border border-gray-200/60 dark:border-gray-800 {isDragging ? '' : 'transition-transform duration-250 ease-out'}"
      style="transform: translateY({isClosing ? '100%' : `${currentY}px`});"
    >
      <!-- Drag Handle & Header Area -->
      <div
        class="shrink-0 select-none bg-gradient-to-r from-emerald-700 to-teal-600 text-white cursor-grab active:cursor-grabbing touch-none flex flex-col"
        onpointerdown={handlePointerDown}
        onpointermove={handlePointerMove}
        onpointerup={handlePointerUp}
        onpointercancel={handlePointerUp}
      >
        <!-- Mobile Pill Indicator -->
        <div class="pt-3 pb-1 flex justify-center md:hidden">
          <div class="w-12 h-1.5 bg-white/40 rounded-full hover:bg-white/60 transition"></div>
        </div>

        <!-- Header Content -->
        {#if title}
          <div class="px-5 py-3 md:py-4 flex items-center justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-base md:text-lg font-bold leading-tight truncate text-white">{title}</h3>
              {#if subtitle}
                <p class="text-xs text-teal-100 mt-0.5 truncate">{subtitle}</p>
              {/if}
            </div>
            <button
              type="button"
              onclick={close}
              class="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition shrink-0"
              title="Tutup"
              aria-label="Tutup"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        {/if}
      </div>

      <!-- Scrollable Body Content -->
      <div class="flex-1 overflow-y-auto overscroll-contain bg-white dark:bg-gray-900">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<script lang="ts">
  import { onMount } from 'svelte';

  let {
    isOpen = $bindable(false),
    title = '',
    subtitle = '',
    maxWidth = 'max-w-md',
    children
  }: {
    isOpen: boolean;
    title?: string;
    subtitle?: string;
    maxWidth?: string;
    children?: import('svelte').Snippet;
  } = $props();

  // Lock body scrolling when modal is open
  $effect(() => {
    if (typeof document === 'undefined') return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  });

  function close() {
    isOpen = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
  <!-- Centered Modal Backdrop -->
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
    <!-- Backdrop Overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="fixed inset-0 bg-black/65 backdrop-blur-xs transition-opacity duration-200"
      onclick={close}
    ></div>

    <!-- Centered Dialog Box (True Modal, Compact & Scaled) -->
    <div
      class="relative z-10 w-full {maxWidth} bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl overflow-hidden border border-black/10 dark:border-white/10 my-auto animate-scaleIn text-[#111b21] dark:text-[#e9edef]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Header -->
      {#if title}
        <div class="px-5 py-4 bg-[#00a884] text-white flex items-center justify-between gap-3 shadow-xs">
          <div class="min-w-0 flex-1">
            <h3 id="modal-title" class="text-base font-bold leading-tight truncate text-white">
              {title}
            </h3>
            {#if subtitle}
              <p class="text-xs text-white/80 mt-0.5 truncate">{subtitle}</p>
            {/if}
          </div>
          <button
            type="button"
            onclick={close}
            class="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition shrink-0 cursor-pointer"
            title="Tutup (Esc)"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
      {/if}

      <!-- Modal Body Content -->
      <div class="max-h-[80vh] overflow-y-auto">
        {@render children?.()}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .animate-scaleIn {
    animation: scaleIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
</style>

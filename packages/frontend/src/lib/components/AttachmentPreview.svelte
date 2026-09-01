<script lang="ts">
  let { attachments = [] }: { attachments: { url: string; name: string; type: string; size: number }[] } = $props();

  let lightboxUrl = $state<string | null>(null);
  let lightboxName = $state('');

  function formatSize(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function isImage(type: string) {
    return type.startsWith('image/');
  }

  function resolveUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) return `/api${url}`;
    if (!url.startsWith('/api/uploads/') && !url.startsWith('/')) return `/api/uploads/${url}`;
    return url;
  }

  function openLightbox(url: string, name: string) {
    lightboxUrl = resolveUrl(url);
    lightboxName = name;
  }

  function closeLightbox() {
    lightboxUrl = null;
    lightboxName = '';
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeLightbox();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if attachments && attachments.length > 0}
  <div class="mt-0.5 space-y-1.5">
    {#each attachments as file}
      {@const fileUrl = resolveUrl(file.url)}
      {#if isImage(file.type)}
        <!-- WhatsApp Photo Card: Rounded image with overlay timestamp -->
        <div class="relative group/img cursor-pointer max-w-[280px] md:max-w-[320px]">
          <button
            type="button"
            onclick={() => openLightbox(file.url, file.name)}
            class="block rounded-lg overflow-hidden w-full bg-black/5 dark:bg-black/20"
          >
            <img
              src={fileUrl}
              alt={file.name}
              loading="lazy"
              decoding="async"
              class="max-h-[380px] w-full object-cover rounded-lg transition-opacity group-hover/img:opacity-90"
            />
          </button>
          <!-- Floating download button on hover (WhatsApp style) -->
          <a
            href={fileUrl}
            download={file.name}
            class="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/60"
            title="Download"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </a>
        </div>
      {:else}
        <!-- File card (WhatsApp document style) -->
        <a
          href={fileUrl}
          target="_blank"
          download={file.name}
          class="flex items-center gap-3 p-2.5 rounded-xl border border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition group text-left max-w-[280px]"
        >
          <div class="w-10 h-10 rounded-lg bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-semibold text-[#111b21] dark:text-[#e9edef] truncate">{file.name}</p>
            <p class="text-[10px] text-[#8696a0] font-medium">{formatSize(file.size)}</p>
          </div>
          <div class="text-[#8696a0] shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </div>
        </a>
      {/if}
    {/each}
  </div>
{/if}

<!-- Fullscreen Lightbox (WhatsApp Image Viewer) -->
{#if lightboxUrl}
  <div
    class="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center animate-fadeIn"
    role="dialog"
    aria-modal="true"
    onclick={closeLightbox}
  >
    <!-- Top Bar -->
    <div class="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent z-10" onclick={(e) => e.stopPropagation()}>
      <span class="text-white text-sm font-medium truncate max-w-[70%]">{lightboxName}</span>
      <div class="flex items-center gap-2">
        <a
          href={lightboxUrl}
          download={lightboxName}
          class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          title="Download"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
          </svg>
        </a>
        <button
          onclick={closeLightbox}
          class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          title="Tutup"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>

    <!-- Image -->
    <img
      src={lightboxUrl}
      alt={lightboxName}
      class="max-w-[95vw] max-h-[90vh] object-contain rounded-lg select-none"
      onclick={(e) => e.stopPropagation()}
    />
  </div>
{/if}

<script lang="ts">
  interface Props {
    searchQuery: string;
    onInput: (query: string) => void;
    onClose: () => void;
  }

  let { searchQuery, onInput, onClose }: Props = $props();
</script>

<div class="px-4 py-2 bg-[#f0f2f5] dark:bg-[#1f2c34] border-b border-[#d1d7db] dark:border-[#222d34] flex items-center gap-2 animate-fadeIn z-20 select-none">
  <svg class="w-4 h-4 text-[#667781] dark:text-[#8696a0] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
  </svg>
  <input
    type="text"
    value={searchQuery}
    oninput={(e) => onInput((e.target as HTMLInputElement).value)}
    placeholder="Cari pesan di obrolan ini..."
    class="flex-1 bg-transparent text-[13px] text-[#111b21] dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#8696a0] border-0 outline-none"
  />
  {#if searchQuery}
    <button
      type="button"
      onclick={() => onInput('')}
      class="text-xs text-[#008069] dark:text-[#00a884] font-medium hover:underline cursor-pointer"
    >
      Reset
    </button>
  {/if}
  <button
    type="button"
    onclick={onClose}
    class="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full text-[#667781] dark:text-[#8696a0] cursor-pointer"
    title="Tutup pencarian"
    aria-label="Tutup pencarian"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
    </svg>
  </button>
</div>

<script lang="ts">
  import { chatStore } from '$lib/stores/chat.svelte';
  import { goto } from '$app/navigation';

  function selectFirstChannel() {
    if (chatStore.channels.length > 0) {
      goto(`/chat/${chatStore.channels[0].id}`);
    }
  }
</script>

<svelte:head>
  <title>Pilih Percakapan | BIMA Chat RSUD Bangil</title>
  <meta name="description" content="Pilih channel atau percakapan pribadi untuk memulai obrolan di BIMA Chat RSUD Bangil." />
</svelte:head>

<div class="flex-1 flex flex-col items-center justify-center h-full bg-[#efeae2] dark:bg-[#0b141a] wa-chat-wallpaper p-8 text-center select-none border-b-[6px] border-[#00a884]">
  <div class="max-w-md space-y-4 bg-white/85 dark:bg-[#111b21]/90 backdrop-blur-xs p-6 rounded-2xl shadow-xs border border-black/5 dark:border-white/5">
    <div class="w-16 h-16 rounded-full bg-[#008069] text-white flex items-center justify-center mx-auto shadow-xs">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
    </div>

    <div class="space-y-1.5">
      <h1 class="text-lg font-bold text-[#111b21] dark:text-[#e9edef]">BIMA Chat — RSUD Bangil</h1>
      <p class="text-xs text-[#667781] dark:text-[#8696a0] leading-relaxed">
        Platform komunikasi internal realtime RSUD Bangil. Kirim dan terima pesan instan dengan aman antar rekan kerja dan unit pelayanan.
      </p>
    </div>

    <div class="pt-2">
      {#if chatStore.channels.length > 0}
        <button
          onclick={selectFirstChannel}
          class="inline-flex items-center px-4 py-2 bg-[#008069] hover:bg-[#007a60] text-white text-xs font-semibold rounded-lg transition shadow-xs active:scale-95 cursor-pointer"
        >
          Masuk ke #{chatStore.channels[0].name} &rarr;
        </button>
      {:else}
        <p class="text-xs text-[#667781] dark:text-[#8696a0]">Pilih atau buat percakapan di bilah kiri untuk memulai.</p>
      {/if}
    </div>
  </div>
</div>

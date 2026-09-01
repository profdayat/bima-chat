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

<div class="flex-1 flex flex-col items-center justify-center h-full bg-slate-50 dark:bg-gray-900 p-8 text-center select-none">
  <div class="max-w-md space-y-4">
    <div class="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
      <svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
    </div>

    <div class="space-y-1.5">
      <h1 class="text-xl font-bold text-gray-900 dark:text-white">Selamat Datang di BIMA Chat</h1>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Platform komunikasi multichannel realtime RSUD Bangil berbasis Server-Sent Events (SSE) & Redis Pub/Sub.
      </p>
    </div>

    <div class="pt-2">
      {#if chatStore.channels.length > 0}
        <button
          onclick={selectFirstChannel}
          class="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-sm hover:shadow active:scale-95"
        >
          Masuk ke #{chatStore.channels[0].name} &rarr;
        </button>
      {:else}
        <p class="text-xs text-gray-400">Pilih atau buat channel di sidebar sebelah kiri untuk mulai chatting.</p>
      {/if}
    </div>
  </div>
</div>

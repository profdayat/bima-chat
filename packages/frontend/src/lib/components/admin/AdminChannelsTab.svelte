<script lang="ts">
  import type { Channel } from '$lib/types';

  interface Props {
    channels: Channel[];
    isCreating: boolean;
    isSubmitting: boolean;
    onToggleCreating: () => void;
    onCreateChannel: (name: string) => Promise<void>;
    onDeleteChannel: (id: string, name: string) => Promise<void>;
  }

  let {
    channels,
    isCreating,
    isSubmitting,
    onToggleCreating,
    onCreateChannel,
    onDeleteChannel
  }: Props = $props();

  let newChannelName = $state('');

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!newChannelName.trim() || isSubmitting) return;
    await onCreateChannel(newChannelName.trim());
    newChannelName = '';
  }
</script>

<div class="space-y-4 animate-fadeIn">
  <!-- Create Channel Action Bar -->
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-700">
    <div>
      <h3 class="text-sm font-bold text-gray-900 dark:text-white">Daftar Ruang Chat (Channels)</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Kelola channel resmi untuk komunikasi antar unit kerja</p>
    </div>
    <button
      type="button"
      onclick={onToggleCreating}
      class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <span>+</span>
      <span>Buat Channel Baru</span>
    </button>
  </div>

  <!-- New Channel Inline Form -->
  {#if isCreating}
    <form onsubmit={handleSubmit} class="p-5 bg-emerald-50/80 dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-3xl space-y-3 animate-fadeIn">
      <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-200">Form Tambah Channel Baru</h4>
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          bind:value={newChannelName}
          placeholder="contoh: poli-bedah atau humas-rsud"
          aria-label="Nama channel baru"
          class="flex-1 text-xs py-2 px-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
          required
        />
        <div class="flex gap-2">
          <button
            type="submit"
            disabled={!newChannelName.trim() || isSubmitting}
            class="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Channel'}
          </button>
          <button
            type="button"
            onclick={onToggleCreating}
            class="py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
        </div>
      </div>
    </form>
  {/if}

  <!-- Channels Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each channels as channel (channel.id)}
      <div class="p-5 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-300 transition">
        <div>
          <div class="flex items-center justify-between">
            <span class="text-base font-black text-gray-900 dark:text-white flex items-center gap-1">
              <span class="text-emerald-500">#</span>
              <span>{channel.name}</span>
            </span>
            {#if channel.name === 'general'}
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                Default
              </span>
            {/if}
          </div>
          <p class="text-[11px] text-gray-400 mt-1 font-mono">{channel.id}</p>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
          <a
            href="/chat/{channel.id}"
            class="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
          >
            <span>Masuk Channel</span>
            <span>&rarr;</span>
          </a>

          {#if channel.name !== 'general'}
            <button
              type="button"
              onclick={() => onDeleteChannel(channel.id, channel.name)}
              class="py-1 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Hapus
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

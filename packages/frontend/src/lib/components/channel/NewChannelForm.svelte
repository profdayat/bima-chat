<script lang="ts">
  interface Props {
    isSubmitting: boolean;
    onSubmit: (name: string) => Promise<void>;
    onCancel: () => void;
  }

  let { isSubmitting, onSubmit, onCancel }: Props = $props();
  let channelName = $state('');

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!channelName.trim() || isSubmitting) return;
    await onSubmit(channelName.trim());
    channelName = '';
  }
</script>

<form onsubmit={handleSubmit} class="p-2.5 bg-[#f0f2f5] dark:bg-[#202c33] rounded-lg space-y-2 animate-fadeIn border border-[#008069]/30">
  <label for="newChanInput" class="block text-xs font-semibold text-[#111b21] dark:text-[#e9edef]">Nama Channel Baru:</label>
  <div class="flex items-center space-x-1">
    <span class="text-[#667781] dark:text-[#8696a0] text-sm font-bold">#</span>
    <input
      id="newChanInput"
      type="text"
      bind:value={channelName}
      placeholder="contoh: poli-anak"
      class="w-full text-xs py-1.5 px-2 bg-white dark:bg-[#2a3942] rounded-md text-[#111b21] dark:text-[#e9edef] border-0 outline-none"
      disabled={isSubmitting}
      required
    />
  </div>
  <div class="flex justify-end space-x-1.5 pt-1">
    <button
      type="button"
      onclick={onCancel}
      class="text-xs px-2.5 py-1 text-[#667781] dark:text-[#8696a0] hover:text-[#111b21] dark:hover:text-white rounded cursor-pointer"
    >
      Batal
    </button>
    <button
      type="submit"
      disabled={!channelName.trim() || isSubmitting}
      class="text-xs px-3 py-1 bg-[#008069] hover:bg-[#007a60] text-white rounded-md font-bold disabled:opacity-50 transition cursor-pointer"
    >
      {isSubmitting ? 'Membuat...' : 'Buat Channel'}
    </button>
  </div>
</form>

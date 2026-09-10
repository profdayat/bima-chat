<script lang="ts">
  import type { ChatMessage, Attachment } from '$lib/types';
  import { getApiBase } from '$lib/utils';
  import EmojiPickerModal from './EmojiPickerModal.svelte';

  interface Props {
    channelId: string;
    isSending: boolean;
    replyingToMessage: ChatMessage | null;
    onCancelReply: () => void;
    onSendMessage: (text: string, files: Attachment[]) => Promise<void>;
    onTypingChange: () => void;
    onFocusInput?: () => void;
  }

  let {
    channelId,
    isSending,
    replyingToMessage,
    onCancelReply,
    onSendMessage,
    onTypingChange,
    onFocusInput
  }: Props = $props();

  let inputText = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);
  let cameraInput = $state<HTMLInputElement | null>(null);
  let isUploadingFile = $state(false);
  let uploadedFiles = $state<Attachment[]>([]);
  let showEmojiPicker = $state(false);

  let canSend = $derived((inputText.trim().length > 0 || uploadedFiles.length > 0) && !isSending);

  function insertEmoji(emoji: string): void {
    inputText += emoji;
  }

  async function handleFileUpload(e: Event): Promise<void> {
    const target = e.target as HTMLInputElement;
    const filesList = target?.files || fileInput?.files || cameraInput?.files;
    if (!filesList || filesList.length === 0) return;

    isUploadingFile = true;
    const base = getApiBase();
    const newlyUploaded: Attachment[] = [];

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${base}/api/chat/upload`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const uploaded = (await res.json()) as Attachment;
          newlyUploaded.push(uploaded);
        }
      } catch (err) {
        console.error('Upload failed', err);
      }
    }

    if (newlyUploaded.length > 0) {
      uploadedFiles = [...uploadedFiles, ...newlyUploaded];
    }

    isUploadingFile = false;
    if (target) target.value = '';
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
  }

  function removeUploadedFile(index: number): void {
    uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
  }

  async function handleSubmit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    if (!canSend) return;

    const textToSend = inputText.trim();
    const filesToSend = [...uploadedFiles];

    inputText = '';
    uploadedFiles = [];
    showEmojiPicker = false;

    await onSendMessage(textToSend, filesToSend);
  }
</script>

<svelte:window onclick={(e) => {
  const target = e.target as HTMLElement | null;
  if (target && !target.closest('#emoji-picker-panel') && !target.closest('#btn-toggle-emoji')) {
    showEmojiPicker = false;
  }
}} />

<footer class="p-2 md:p-3 bg-transparent shrink-0 relative z-20">
  <!-- Replying to Message Preview Box -->
  {#if replyingToMessage}
    <div class="max-w-4xl mx-auto mb-2 p-2.5 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-md border-l-4 border-[#00a884] flex items-center justify-between animate-fadeIn border border-black/5 dark:border-white/5">
      <div class="min-w-0 flex-1 pl-1">
        <p class="font-bold text-[#008069] text-[11.5px]">
          Membalas @{replyingToMessage.sender?.displayName || replyingToMessage.sender?.username || 'Staff RSUD'}
        </p>
        <p class="text-[#4b5563] dark:text-[#9ca3af] truncate text-[12px] mt-0.5">
          "{replyingToMessage.text}"
        </p>
      </div>
      <button
        type="button"
        onclick={onCancelReply}
        class="text-[#4b5563] hover:text-[#111b21] dark:hover:text-white font-bold p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
        title="Batal membalas"
      >
        ✕
      </button>
    </div>
  {/if}

  <!-- Uploaded Files Preview Shelf -->
  {#if uploadedFiles.length > 0}
    <div class="max-w-4xl mx-auto mb-2 p-2 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-md flex flex-wrap gap-2 animate-fadeIn border border-black/5 dark:border-white/5">
      {#each uploadedFiles as file, index}
        <div class="flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-[#2a3942] rounded-xl text-xs">
          <span class="truncate max-w-xs text-[#111b21] dark:text-[#e9edef]">{file.name}</span>
          <button
            type="button"
            onclick={() => removeUploadedFile(index)}
            class="text-rose-500 font-bold ml-1 hover:opacity-80 transition cursor-pointer"
            title="Hapus"
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Floating Emoji Reaction Picker Panel -->
  <EmojiPickerModal
    show={showEmojiPicker}
    onSelectEmoji={insertEmoji}
    onClose={() => (showEmojiPicker = false)}
  />

  <!-- Floating Pill Form + Circular Action Button -->
  <form
    onsubmit={handleSubmit}
    class="flex items-center gap-2 max-w-4xl mx-auto w-full"
  >
    <!-- Left Pill Capsule Container -->
    <div class="flex-1 bg-white dark:bg-[#1f2c34] rounded-full h-12 flex items-center px-3 shadow-md border border-black/5 dark:border-white/5 transition-all min-w-0">
      <!-- Emoji Smiley Button -->
      <button
        id="btn-toggle-emoji"
        type="button"
        onclick={() => (showEmojiPicker = !showEmojiPicker)}
        class="p-1 rounded-full text-[#4b5563] hover:text-[#111b21] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center mr-0.5 cursor-pointer"
        title="Emoji"
        aria-label="Pilih emoji & reaksi"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
          <line x1="9" y1="9" x2="9.01" y2="9"></line>
          <line x1="15" y1="9" x2="15.01" y2="9"></line>
        </svg>
      </button>

      <!-- Hidden Standard File input -->
      <input
        type="file"
        bind:this={fileInput}
        onchange={handleFileUpload}
        multiple
        aria-label="Pilih berkas untuk diunggah"
        class="hidden"
      />

      <!-- Hidden Camera File input -->
      <input
        type="file"
        bind:this={cameraInput}
        onchange={handleFileUpload}
        accept="image/*"
        capture="environment"
        aria-label="Ambil foto menggunakan kamera"
        class="hidden"
      />

      <!-- Text Input Field -->
      <input
        type="text"
        bind:value={inputText}
        oninput={onTypingChange}
        aria-label="Ketik pesan"
        onfocus={onFocusInput}
        placeholder="Ketik pesan"
        class="flex-1 bg-transparent text-[#111b21] dark:text-[#e9edef] placeholder-[#4b5563] dark:placeholder-[#9ca3af] text-[15px] px-1 py-2 border-0 focus:ring-0 outline-none min-w-0"
        autocomplete="off"
      />

      <!-- Paperclip / Lampiran Button -->
      <button
        type="button"
        onclick={() => fileInput?.click()}
        class="p-1 text-[#4b5563] hover:text-[#111b21] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center mr-0.5 cursor-pointer"
        title="Lampirkan berkas"
        aria-label="Lampirkan berkas"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
        </svg>
      </button>

      <!-- Camera icon button -->
      <button
        type="button"
        onclick={() => (cameraInput ? cameraInput.click() : fileInput?.click())}
        class="p-1 text-[#4b5563] hover:text-[#111b21] dark:hover:text-white rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition shrink-0 flex items-center justify-center cursor-pointer"
        title="Kamera / Foto"
        aria-label="Kamera / Foto"
      >
        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
          <circle cx="12" cy="13" r="4"></circle>
        </svg>
      </button>
    </div>

    <!-- Right Circular Action Button -->
    <button
      type="submit"
      disabled={!canSend}
      aria-label="Kirim Pesan"
      class="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full flex items-center justify-center transition-all shrink-0
        {canSend
          ? 'bg-[#00a884] hover:bg-[#008069] active:scale-95 text-white shadow-md cursor-pointer'
          : 'bg-[#00a884]/40 dark:bg-[#00a884]/30 text-white/60 dark:text-white/40 cursor-not-allowed shadow-none'}"
    >
      {#if isSending}
        <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <svg class="w-5 h-5 fill-current transform translate-x-0.5" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
        </svg>
      {/if}
    </button>
  </form>
</footer>

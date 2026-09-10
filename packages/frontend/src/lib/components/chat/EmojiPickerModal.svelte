<script lang="ts">
  import { EMOJI_CATEGORIES, type EmojiCategoryKey } from '$lib/utils';

  interface Props {
    show: boolean;
    onSelectEmoji: (emoji: string) => void;
    onClose: () => void;
  }

  let { show, onSelectEmoji, onClose }: Props = $props();
  let selectedCategory = $state<EmojiCategoryKey>('frequent');
</script>

{#if show}
  <div
    id="emoji-picker-panel"
    class="max-w-md mx-auto mb-2 bg-white/95 dark:bg-[#202c33]/95 backdrop-blur-md rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 p-3 animate-fadeIn select-none z-30"
  >
    <!-- Category Tabs -->
    <div class="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2 mb-2">
      <div class="flex items-center gap-1 overflow-x-auto py-0.5">
        {#each (Object.keys(EMOJI_CATEGORIES) as EmojiCategoryKey[]) as cat}
          <button
            type="button"
            onclick={() => (selectedCategory = cat)}
            class="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition {selectedCategory === cat ? 'bg-[#008069]/20 text-[#008069] dark:text-[#00a884]' : 'text-[#4b5563] hover:bg-black/5 dark:hover:bg-white/5'}"
          >
            <span>{EMOJI_CATEGORIES[cat].icon}</span>
            <span class="text-[11px] whitespace-nowrap">{EMOJI_CATEGORIES[cat].title}</span>
          </button>
        {/each}
      </div>
      <button
        type="button"
        onclick={onClose}
        class="text-[#4b5563] hover:text-[#111b21] dark:hover:text-white p-1 rounded-md text-xs font-bold shrink-0 ml-1 cursor-pointer"
        title="Tutup"
      >
        ✕
      </button>
    </div>

    <!-- Emoji Grid -->
    <div class="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto py-1">
      {#each EMOJI_CATEGORIES[selectedCategory].emojis as emoji}
        <button
          type="button"
          onclick={() => onSelectEmoji(emoji)}
          aria-label="Emoji {emoji}"
          class="w-9 h-9 flex items-center justify-center text-xl hover:scale-125 active:scale-95 transition-transform rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
          title={emoji}
        >
          {emoji}
        </button>
      {/each}
    </div>
  </div>
{/if}

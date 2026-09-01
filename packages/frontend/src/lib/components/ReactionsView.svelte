<script lang="ts">
  import { chatStore } from '../stores/chat.svelte';

  let { messageId, reactions = [] }: { messageId: string; reactions?: { emoji: string; username: string }[] } = $props();

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  let showPicker = $state(false);

  // Group reactions by emoji
  let groupedReactions = $derived(
    reactions.reduce((acc, current) => {
      const existing = acc.find(r => r.emoji === current.emoji);
      if (existing) {
        existing.users.push(current.username);
      } else {
        acc.push({ emoji: current.emoji, users: [current.username] });
      }
      return acc;
    }, [] as { emoji: string; users: string[] }[])
  );

  function hasMyReaction(users: string[]) {
    return users.includes(chatStore.currentUsername);
  }

  function handleReact(emoji: string) {
    chatStore.reactToMessage(messageId, emoji);
    showPicker = false;
  }
</script>

<div class="relative flex items-center select-none">
  <!-- Reactions List display -->
  {#if groupedReactions.length > 0}
    <div class="flex flex-wrap gap-1 mt-1">
      {#each groupedReactions as group}
        {@const mine = hasMyReaction(group.users)}
        <button
          onclick={() => handleReact(group.emoji)}
          class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border font-medium transition-all
            {mine
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}"
          title={group.users.join(', ')}
        >
          <span>{group.emoji}</span>
          <span>{group.users.length}</span>
        </button>
      {/each}
    </div>
  {/if}

  <!-- Add Reaction Button / Picker trigger -->
  <div class="relative ml-1">
    <button
      onclick={() => (showPicker = !showPicker)}
      class="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
      title="Tambah reaksi"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    </button>

    {#if showPicker}
      <!-- Backdrop to close picker -->
      <button
        onclick={() => (showPicker = false)}
        class="fixed inset-0 z-45 bg-transparent cursor-default"
        type="button"
      ></button>

      <!-- Emoji Picker Panel -->
      <div class="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 shadow-xl rounded-full px-2 py-1 flex items-center space-x-1.5 animate-fadeIn">
        {#each emojis as emo}
          <button
            onclick={() => handleReact(emo)}
            class="text-base hover:scale-125 transition active:scale-95 p-1 rounded-full hover:bg-gray-150 dark:hover:bg-gray-700"
          >
            {emo}
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    goto('/chat');
  });
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
  <div class="text-center">
    <h1 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">BIMA Chat — RSUD Bangil</h1>
    <p class="text-gray-500 dark:text-gray-400 mb-4">Redirecting to chat...</p>
    <a href="/chat" class="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition font-medium">
      Open Chat Room &rarr;
    </a>
  </div>
</div>


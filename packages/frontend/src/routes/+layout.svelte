<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div class="h-full w-full max-h-full overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
  {@render children()}
</div>

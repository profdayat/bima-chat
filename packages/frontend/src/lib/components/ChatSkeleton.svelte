<script lang="ts">
</script>

<div class="p-4 sm:p-6 space-y-6 animate-pulse select-none" aria-busy="true" aria-label="Memuat riwayat percakapan...">
  <!-- Date Separator Skeleton -->
  <div class="flex justify-center">
    <div class="h-5 w-24 bg-gray-200 dark:bg-gray-700/80 rounded-full"></div>
  </div>

  <!-- Left Message Bubble 1 -->
  <div class="flex items-start gap-2.5 max-w-[80%] sm:max-w-md">
    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
    <div class="space-y-1.5 flex-1">
      <div class="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="p-3.5 bg-gray-200/70 dark:bg-gray-800 rounded-2xl rounded-tl-sm space-y-2">
        <div class="h-3.5 w-48 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div class="h-3.5 w-36 bg-gray-300/80 dark:bg-gray-700/70 rounded"></div>
      </div>
    </div>
  </div>

  <!-- Right Message Bubble 1 (Self) -->
  <div class="flex justify-end">
    <div class="max-w-[80%] sm:max-w-md space-y-1.5 items-end flex flex-col">
      <div class="p-3.5 bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl rounded-tr-sm space-y-2">
        <div class="h-3.5 w-56 bg-emerald-200 dark:bg-emerald-800/60 rounded"></div>
        <div class="h-3.5 w-40 bg-emerald-200/80 dark:bg-emerald-800/40 rounded"></div>
      </div>
    </div>
  </div>

  <!-- Left Message Bubble 2 (with attachment skeleton) -->
  <div class="flex items-start gap-2.5 max-w-[80%] sm:max-w-md">
    <div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
    <div class="space-y-1.5 flex-1">
      <div class="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="p-3.5 bg-gray-200/70 dark:bg-gray-800 rounded-2xl rounded-tl-sm space-y-2.5">
        <div class="h-28 w-44 bg-gray-300 dark:bg-gray-700 rounded-xl"></div>
        <div class="h-3.5 w-32 bg-gray-300 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>

  <!-- Right Message Bubble 2 -->
  <div class="flex justify-end">
    <div class="max-w-[80%] sm:max-w-md space-y-1.5 items-end flex flex-col">
      <div class="p-3.5 bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl rounded-tr-sm">
        <div class="h-3.5 w-32 bg-emerald-200 dark:bg-emerald-800/60 rounded"></div>
      </div>
    </div>
  </div>
</div>

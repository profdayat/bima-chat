<script lang="ts">
  interface Props {
    dateLabel: string;
  }

  let { dateLabel }: Props = $props();
</script>

<div class="flex justify-center my-3 sticky top-1 z-10 select-none pointer-events-none">
  <span class="px-3 py-1 rounded-lg text-[11px] font-medium tracking-wide uppercase shadow-2xs backdrop-blur-md bg-white/90 dark:bg-[#182229]/90 text-[#54656f] dark:text-[#8696a0] border border-black/5 dark:border-white/5 pointer-events-auto">
    {dateLabel}
  </span>
</div>

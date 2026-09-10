<script lang="ts">
  interface Props {
    allowGuest: boolean;
    allowRegistration: boolean;
    isSaving: boolean;
    onToggleGuest: () => void;
    onToggleRegistration: () => void;
    onSave: () => Promise<void>;
  }

  let {
    allowGuest,
    allowRegistration,
    isSaving,
    onToggleGuest,
    onToggleRegistration,
    onSave
  }: Props = $props();
</script>

<div class="space-y-6 animate-fadeIn max-w-4xl mx-auto">
  <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs space-y-6">
    <div>
      <h3 class="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>⚙️</span>
        <span>Konfigurasi Akses & Pendaftaran Pengguna</span>
      </h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Atur kebijakan pendaftaran akun dan aksesibilitas ruang obrolan untuk seluruh unit di RSUD Bangil.
      </p>
    </div>

    <div class="divide-y divide-gray-100 dark:divide-gray-700 space-y-4 pt-2">
      <!-- Setting 1: Mode Tamu (Guest Mode) -->
      <div class="pt-4 flex items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white">Mode Tamu (Guest Access)</h4>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold
              {allowGuest ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}">
              {allowGuest ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
            Mengizinkan staf atau tamu mengakses dan mengirim pesan di ruang obrolan secara langsung tanpa perlu mendaftar atau login akun resmi.
          </p>
        </div>

        <!-- Toggle Switch -->
        <button
          type="button"
          onclick={onToggleGuest}
          aria-label="Izinkan akses tamu tanpa login"
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden
            {allowGuest ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}"
          role="switch"
          aria-checked={allowGuest}
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
              {allowGuest ? 'translate-x-5' : 'translate-x-0'}"
          ></span>
        </button>
      </div>

      <!-- Setting 2: Registrasi Akun Baru (Self-Registration) -->
      <div class="pt-4 flex items-center justify-between gap-4">
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white">Registrasi Mandiri (Self-Registration)</h4>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold
              {allowRegistration ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'}">
              {allowRegistration ? 'Diizinkan' : 'Dinonaktifkan'}
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 max-w-xl">
            Mengizinkan staf baru mendaftarkan akun mereka secara mandiri dari portal login. Jika dinonaktifkan, akun baru hanya dapat dibuat oleh administrator.
          </p>
        </div>

        <!-- Toggle Switch -->
        <button
          type="button"
          onclick={onToggleRegistration}
          aria-label="Izinkan registrasi mandiri akun baru"
          class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden
            {allowRegistration ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}"
          role="switch"
          aria-checked={allowRegistration}
        >
          <span
            class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
              {allowRegistration ? 'translate-x-5' : 'translate-x-0'}"
          ></span>
        </button>
      </div>
    </div>

    <!-- Save Action Button -->
    <div class="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end">
      <button
        type="button"
        onclick={onSave}
        disabled={isSaving}
        class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {#if isSaving}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Menyimpan...</span>
        {:else}
          <span>💾</span>
          <span>Simpan Pengaturan</span>
        {/if}
      </button>
    </div>
  </div>
</div>

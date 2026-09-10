<script lang="ts">
  import type { User } from '$lib/types';
  import { chatStore } from '$lib/stores/chat.svelte';

  interface Props {
    users: User[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    onRefresh: () => void;
    onUpdateStatus: (userId: string, currentStatus: string | boolean | undefined) => Promise<void>;
    onUpdateRole: (userId: string, currentRole: string) => Promise<void>;
  }

  let {
    users,
    searchQuery,
    onSearchChange,
    onRefresh,
    onUpdateStatus,
    onUpdateRole
  }: Props = $props();

  let filteredUsers = $derived(
    users.filter(u =>
      (u.displayName || u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="space-y-4 animate-fadeIn">
  <!-- Search & Filter Bar -->
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-200/80 dark:border-gray-700">
    <div class="relative w-full sm:w-72">
      <input
        type="text"
        value={searchQuery}
        oninput={(e) => onSearchChange((e.target as HTMLInputElement).value)}
        placeholder="Cari user berdasarkan nama / role..."
        aria-label="Cari user berdasarkan nama atau role"
        class="w-full text-xs py-2 pl-9 pr-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
      />
      <span class="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
    </div>
    <button
      type="button"
      onclick={onRefresh}
      class="w-full sm:w-auto px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
    >
      <span>🔄</span>
      <span>Refresh Data</span>
    </button>
  </div>

  <!-- Users List Table -->
  <div class="bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead class="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase font-bold border-b border-gray-200 dark:border-gray-700">
          <tr>
            <th class="py-3.5 px-4 sm:px-6">Pengguna</th>
            <th class="py-3.5 px-4">Role</th>
            <th class="py-3.5 px-4">Status</th>
            <th class="py-3.5 px-4 sm:px-6 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-150 dark:divide-gray-700">
          {#each filteredUsers as user (user.id)}
            <tr class="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition">
              <!-- User Info -->
              <td class="py-3.5 px-4 sm:px-6">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                    {(user.displayName || user.username || '').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p class="font-bold text-gray-900 dark:text-white text-sm">
                      {user.displayName || user.username}
                    </p>
                    <p class="text-[11px] text-gray-400">@{user.username}</p>
                  </div>
                </div>
              </td>

              <!-- Role Badge -->
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-bold
                  {user.role === 'admin'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'}">
                  {user.role.toUpperCase()}
                </span>
              </td>

              <!-- Status Badge -->
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-1 rounded-lg text-[11px] font-semibold
                  {user.isActive === 'true' || user.isActive === true
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}">
                  {user.isActive === 'true' || user.isActive === true ? 'Aktif' : 'Suspended'}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 sm:px-6 text-right">
                {#if user.id !== chatStore.authUser?.id}
                  <div class="flex items-center justify-end gap-2">
                    <!-- Toggle Active/Suspend -->
                    <button
                      type="button"
                      onclick={() => onUpdateStatus(user.id, user.isActive)}
                      class="py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer
                        {user.isActive === 'true' || user.isActive === true
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'}"
                    >
                      {user.isActive === 'true' || user.isActive === true ? 'Suspend' : 'Aktifkan'}
                    </button>

                    <!-- Toggle Role -->
                    <button
                      type="button"
                      onclick={() => onUpdateRole(user.id, user.role)}
                      class="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Jadikan {user.role === 'admin' ? 'Staff' : 'Admin'}
                    </button>
                  </div>
                {:else}
                  <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold italic">Akun Anda</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

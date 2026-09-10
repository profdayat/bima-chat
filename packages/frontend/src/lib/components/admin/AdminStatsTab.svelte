<script lang="ts">
  import type { AdminStats } from '$lib/types';

  interface Props {
    stats: AdminStats;
  }

  let { stats }: Props = $props();
</script>

<div class="space-y-6 animate-fadeIn">
  <!-- Metric Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
    <!-- Users Card -->
    <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total User</p>
          <p class="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.users}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-xl shadow-inner">
          👥
        </div>
      </div>
      <p class="text-[11px] text-gray-400 mt-3">Akun staff & admin terdaftar</p>
    </div>

    <!-- Messages Card -->
    <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Pesan</p>
          <p class="text-3xl sm:text-4xl font-black text-teal-600 dark:text-teal-400 mt-2">{stats.messages}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center text-xl shadow-inner">
          💬
        </div>
      </div>
      <p class="text-[11px] text-gray-400 mt-3">Tersimpan di database</p>
    </div>

    <!-- Channels Card -->
    <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs relative overflow-hidden group">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Channel Aktif</p>
          <p class="text-3xl sm:text-4xl font-black text-cyan-600 dark:text-cyan-400 mt-2">{stats.channels}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 flex items-center justify-center text-xl shadow-inner">
          #
        </div>
      </div>
      <p class="text-[11px] text-gray-400 mt-3">Ruang chat poli & unit kerja</p>
    </div>
  </div>

  <!-- Infrastructure & System Info -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Server Status -->
    <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs space-y-4">
      <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>⚡</span>
        <span>Status Infrastruktur Realtime</span>
      </h3>
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Backend Server (Elysia Bun)</span>
          <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Online (:8080)
          </span>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Database (PostgreSQL)</span>
          <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected (:5432)
          </span>
        </div>
        <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl">
          <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Pub/Sub Engine (Redis)</span>
          <span class="px-2.5 py-1 text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-lg flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Connected (:6379)
          </span>
        </div>
      </div>
    </div>

    <!-- Architecture Info -->
    <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 rounded-3xl shadow-xs space-y-3">
      <h3 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
        <span>🛡️</span>
        <span>Arsitektur & Keamanan</span>
      </h3>
      <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        Sistem chat RSUD Bangil menggunakan autentikasi berbasis JWT token, otorisasi peran (Role-Based Access Control) bertingkat, dan enkripsi password menggunakan algoritma Bcrypt.
      </p>
      <div class="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-2xl">
        <p class="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
          🚀 Blue-Green Zero Downtime Deployment
        </p>
        <p class="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
          Pembaruan backend dan frontend dapat diterapkan kapan saja tanpa memutus koneksi realtime pengguna aktif.
        </p>
      </div>
    </div>
  </div>
</div>

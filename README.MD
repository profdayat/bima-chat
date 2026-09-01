# BIMA Chat — RSUD Bangil

Platform Realtime Multichannel Chatting Internal RSUD Bangil (**BIMA Chat**) dengan arsitektur modern berkinerja tinggi, tampilan khas WhatsApp Web & Telegram Web, serta dukungan offline-first PWA.

---

## 🚀 Tech Stack

- **Backend**: [Elysia.js](https://elysiajs.com/) berjalan di atas runtime [Bun](https://bun.sh/) super cepat (Server-Sent Events untuk realtime streaming, REST API, Static file streamer).
- **Frontend**: [SvelteKit](https://kit.svelte.dev/) (**Svelte 5 Runes**) + [Tailwind CSS](https://tailwindcss.com/) + PWA (Service Worker + Offline Cache).
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) dengan [Drizzle ORM](https://orm.drizzle.team/).
- **Caching & Realtime**: [Redis 7](https://redis.io/) untuk Pub/Sub multichannel streaming dan in-memory caching query data.
- **Local Storage**: IndexedDB (*Local-First Architecture*) untuk rendering riwayat chat instan (0 ms) tanpa menunggu jaringan.

---

## 🛠️ Manajemen Perintah (Makefile)

Project ini dilengkapi dengan **Makefile** untuk mempermudah operasional dan pembaruan kode di server:

| Perintah | Deskripsi |
| :--- | :--- |
| **`make update`** | **(Paling Sering Digunakan)** Menarik kode terbaru dari Git (`git pull origin main`) lalu otomatis rebuild dan jalankan container tanpa menghapus data. |
| **`make up`** | Build & jalankan semua service di background (Production/Standar). |
| **`make restart`** | Me-restart container secara cepat tanpa melakukan build ulang. |
| **`make build`** | Me-rebuild image container dari Dockerfile. |
| **`make logs`** | Melihat live log container (berguna untuk monitoring & debugging). |
| **`make ps`** | Menampilkan status kesehatan (*health status*) container dan port yang aktif. |
| **`make down`** | Menghentikan semua container. |
| **`make dev`** | Menjalankan mode development dengan volume mount src (hot-reload). |
| **`make dev-stop`** | Menghentikan mode development. |
| **`make help`** | Menampilkan ringkasan seluruh perintah yang tersedia. |

---

## 📦 Panduan Instalasi & Menjalankan

### 1. Prasyarat
- [Docker & Docker Compose](https://docs.docker.com/get-started/)
- [Bun](https://bun.sh/) (opsional jika menjalankan langsung tanpa Docker)

### 2. Clone Repositori
```bash
git clone git@github.com:profdayat/bima-chat.git
cd bima-chat
```

### 3. Konfigurasi Environment (`.env`)
Salin template konfigurasi `.env.example` ke `.env`:
```bash
cp .env.example .env
```
Sesuaikan variabel environment di dalam file `.env`:
```env
COMPOSE_PROJECT_NAME=bima-chat
APP_ENV=production
APP_PORT=8080
FRONTEND_PORT=8095

DB_HOST=postgres
DB_PORT=5432
DB_USER=bimachat
DB_PASSWORD=your_secure_password
DB_NAME=bima_chat_db

REDIS_URL=redis://redis:6379
JWT_SECRET=your-random-jwt-secret-min-32-chars
APP_FQDN=localhost:8095
```

### 4. Jalankan Aplikasi
Cukup gunakan perintah:
```bash
make up
```
Untuk memeriksa status container:
```bash
make ps
```

---

## 🌐 Akses Aplikasi & Endpoint

| Layanan | URL Default | Keterangan |
| :--- | :--- | :--- |
| **Web Chat (PWA)** | `http://<IP_SERVER>:8095/chat/general` | Antarmuka BIMA Chat Realtime |
| **Swagger API Docs** | `http://<IP_SERVER>:8095/api/swagger` | Dokumentasi OpenAPI Backend |
| **Akun Admin Default** | `username: admin_rsud` / `password: admin123` | Administrator Panel |
| **Akun Staf Default** | `username: dayat` / `password: dayat123` | Staf RSUD |

---

## 🔄 Alur Update Kode Saat Ada Perubahan

Jika Anda melakukan perubahan kode di komputer lokal:
1. **Push dari Komputer Lokal**:
   ```bash
   git add .
   git commit -m "feat: deskripsi perubahan"
   git push origin main
   ```
2. **Deploy di Server**:
   ```bash
   cd ~/rsud/develop/project/bima-chat
   make update
   ```

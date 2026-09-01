import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
export const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export async function initDatabase() {
  try {
    console.log('🔄 Checking and initializing database tables...');
    
    // Create users table
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff',
        avatar_url TEXT,
        display_name TEXT,
        is_active TEXT NOT NULL DEFAULT 'true',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create channels table
    await client`
      CREATE TABLE IF NOT EXISTS channels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create messages table
    await client`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
        sender_name TEXT,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'message',
        status TEXT NOT NULL DEFAULT 'sent',
        reply_to_id UUID,
        is_pinned TEXT NOT NULL DEFAULT 'false',
        attachments TEXT,
        reactions TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Create webhook_endpoints table
    await client`
      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        direction TEXT NOT NULL,
        active TEXT NOT NULL DEFAULT 'true',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;

    // Seed default admin if no users exist
    const userCount = await client`SELECT count(*) as count FROM users`;
    if (parseInt(userCount[0].count) === 0) {
      console.log('🌱 Seeding initial administrator account (admin_rsud)...');
      const salt = await bcrypt.genSalt(12);
      const adminPassHash = await bcrypt.hash('admin123', salt);
      const dayatPassHash = await bcrypt.hash('dayat123', salt);

      await client`
        INSERT INTO users (username, password_hash, role, display_name)
        VALUES 
          ('admin_rsud', ${adminPassHash}, 'admin', 'Administrator RSUD'),
          ('dayat', ${dayatPassHash}, 'admin', 'dr. Dayat, Sp.A')
        ON CONFLICT (username) DO NOTHING;
      `;
    }

    // Seed default public channels
    const defaultChannels = [
      { name: 'general', desc: 'Channel komunikasi umum seluruh staf RSUD Bangil' },
      { name: 'igd-darurat', desc: 'Koordinasi respon cepat Unit Gawat Darurat' },
      { name: 'rawat-inap', desc: 'Koordinasi perawat dan dokter jaga ruang rawat inap' },
      { name: 'farmasi', desc: 'Informasi ketersediaan dan peresepan obat farmasi' },
      { name: 'radiologi-lab', desc: 'Hasil laboratorium dan penunjang radiologi' },
      { name: 'poli-bedah', desc: 'Jadwal dan persiapan tindakan poli bedah' }
    ];

    for (const ch of defaultChannels) {
      await client`
        INSERT INTO channels (name, description, type)
        VALUES (${ch.name}, ${ch.desc}, 'public')
        ON CONFLICT (name) DO NOTHING;
      `;
    }

    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('⚠️ Database initialization error:', err);
  }
}

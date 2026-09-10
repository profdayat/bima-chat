/**
 * Format timestamp in WhatsApp chat list style:
 * - Today: "14.46"
 * - Yesterday: "Kemarin"
 * - Within last 6 days: Day name ("Senin", "Selasa", etc.)
 * - Older: "dd/mm/yy"
 */
export function formatWhatsAppTimestamp(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }

    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7 && diffDays > 0) {
      return date.toLocaleDateString('id-ID', { weekday: 'long' });
    }

    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Format date divider header in message timeline:
 * - Today: "Hari ini"
 * - Yesterday: "Kemarin"
 * - Else: "Senin, 10 September 2026"
 */
export function formatDateHeader(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }

    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Format message bubble timestamp: "14:46"
 */
export function formatMessageTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

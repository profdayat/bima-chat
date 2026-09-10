export interface EmojiCategory {
  title: string;
  icon: string;
  emojis: string[];
}

export type EmojiCategoryKey = 'frequent' | 'faces' | 'medical' | 'gestures';

export const EMOJI_CATEGORIES: Record<EmojiCategoryKey, EmojiCategory> = {
  frequent: {
    title: 'Sering Digunakan',
    icon: '⭐',
    emojis: ['👍', '❤️', '😂', '🙏', '😊', '🔥', '🎉', '👏', '😍', '🤔', '😭', '😎', '💯', '✨', '⭐', '✅']
  },
  faces: {
    title: 'Ekspresi',
    icon: '😀',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😋', '😜', '🤪', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕']
  },
  medical: {
    title: 'Medis & RS',
    icon: '🩺',
    emojis: ['🩺', '💉', '🩹', '💊', '🩻', '🚑', '🏥', '🧑‍⚕️', '👩‍⚕️', '👨‍⚕️', '🧬', '🔬', '🩸', '🌡️', '🫀', '🫁', '🧠', '🦷', '🦴', '♿', '🚨', '📋', '📁', '✍️', '⚠️', '❗', '❓', 'ℹ️']
  },
  gestures: {
    title: 'Tangan & Simbol',
    icon: '👍',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🫰', '🤙', '👋', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '💪', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '✨', '⭐', '🌟', '💥', '🔥', '🎉', '🎊', '💯', '✅', '❌', '⭕', '🔴', '🟢', '🔵']
  }
};

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😲', '😢', '🙏'];
export const EXTRA_EMOJIS = ['🔥', '🎉', '👏', '💯', '🤔', '💪', '🤝', '🩺'];

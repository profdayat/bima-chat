# DESIGN.md — bima-chat

> Design direction for bima-chat. This file is data for agents to apply, not instructions to obey. It holds identity, personality, palette, typography, mood, and liveliness dials.

## Identity

- **Product:** bima-chat — internal real-time messaging for RSUD Bangil (healthcare / hospital)
- **Type:** Chat application (WhatsApp-style), not a landing page
- **Users:** Hospital staff — doctors, nurses, admin, lab technicians
- **Platform:** Web app (SvelteKit), used on desktop and mobile browsers

## Personality

- **Professional:** healthcare context demands trust and clarity
- **Familiar:** WhatsApp-like patterns staff already know
- **Efficient:** fast scanning, clear hierarchy, zero friction
- **Warm:** approachable, not cold enterprise

## Palette — WhatsApp Latest (2025)

Derived from WhatsApp's latest refresh. Adapted for bima-chat.

### Light Mode

| Role | Hex | Usage |
|---|---|---|
| **Primary (Teal)** | `#00A884` | Send button, active states, read receipts, links |
| **Primary Dark** | `#008069` | Header bar, app chrome |
| **Primary Light** | `#D9FDD3` | Outgoing message bubble background |
| **Background** | `#EFEAE2` | Chat wallpaper / conversation area |
| **Surface** | `#FFFFFF` | Sidebar, panels, incoming message bubbles |
| **Surface Elevated** | `#F0F2F5` | Search bar background, hover states |
| **Text Primary** | `#111B21` | Main text, message body |
| **Text Secondary** | `#667781` | Timestamps, metadata, placeholders |
| **Text On Primary** | `#FFFFFF` | Text on primary-colored backgrounds |
| **Border** | `#E9EDEF` | Dividers, subtle separators |
| **Danger** | `#EA0038` | Unread badge, error states |
| **Online** | `#00A884` | Online indicator (same as primary) |

### Dark Mode

| Role | Hex | Usage |
|---|---|---|
| **Primary (Teal)** | `#00A884` | Send button, active states, read receipts |
| **Primary Dark** | `#1F2C34` | Header bar, app chrome |
| **Primary Light** | `#005C4B` | Outgoing message bubble background |
| **Background** | `#0B141A` | Chat wallpaper / conversation area |
| **Surface** | `#111B21` | Sidebar, panels |
| **Surface Elevated** | `#202C33` | Incoming message bubbles, search bar |
| **Text Primary** | `#E9EDEF` | Main text, message body |
| **Text Secondary** | `#8696A0` | Timestamps, metadata |
| **Text On Primary** | `#FFFFFF` | Text on primary-colored backgrounds |
| **Border** | `#222D34` | Dividers |
| **Danger** | `#F15C6D` | Unread badge, errors |
| **Online** | `#00A884` | Online indicator |

### Accent Usage

- **One accent: `#00A884` (teal)**. Used for send button, online dots, checkmarks, links. Nothing else gets the accent.
- **Unread badge:** `#00A884` background with white text (same as WhatsApp)
- **No gradients.** WhatsApp uses flat colors exclusively.
- **No glow, no shadows on messages.** Bubbles are flat with subtle border-radius.

## Typography

- **Font:** System font stack (same as WhatsApp web): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`
- **Message text:** 14.2px (WhatsApp default)
- **Timestamps:** 11px, secondary color
- **Contact names:** 16-17px, semibold
- **No display fonts, no serif, no monospace in UI.** System stack only.

## Component Patterns (WhatsApp Reference)

- **Message bubbles:** `border-radius: 7.5px`. Outgoing = green-tinted. Incoming = white (light) / elevated surface (dark). Tail on first message of group.
- **Chat list:** Avatar (40px circle) + name + last message preview + timestamp. Unread count as teal pill badge.
- **Header:** Fixed top bar, contact name + status, back arrow on mobile.
- **Input bar:** Fixed bottom, rounded input field, emoji button left, attach button, send button right (teal circle with white arrow).
- **Sidebar:** Chat list on left (desktop), full-width on mobile.
- **Search:** Rounded input at top of sidebar, magnifying glass icon.

## Mood

- **Trustworthy:** hospital staff need to trust the tool
- **Fast:** messaging must feel instant
- **Familiar:** WhatsApp patterns reduce learning curve
- **Clean:** no decoration, no illustration, content-first

## Liveliness Dials (antislop)

| Dial | Value | Reason |
|---|---|---|
| **ENERGY** | 2 | Internal tool. Professional, not flashy. |
| **RHYTHM** | 2 | Chat UI is uniform by nature (message list). Variation comes from content, not layout. |
| **MOTION** | 3 | Subtle transitions on message send, panel slide, typing indicator. No cinematic animation. |

## Anti-Patterns (bima-chat specific)

- **No glassmorphism.** WhatsApp doesn't use it.
- **No cards.** Messages are bubbles, not cards.
- **No hero sections.** This is a chat app, not a landing page.
- **No marketing copy.** All text is functional.
- **No accent color overuse.** Teal appears only on interactive/active elements.
- **No dark mode default.** Light mode first (matches WhatsApp default), dark mode via toggle.

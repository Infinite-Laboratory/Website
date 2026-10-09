export type AnnouncementKind = 'info' | 'event' | 'warn';

export interface Announcement {
  /** Stable id. A new id shows again for visitors who dismissed the old one. */
  id: string;
  /** info = yellow (default), event = mint, warn = red. */
  kind?: AnnouncementKind;
  /** Plain text, one or two lines. */
  message: string;
  link?: { label: string; href: string };
  /** ISO time after which the announcement is gone. */
  until?: string;
}

/** The announcement to show at `now`, or null when there is none or it has ended. */
export function activeAnnouncement(a: Announcement | null, now: Date = new Date()): Announcement | null {
  if (!a) return null;
  if (a.until && now.getTime() >= new Date(a.until).getTime()) return null;
  return a;
}

// The brand-use request form: what a creator sends, and the rules it must pass before it is sent.
// The server checks the same rules again (it never trusts the browser) and does the rate limiting and bot check.
export const USES = [
  { id: 'video', label: 'Video or stream' },
  { id: 'article', label: 'Article or review' },
  { id: 'list', label: 'Server list or wiki' },
  { id: 'social', label: 'Social post' },
  { id: 'event', label: 'Event or community' },
  { id: 'merch', label: 'Merch or print' },
  { id: 'other', label: 'Other' },
] as const;

export const FILES = [
  { id: 'logo', label: 'Logo and mark' },
  { id: 'animated', label: 'Animated logo' },
  { id: 'discord', label: 'Discord images' },
  { id: 'seasonal', label: 'Seasonal logos' },
  { id: 'many', label: 'More than one' },
] as const;

export const MAX_DESCRIPTION = 600;

export interface BrandRequest {
  name: string;
  email: string;
  discord: string;
  uses: string[];
  files: string;
  link: string;
  description: string;
  agree: boolean;
}

export type Errors = Partial<Record<keyof BrandRequest, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function validateRequest(r: BrandRequest): Errors {
  const e: Errors = {};
  if (!r.name.trim()) e.name = 'Tell us your name or channel.';
  if (!r.email.trim()) e.email = 'Enter your email so we can reply.';
  else if (!EMAIL.test(r.email.trim())) e.email = 'That does not look like an email address.';
  if (r.uses.length === 0) e.uses = 'Choose at least one use.';
  else if (r.uses.some((u) => !USES.some((x) => x.id === u))) e.uses = 'Choose from the list.';
  if (!r.files) e.files = 'Choose which files you want to use.';
  else if (!FILES.some((f) => f.id === r.files)) e.files = 'Choose from the list.';
  if (!r.link.trim()) e.link = 'Add a link to where it will appear.';
  else if (!isHttps(r.link.trim())) e.link = 'Use a full link that starts with https://';
  if (!r.description.trim()) e.description = 'Tell us a little about it.';
  else if (r.description.length > MAX_DESCRIPTION) e.description = `Keep it to ${MAX_DESCRIPTION} characters.`;
  if (!r.agree) e.agree = 'Please agree to the guidelines.';
  return e;
}

export function isHttps(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname.includes('.');
  } catch {
    return false;
  }
}

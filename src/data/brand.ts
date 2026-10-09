// Finished, approved brand files only. Everything here lives under public/brand and is a download.
// No source files, drafts or generators belong in this list or in that folder.
export type Bg = 'dark' | 'light' | 'checker';

export interface BrandAsset {
  id: string;
  title: string;
  note: string;
  /** Preview image (a static PNG or SVG). Large animated files are never embedded. */
  preview: string | null;
  bg: Bg;
  files: { path: string; label: string }[];
}
export interface BrandGroup { id: string; title: string; intro: string; assets: BrandAsset[] }

const f = (path: string, label?: string) => ({ path, label: label ?? (path.split('.').pop() ?? '').toUpperCase() });
const logoSet = (id: string, title: string, note: string, bg: Bg, png: string): BrandAsset => ({
  id, title, note, bg, preview: `/brand/logo/${id}.svg`,
  files: [f(`/brand/logo/${id}.svg`, 'SVG'), f(`/brand/logo/${png}`, 'PNG')],
});

export const BRAND_GROUPS: BrandGroup[] = [
  {
    id: 'mark',
    title: 'The goggles',
    intro: 'The mark on its own. Two lenses side by side read as an infinity sign.',
    assets: [
      logoSet('mark-color', 'Color', 'The default. Use on dark backgrounds.', 'dark', 'mark-color-1024.png'),
      logoSet('mark-dark-lens', 'Black lenses', 'For places that need a quiet version, such as an avatar with no player.', 'dark', 'mark-dark-lens-1024.png'),
      logoSet('mark-mono-white', 'One color, white', 'For one-color print and dark photos.', 'dark', 'mark-mono-white-1024.png'),
      logoSet('mark-mono-black', 'One color, black', 'For one-color print and light backgrounds.', 'light', 'mark-mono-black-1024.png'),
    ],
  },
  {
    id: 'logo',
    title: 'Logo with the name',
    intro: 'The goggles with INFINITE LABORATORY. The words are outlined, so the files never depend on a font.',
    assets: [
      logoSet('lockup-on-dark', 'On dark', 'White words.', 'dark', 'lockup-on-dark-2400.png'),
      logoSet('lockup-on-light', 'On light', 'Dark words.', 'light', 'lockup-on-light-2400.png'),
      logoSet('lockup-mono-white', 'One color, white', '', 'dark', 'lockup-mono-white-2400.png'),
      logoSet('lockup-mono-black', 'One color, black', '', 'light', 'lockup-mono-black-2400.png'),
    ],
  },
  {
    id: 'seasonal',
    title: 'Seasonal',
    intro: 'For event periods only. The normal logo stays the default.',
    assets: [
      logoSet('mark-christmas', 'Christmas, mark', 'Reindeer antlers.', 'dark', 'mark-christmas-1024.png'),
      logoSet('lockup-christmas-on-dark', 'Christmas, with the name', 'On dark.', 'dark', 'lockup-christmas-on-dark-2400.png'),
      logoSet('lockup-christmas-on-light', 'Christmas, with the name', 'On light.', 'light', 'lockup-christmas-on-light-2400.png'),
      logoSet('mark-halloween', 'Halloween, mark', 'Pumpkins.', 'dark', 'mark-halloween-1024.png'),
      logoSet('lockup-halloween-on-dark', 'Halloween, with the name', 'On dark.', 'dark', 'lockup-halloween-on-dark-2400.png'),
      logoSet('lockup-halloween-on-light', 'Halloween, with the name', 'On light.', 'light', 'lockup-halloween-on-light-2400.png'),
    ],
  },
  {
    id: 'icons',
    title: 'Icons',
    intro: 'Small sizes, drawn pixel for pixel.',
    assets: [
      { id: 'favicon', title: 'Favicon', note: '16 and 32 px.', preview: '/brand/icons/favicon-32.png', bg: 'checker', files: [f('/brand/icons/favicon.ico', 'ICO'), f('/brand/icons/favicon-32.png', 'PNG 32')] },
      { id: 'server-icon', title: 'Server icon', note: '64 by 64, the size Minecraft uses.', preview: '/brand/icons/server-icon-64.png', bg: 'checker', files: [f('/brand/icons/server-icon-64.png', 'PNG 64')] },
      { id: 'discord-icon', title: 'Discord server icon', note: '512 by 512.', preview: '/brand/discord/server-icon-512.png', bg: 'dark', files: [f('/brand/discord/server-icon-512.png', 'PNG 512'), f('/brand/discord/server-icon-512-transparent.png', 'PNG, transparent')] },
    ],
  },
  {
    id: 'discord',
    title: 'Discord images',
    intro: 'The banner and the invite splash.',
    assets: [
      { id: 'banner', title: 'Banner', note: '960 by 540. The animated version is a 10 second loop and about 1.2 MB, so it is a download only.', preview: '/brand/discord/banner-960x540.png', bg: 'dark',
        files: [f('/brand/discord/banner-960x540.png', 'PNG'), f('/brand/discord/banner-960x540-animated.gif', 'GIF, animated'), f('/brand/discord/transparent/banner-960x540-transparent.png', 'PNG, transparent'), f('/brand/discord/transparent/banner-960x540-animated-transparent.webm', 'WebM, animated, transparent')] },
      { id: 'splash', title: 'Invite splash', note: '1920 by 1080.', preview: '/brand/discord/invite-splash-1920x1080.png', bg: 'dark',
        files: [f('/brand/discord/invite-splash-1920x1080.png', 'PNG'), f('/brand/discord/transparent/invite-splash-1920x1080-transparent.png', 'PNG, transparent')] },
    ],
  },
  {
    id: 'animation',
    title: 'Animated logo',
    intro: 'Short loops for videos, slides and streams. The click loops are three seconds. The reveal plays once, or loops.',
    assets: [
      { id: 'click-lockup', title: 'Click effect, with the name', note: 'Dark background, or transparent for dark or light surfaces.', preview: '/brand/animation/logo-click-loop-lockup-dark-960x540.gif', bg: 'dark',
        files: [f('/brand/animation/logo-click-loop-lockup-dark-1920x1080.mp4', 'MP4'), f('/brand/animation/logo-click-loop-lockup-dark-960x540.gif', 'GIF'), f('/brand/animation/logo-click-loop-lockup-transparent-1920x1080.webm', 'WebM, transparent'), f('/brand/animation/logo-click-loop-lockup-transparent-lightbg-1920x1080.webm', 'WebM, for light'), f('/brand/animation/logo-click-loop-lockup-transparent-960x540.gif', 'GIF, transparent'), f('/brand/animation/logo-click-loop-lockup-transparent-lightbg-960x540.gif', 'GIF, for light')] },
      { id: 'click-mark', title: 'Click effect, goggles only', note: '', preview: '/brand/animation/logo-click-loop-mark-dark-540x540.gif', bg: 'dark',
        files: [f('/brand/animation/logo-click-loop-mark-dark-1080x1080.mp4', 'MP4'), f('/brand/animation/logo-click-loop-mark-dark-540x540.gif', 'GIF'), f('/brand/animation/logo-click-loop-mark-transparent-1080x1080.webm', 'WebM, transparent'), f('/brand/animation/logo-click-loop-mark-transparent-540x540.gif', 'GIF, transparent')] },
      { id: 'reveal-once', title: 'Reveal, plays once', note: 'The goggles pop up, bounce and flash, then slide left as the name appears.', preview: '/brand/animation/logo-reveal-once-dark-960x540.gif', bg: 'dark',
        files: [f('/brand/animation/logo-reveal-once-dark-1920x1080.mp4', 'MP4'), f('/brand/animation/logo-reveal-once-dark-960x540.gif', 'GIF'), f('/brand/animation/logo-reveal-once-transparent-1920x1080.webm', 'WebM, transparent'), f('/brand/animation/logo-reveal-once-transparent-lightbg-1920x1080.webm', 'WebM, for light'), f('/brand/animation/logo-reveal-once-transparent-960x540.gif', 'GIF, transparent'), f('/brand/animation/logo-reveal-once-transparent-lightbg-960x540.gif', 'GIF, for light')] },
      { id: 'reveal-loop', title: 'Reveal, loops', note: 'The same, then it hides and starts again.', preview: '/brand/animation/logo-reveal-loop-dark-960x540.gif', bg: 'dark',
        files: [f('/brand/animation/logo-reveal-loop-dark-1920x1080.mp4', 'MP4'), f('/brand/animation/logo-reveal-loop-dark-960x540.gif', 'GIF'), f('/brand/animation/logo-reveal-loop-transparent-1920x1080.webm', 'WebM, transparent'), f('/brand/animation/logo-reveal-loop-transparent-lightbg-1920x1080.webm', 'WebM, for light'), f('/brand/animation/logo-reveal-loop-transparent-960x540.gif', 'GIF, transparent'), f('/brand/animation/logo-reveal-loop-transparent-lightbg-960x540.gif', 'GIF, for light')] },
    ],
  },
];

export const BRAND_COLORS = [
  { name: 'Page', hex: '#0B0C0E', use: 'Backgrounds' },
  { name: 'Blue', hex: '#7AA7FB', use: 'The top of the gradient' },
  { name: 'Mint', hex: '#9BFBA2', use: 'The bottom of the gradient, live status' },
  { name: 'Text', hex: '#F2F3F5', use: 'Headings and text on dark' },
  { name: 'Frame grey', hex: '#8A919C', use: 'The goggles frame' },
];
export const BRAND_FONTS = [
  { name: 'Geist', use: 'Headlines and body, light weight' },
  { name: 'Geist Mono', use: 'Labels, buttons and tabs, uppercase' },
  { name: 'IBM Plex Sans Thai', use: 'Thai text' },
];

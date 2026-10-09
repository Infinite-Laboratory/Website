// Single place for values that more than one page needs.

/** Canonical origin. Placeholder until the real domain is chosen. */
export const SITE_URL = 'https://example-domain.invalid';

export const SITE_NAME = 'Infinite Laboratory';
export const SITE_DESCRIPTION =
  'A community-driven, cross-platform Minecraft server. Java and Bedrock.';

/** Server address. `null` while Deepslate MC is in development: pages show "Opening soon". */
export const SERVER_ADDRESS: string | null = null;

/** Single Discord invite. Backs every Join Discord button and link. */
export const DISCORD_INVITE = 'https://discord.gg/FQe3Mt6nA';
export const DISCORD_GUILD_ID = '1097120015448277114';

export const SINGULARITYLIB_URL = 'https://github.com/Pinont/SingularityLib';

/** Main nav, in order. `href` is the route path. */
export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Store', href: '/store' },
  { label: 'Vote', href: '/vote' },
  { label: 'Leaderboards', href: '/leaderboards' },
  { label: 'Wiki', href: '/wiki' },
  { label: 'Rules', href: '/rules' },
] as const;

export const AUTH_LINKS = [
  { label: 'Login', href: '/login', primary: false },
  { label: 'Register', href: '/register', primary: true },
] as const;

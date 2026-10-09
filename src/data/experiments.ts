// Every experiment (server) in one list. Only real experiments belong here.
export type Phase = 'development' | 'live' | 'archived';

export interface Experiment {
  id: string;
  /** "EXP-002" */
  tag: string;
  name: string;
  phase: Phase;
  /** Server-list style MOTD lines. Segments: kind picks the color. */
  motd: { text: string; kind: 'blue' | 'mint' | 'dim' | 'fg' | 'sep' }[][];
  /** One or two plain lines under the MOTD (archived rows). */
  description?: string;
  /** Join address. Only set when the server is live. */
  address?: string | null;
  versions: string;
  /** Extra facts shown at the right (archived rows). */
  facts?: string[];
  /** Where the lessons live, for archived experiments. */
  lessonsHref?: string;
  icon: { kind: 'image'; src: string } | { kind: 'pixels'; rows: string[]; palette: Record<string, string> };
}

const live = process.env.LAB_DEEPSLATE_LIVE === '1';

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'deepslate-mc',
    tag: 'EXP-002',
    name: 'Deepslate MC',
    phase: live ? 'live' : 'development',
    motd: [
      [{ text: 'INFINITE', kind: 'blue' }, { text: 'LABORATORY', kind: 'mint' }],
      [{ text: 'Jobs', kind: 'dim' }, { text: '·', kind: 'sep' }, { text: 'Stamina', kind: 'dim' }, { text: '·', kind: 'sep' }, { text: 'Deepslate economy', kind: 'fg' }],
    ],
    address: live ? (process.env.LAB_SERVER_ADDRESS || null) : null,
    versions: 'Java 1.21 · Bedrock',
    icon: { kind: 'image', src: '/assets/server-icon-64.png' },
  },
  {
    id: 'armored-smp',
    tag: 'EXP-001',
    name: 'Armored SMP',
    phase: 'archived',
    motd: [[{ text: 'Survive without armor', kind: 'dim' }]],
    description:
      "Whitelist survival where armor can't be crafted. Every death gave you armor that levelled up from leather, and full netherite meant a 12-hour ban. Our first server. It ran for 3 months, then went offline for good after players left when no admin was around to play with them.",
    versions: 'Java 1.19.4 · Whitelist',
    facts: ['Ran 3 months'],
    lessonsHref: '/wiki/armored-smp-lessons',
    icon: {
      kind: 'pixels',
      rows: ['KKK......KKK', 'KSSK....KSSK', 'KSSSKKKKSSSK', 'KSSSSSSSSSSK', '.KSSSSSSSSK.', '.KSSDSSDSSK.', '.KSSSSSSSSK.', '.KSSSSSSSSK.', '.KSSSSSSSSK.', '.KKKKKKKKKK.'],
      palette: { K: '#2a2d33', S: '#8b9099', D: '#6b7078' },
    },
  },
];

export const legacyExperiments = () => EXPERIMENTS.filter((e) => e.phase === 'archived');
export const currentExperiments = () => EXPERIMENTS.filter((e) => e.phase !== 'archived');

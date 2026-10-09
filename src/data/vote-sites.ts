// Server-list sites where fellows can vote. The list is not decided yet, so it is empty.
// There are no rewards for voting: it helps more fellows find the server.
export interface VoteSite {
  name: string;
  url: string;
  /** Plain text such as "Once every 24 hours". */
  cooldown: string;
}

const override = process.env.LAB_VOTE_SITES; // test hook: JSON array of VoteSite
export const VOTE_SITES: VoteSite[] = override ? JSON.parse(override) : [];

export const SEED_TEAM_IDS = [
  'e52978a9-28ff-438d-87b1-03bee3e5379a', // Easy Method English (EME)
  'db4557fc-0559-4864-a87c-273cc63d3628', // Grow Mart (GM)
  '7f3c9b21-6d84-4e5a-a2f7-91c6b8d4305e', // Easy Method Certificate (EMEC)
];

export const SEED_TEAM_CODES = ['EME', 'GM', 'EMEC'];

/**
 * Sorts an array of teams by the canonical order defined in team seeds:
 * 1. Easy Method English (EME)
 * 2. Grow Mart (GM)
 * 3. Easy Method Certificate (EMEC)
 * Any subsequent custom teams are sorted alphabetically by name.
 */
export function sortTeamsBySeedOrder<T extends { id?: string; code?: string; name?: string }>(
  teams: T[],
): T[] {
  const getIndex = (t: T) => {
    if (t.id) {
      const idx = SEED_TEAM_IDS.indexOf(t.id);
      if (idx !== -1) return idx;
    }
    if (t.code) {
      const idx = SEED_TEAM_CODES.indexOf(t.code.toUpperCase());
      if (idx !== -1) return idx;
    }
    return 9999;
  };

  return [...teams].sort((a, b) => {
    const idxA = getIndex(a);
    const idxB = getIndex(b);
    if (idxA !== idxB) return idxA - idxB;
    return (a.name || '').localeCompare(b.name || '');
  });
}

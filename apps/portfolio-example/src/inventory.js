// "The road so far" inventory (SECTION_EXPERIENCE_DESIGN.md §2, level 4). Walking
// back through the roles (newest first), the kit unpacks: at role i you hold every
// tag from role i and older, each counted by how many of those roles used it.

/**
 * @param {{ tags: string[] }[]} roles  newest first
 * @param {number} i  index of the current role
 * @returns {{ tag: string, count: number }[]}  most used first, then A–Z
 */
export function inventoryAt(roles, i) {
  const counts = new Map();
  for (const r of roles.slice(Math.max(0, i))) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

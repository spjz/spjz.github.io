// Pure helpers behind the section experiences (docs/SECTION_EXPERIENCE_DESIGN.md).
import { describe, expect, it } from 'vitest';
import { hintFor, profile } from '../apps/portfolio-example/src/content/profile.js';
import { inventoryAt } from '../apps/portfolio-example/src/inventory.js';
import { ICONS, initialsArt } from '../apps/portfolio-example/src/pixel.jsx';

describe('inventoryAt', () => {
  const roles = [{ tags: ['React', 'MySQL'] }, { tags: ['PHP', 'MySQL'] }, { tags: ['PHP', 'MySQL', 'Jira'] }];

  it('holds everything at the newest role, counting repeats', () => {
    expect(inventoryAt(roles, 0)).toEqual([
      { tag: 'MySQL', count: 3 },
      { tag: 'PHP', count: 2 },
      { tag: 'Jira', count: 1 },
      { tag: 'React', count: 1 },
    ]);
  });

  it('unpacks walking back: only tags from that role and older', () => {
    expect(inventoryAt(roles, 2).map((x) => x.tag)).toEqual(['Jira', 'MySQL', 'PHP']);
  });

  it('shrinks monotonically across the real experience', () => {
    const sizes = profile.experience.map((_, i) => inventoryAt(profile.experience, i).length);
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1]);
    expect(inventoryAt(profile.experience, sizes.length - 1).map((x) => x.tag).sort()).toEqual([...profile.experience.at(-1).tags].sort());
  });
});

describe('pixel art', () => {
  it('draws a 20×20 initials portrait', () => {
    const art = initialsArt('JD');
    expect(art).toHaveLength(20);
    for (const row of art) expect(row).toHaveLength(20);
    expect(art.join('')).toMatch(/Y/); // second initial in gold
  });

  it('has an 8×8 icon for every inventory item', () => {
    for (const item of profile.about.inventory) {
      expect(ICONS[item.id], item.id).toBeTruthy();
      expect(ICONS[item.id]).toHaveLength(8);
      for (const row of ICONS[item.id]) expect(row.length, item.id).toBe(8);
    }
  });
});

describe('levels and prompts', () => {
  it('names a level for every section, in page order', () => {
    expect(profile.levels.map((l) => l.id)).toEqual(['hero', 'about', 'work', 'experience', 'skills', 'contact']);
  });

  it('turns the hero hint into a counting game prompt', () => {
    expect(hintFor(profile.hero.prompts, 0)).toBe('▶ PRESS DRAGON');
    expect(hintFor(profile.hero.prompts, 1)).toBe('Again?');
    expect(hintFor(profile.hero.prompts, 3)).toBe('Exploded 3 times. It’s fine. It’s fine.');
  });

  it('offers in-page play only for games with a live build', () => {
    for (const p of profile.work.personal.filter((x) => x.embed)) {
      expect(p.links.find((l) => l.label === 'Play')?.href).toBe(p.embed);
    }
  });
});

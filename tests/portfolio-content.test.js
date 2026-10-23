// Portfolio copy (apps/portfolio-example/src/content/profile.js) against the
// decisions in docs/PORTFOLIO_CONTENT.md §4 and §6.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { assembleEmail, profile } from '../apps/portfolio-example/src/content/profile.js';

const EMAIL = ['papaver', 'josepherum', '@', 'gmail.com'].join(''); // never written whole, even here
const source = readFileSync(new URL('../apps/portfolio-example/src/content/profile.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../apps/portfolio-example/index.html', import.meta.url), 'utf8');

describe('email', () => {
  it('assembles the right address', () => {
    expect(assembleEmail(profile.contact.email)).toBe(EMAIL);
  });

  it('never appears whole in the source or the HTML (incl. JSON-LD)', () => {
    for (const text of [source, html]) {
      expect(text).not.toContain(EMAIL);
      expect(text).not.toContain(EMAIL.split('@')[0]);
    }
  });

  it('no phone number anywhere', () => {
    for (const text of [source, html]) expect(text).not.toMatch(/7762|\+44/);
  });
});

describe('decisions', () => {
  const all = JSON.stringify(profile);

  it('names the employer Tapp, never PayTapp or the legal name', () => {
    expect(profile.experience[0].company).toBe('Tapp');
    expect(profile.work.professional[0].title).toBe('Tapp Cloud');
    // The brand is never "PayTapp" (case-sensitive: the paytapp.co domain is fine).
    expect(all).not.toMatch(/PayTapp|Paytapp/);
    expect(all).not.toMatch(/Thrive Technology/i);
    expect(all).toMatch(/payments platform/);
  });

  it('links the agreed sites', () => {
    const hrefs = [
      ...profile.experience.map((r) => r.href),
      ...[...profile.work.professional, ...profile.work.personal].flatMap((p) => p.links.map((l) => l.href)),
      ...profile.contact.links.map((l) => l.href),
      ...profile.work.elsewhere.map((l) => l.href),
    ].filter(Boolean);
    for (const site of ['https://paytapp.co', 'https://mindworks.co.uk', 'https://www.monicavinader.com/', 'https://keepthinking.it', 'https://github.com/spjz', 'https://myanimelist.net/animelist/sPJz', 'https://www.last.fm/user/Bjehsus/']) {
      expect(hrefs, site).toContain(site);
    }
    for (const h of hrefs) expect(() => new URL(h), h).not.toThrow();
  });

  it('does not showcase the discontinued MindWorks CMS/framework', () => {
    const mindworks = profile.experience.find((r) => r.company.startsWith('MindWorks'));
    expect(mindworks.bullets.join(' ')).not.toMatch(/framework|proprietary|CMS/i);
  });

  it('showcases recent public GitHub projects with live and source links', () => {
    for (const id of ['voxel-dragon', 'henhouse-panic', 'splitter-cell']) {
      const p = profile.work.personal.find((x) => x.id === id);
      expect(p, id).toBeTruthy();
      expect(p.links.map((l) => l.label)).toEqual(['Play', 'Source']);
    }
  });

  it('starts with a photo placeholder', () => {
    expect(profile.about.photo).toBeNull();
  });
});

describe('experience data', () => {
  it('is newest first with valid YYYY-MM dates and only the current role open-ended', () => {
    const starts = profile.experience.map((r) => r.start);
    expect([...starts].sort().reverse()).toEqual(starts);
    for (const r of profile.experience) {
      expect(r.start).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      if (r.end) expect(r.end >= r.start, r.company).toBe(true);
    }
    expect(profile.experience.filter((r) => r.end === null)).toHaveLength(1);
  });

  it('uses British spelling', () => {
    expect(JSON.stringify(profile)).not.toMatch(/\bjewelry\b|\borganization\b|\bcolor\b/);
  });
});

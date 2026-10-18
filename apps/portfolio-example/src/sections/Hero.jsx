import { hintFor } from '../content/profile.js';

/** Level 1, "Spawn": the name types in; the hint is a game prompt that counts explosions. */
export function Hero({ hero, level, seen, explosions }) {
  return (
    <section id="hero" aria-labelledby="hero-title" data-seen={seen ? '' : undefined}>
      <p className="hud">Level 1 · {level}</p>
      <h1 id="hero-title">
        <span className="typed" style={{ '--chars': hero.name.length }}>{hero.name}</span>
        <span className="role">{hero.role}</span>
      </h1>
      <p className="tagline">{hero.tagline}</p>
      <p className="intro">{hero.intro}</p>
      <div className="ctas">
        <a className="button primary" href="#work">See my work</a>
        <a className="button" href="#contact">Get in touch</a>
      </div>
      <p className="hint" aria-live="polite">
        <span className={explosions ? 'prompt' : 'prompt blink'}>{hintFor(hero.prompts, explosions)}</span>
        {!explosions && <span className="aside"> {hero.hint}</span>}
      </p>
    </section>
  );
}

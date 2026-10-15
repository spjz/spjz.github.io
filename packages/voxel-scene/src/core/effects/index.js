import { registerEffect } from './EffectStack.js';
import { ColourEffect } from './ColourEffect.js';
import { ScaleEffect } from './ScaleEffect.js';
import { WaveTranslateEffect } from './WaveTranslateEffect.js';
import { JitterEffect } from './JitterEffect.js';
import { ExplodeEffect } from './ExplodeEffect.js';
import { PartRotateEffect } from './PartRotateEffect.js';
import { BlinkEffect } from './BlinkEffect.js';
import { BobEffect } from './BobEffect.js';

registerEffect(
  ColourEffect, ScaleEffect, WaveTranslateEffect, JitterEffect,
  ExplodeEffect, PartRotateEffect, BlinkEffect, BobEffect,
);

export { EffectStack, registerEffect, effectTypes, getEffectClass } from './EffectStack.js';
export { Effect, defineEffect } from './Effect.js';
export {
  ColourEffect, ScaleEffect, WaveTranslateEffect, JitterEffect,
  ExplodeEffect, PartRotateEffect, BlinkEffect, BobEffect,
};

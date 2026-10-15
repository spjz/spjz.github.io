'use client';
import { useLayoutEffect, useMemo } from 'react';
import { EffectStack } from '../../core/effects/index.js';
import { reconcileStack } from '../../core/reconcile.js';

/**
 * effects prop → a stable EffectStack, diffed by id on every render
 * (REACT_DESIGN.md §5.2). A new model (subject change) gets a fresh stack.
 *
 * @param {import('../../core/model/VoxelModel.js').VoxelModel} model
 * @param {import('../../core/effects/Effect.js').EffectSpec[]} specs
 * @param {Partial<import('../../core/Envelope.js').EnvelopeSpec> | undefined} envelopeDefaults
 * @param {(stats: ReturnType<typeof reconcileStack>) => void} [onChange]
 */
export function useEffectStack(model, specs, envelopeDefaults, onChange) {
  const stack = useMemo(() => new EffectStack(model), [model]);
  // Runs after every render: inline arrays are expected, and diffing is cheap.
  useLayoutEffect(() => {
    const stats = reconcileStack(stack, specs, { envelope: envelopeDefaults });
    onChange?.(stats);
  });
  return stack;
}

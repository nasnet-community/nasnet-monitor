import { describe, expect, it } from 'vitest'

import { classifyDishModel, DISH_MODEL_SPECS } from './dishModels'
import { productName } from './starlink'

describe('classifyDishModel', () => {
  it('classifies round Gen 1 dishes', () => {
    expect(classifyDishModel('rev1_pre_production')).toBe('round_gen1')
    expect(classifyDishModel('rev1_production')).toBe('round_gen1')
    expect(classifyDishModel('rev1_proto3')).toBe('round_gen1')
  })

  it('classifies rev2/rev3 as the standard actuated dish', () => {
    expect(classifyDishModel('rev2_proto3')).toBe('standard_actuated')
    expect(classifyDishModel('rev3_proto2')).toBe('standard_actuated')
    expect(classifyDishModel('rev3_prod')).toBe('standard_actuated')
  })

  it('classifies rev4 as the Gen 3 standard dish', () => {
    expect(classifyDishModel('rev4_prod1')).toBe('standard_gen3')
    expect(classifyDishModel('rev4_proto3')).toBe('standard_gen3')
    // unseen future batch suffixes still classify by prefix
    expect(classifyDishModel('rev4_prod9')).toBe('standard_gen3')
  })

  it('splits hp1 into actuated vs flat via hasActuators', () => {
    expect(classifyDishModel('hp1_proto1', 1)).toBe('high_performance')
    expect(classifyDishModel('hp1_proto1', 'HAS_ACTUATORS_YES')).toBe('high_performance')
    expect(classifyDishModel('hp1_proto1', 2)).toBe('flat_high_performance')
    expect(classifyDishModel('hp1_proto1', 'HAS_ACTUATORS_NO')).toBe('flat_high_performance')
    expect(classifyDishModel('hp1_proto1')).toBe('flat_high_performance')
    expect(classifyDishModel('hp_flat')).toBe('flat_high_performance')
  })

  it('classifies Mini variants', () => {
    expect(classifyDishModel('mini1_prod2')).toBe('mini')
    expect(classifyDishModel('mini1_proto0')).toBe('mini')
    expect(classifyDishModel('rev_mini_prod1')).toBe('mini')
  })

  it('falls back to unknown for missing or unrecognised strings', () => {
    expect(classifyDishModel(undefined)).toBe('unknown')
    expect(classifyDishModel('')).toBe('unknown')
    expect(classifyDishModel('v2')).toBe('unknown') // router hardware
    expect(classifyDishModel('rev_never_gonna_give_you_up')).toBe('unknown')
  })

  it('is case-insensitive', () => {
    expect(classifyDishModel('REV4_PROD2')).toBe('standard_gen3')
  })
})

describe('DISH_MODEL_SPECS', () => {
  it('has a spec for every model with sane geometry', () => {
    for (const spec of Object.values(DISH_MODEL_SPECS)) {
      expect(spec.panel.w).toBeGreaterThan(0)
      expect(spec.panel.h).toBeGreaterThan(0)
      expect(spec.slab.w).toBeGreaterThan(0)
      expect(spec.slab.h).toBeGreaterThan(0)
      expect(spec.fovDeg).toBeGreaterThanOrEqual(100)
      expect(spec.fovDeg).toBeLessThanOrEqual(140)
    }
  })

  it('gives the high-performance dishes their wider field of view', () => {
    expect(DISH_MODEL_SPECS.high_performance.fovDeg).toBe(140)
    expect(DISH_MODEL_SPECS.flat_high_performance.fovDeg).toBe(140)
    expect(DISH_MODEL_SPECS.standard_gen3.fovDeg).toBe(110)
    expect(DISH_MODEL_SPECS.mini.fovDeg).toBe(110)
  })

  it('only the round Gen 1 renders as a circle', () => {
    const round = Object.values(DISH_MODEL_SPECS).filter((s) => s.round)
    expect(round.map((s) => s.model)).toEqual(['round_gen1'])
  })
})

describe('productName', () => {
  it('names known models from the hardware version', () => {
    expect(productName({ deviceInfo: { hardwareVersion: 'mini1_prod2' } })).toBe('Starlink Mini')
    expect(productName({ deviceInfo: { hardwareVersion: 'rev4_prod1' } })).toBe('Starlink Standard')
    expect(productName({ deviceInfo: { hardwareVersion: 'rev3_proto2' } })).toBe(
      'Starlink Standard Actuated'
    )
    expect(
      productName({ deviceInfo: { hardwareVersion: 'hp1_proto1' }, hasActuators: 1 })
    ).toBe('Starlink High Performance')
  })

  it('keeps generic fallbacks', () => {
    expect(productName({ deviceInfo: { hardwareVersion: 'something_new' } })).toBe('Starlink')
    expect(productName(null)).toBe('Starlink router')
  })
})

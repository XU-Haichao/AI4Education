import buildSolarSystem from './solar/index.js';
import buildAlphaCentauriSystem from './alpha-centauri/index.js';
import buildProximaCentauriSystem from './proxima-centauri/index.js';
import buildSiriusSystem from './sirius/index.js';
import buildTrappistSystem from './trappist-1/index.js';
import buildCygniSystem from './cygni/index.js';

export const systemBuilders = [
  buildSolarSystem,
  buildAlphaCentauriSystem,
  buildProximaCentauriSystem,
  buildSiriusSystem,
  buildTrappistSystem,
  buildCygniSystem
];


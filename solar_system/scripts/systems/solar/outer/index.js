import buildJupiter from './jupiter.js';
import buildIo from './io.js';
import buildEuropa from './europa.js';
import buildGanymede from './ganymede.js';
import buildCallisto from './callisto.js';
import buildSaturn from './saturn.js';
import buildEnceladus from './enceladus.js';
import buildTitan from './titan.js';
import buildUranus from './uranus.js';
import buildNeptune from './neptune.js';
import buildKuiperBelt from './kuiper-belt.js';
import buildPluto from './pluto.js';
import buildEris from './eris.js';
import buildOortCloud from './oort-cloud.js';
import buildHalley from './halley.js';
import buildHaleBopp from './hale-bopp.js';

export default function buildSolarOuterSystem(ctx) {
  buildJupiter(ctx);
  buildIo(ctx);
  buildEuropa(ctx);
  buildGanymede(ctx);
  buildCallisto(ctx);
  buildSaturn(ctx);
  buildEnceladus(ctx);
  buildTitan(ctx);
  buildUranus(ctx);
  buildNeptune(ctx);
  buildKuiperBelt(ctx);
  buildPluto(ctx);
  buildEris(ctx);
  buildOortCloud(ctx);
  buildHalley(ctx);
  buildHaleBopp(ctx);
}


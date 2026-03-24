import buildSun from './sun.js';
import buildMercury from './mercury.js';
import buildVenus from './venus.js';
import buildEarth from './earth.js';
import buildMoon from './moon.js';
import buildMars from './mars.js';
import buildPhobos from './phobos.js';
import buildDeimos from './deimos.js';
import buildAsteroidBelt from './asteroid-belt.js';
import buildCeres from './ceres.js';
import buildVesta from './vesta.js';

export default function buildSolarInnerSystem(ctx) {
  buildSun(ctx);
  buildMercury(ctx);
  buildVenus(ctx);
  buildEarth(ctx);
  buildMoon(ctx);
  buildMars(ctx);
  buildPhobos(ctx);
  buildDeimos(ctx);
  buildAsteroidBelt(ctx);
  buildCeres(ctx);
  buildVesta(ctx);
}


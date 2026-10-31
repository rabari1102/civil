// Small turntable inside an industry hero; the poster render shows until it is live.
import { turntable } from './viewer.js';

export default function mini(el) {
  const poster = el.querySelector('.x-3d__poster')?.src;
  turntable(el, el.dataset.xModel, { poster, onLive: () => el.classList.add('is-live') });
}

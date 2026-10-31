// Full-bleed hero model behind the page title.
import { turntable } from './viewer.js';

export default function cover(el) {
  turntable(el, el.dataset.model, { offsetX: 0.75, interactive: true, label: 'Building the 3D model' });
}

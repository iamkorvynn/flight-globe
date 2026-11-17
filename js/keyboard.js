// FlightGlobe — keyboard navigation: arrows rotate, +/- zoom, space plays/pauses.
// Pure logic over a small camera object so it is unit-testable without a DOM.
import { clamp } from './math.js';

export const ROTATE_STEP_DEG = 10;
export const ZOOM_IN_FACTOR = 1.15;
export const ZOOM_OUT_FACTOR = 1 / 1.15;

/**
 * Apply one keypress to the camera. Returns true if the key was handled.
 * camera: { centerLat, centerLon, zoom }. Mutated in place.
 */
export function applyKey(camera, key) {
  switch (key) {
    case 'ArrowLeft':
      camera.centerLon = ((camera.centerLon - ROTATE_STEP_DEG + 540) % 360) - 180;
      return true;
    case 'ArrowRight':
      camera.centerLon = ((camera.centerLon + ROTATE_STEP_DEG + 540) % 360) - 180;
      return true;
    case 'ArrowUp':
      camera.centerLat = clamp(camera.centerLat + ROTATE_STEP_DEG, -85, 85);
      return true;
    case 'ArrowDown':
      camera.centerLat = clamp(camera.centerLat - ROTATE_STEP_DEG, -85, 85);
      return true;
    case '+':
    case '=':
      camera.zoom = clamp(camera.zoom * ZOOM_IN_FACTOR, 0.6, 3);
      return true;
    case '-':
    case '_':
      camera.zoom = clamp(camera.zoom * ZOOM_OUT_FACTOR, 0.6, 3);
      return true;
    default:
      return false;
  }
}

/** Keys the globe handles (used to skip handling when typing in an input). */
export function isGlobeKey(key) {
  return ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(key);
}

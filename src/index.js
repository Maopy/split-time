import Detector from './detector'

/**
 * Returns a promise that resolves to the split time metrics
 * (in milliseconds) or null if the browser doesn't support the features
 * required for detection.
 * @param {!DetectorInit=} opts Configuration options for the polyfill
 * @return {!Promise}
 */
export const getMetrics = (opts = {}) => {
  const detector = new Detector(opts)
  return detector
}

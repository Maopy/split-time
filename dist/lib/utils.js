"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ifSupported = 'PerformanceObserver' in self && typeof PerformanceObserver === 'function';
exports.totalEntryTypes = [
    'element',
    'first-input',
    'frame',
    'largest-contentful-paint',
    'layout-shift',
    'longtask',
    'mark',
    'measure',
    'navigation',
    'paint',
    'resource',
    'server'
];
//# sourceMappingURL=utils.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const performance_observer_1 = require("./performance-observer");
const ifImplemented = 'PerformanceObserver' in self && typeof PerformanceObserver === 'function';
exports.default = ifImplemented ? PerformanceObserver : performance_observer_1.default;
//# sourceMappingURL=index.js.map
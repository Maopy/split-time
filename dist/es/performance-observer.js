import PerformanceObserverTaskQueue from './task-queue';
import EntryList from './entry-list';
const totalEntryTypes = [
    "element",
    "first-input",
    "largest-contentful-paint",
    "layout-shift",
    "longtask",
    "mark",
    "measure",
    "navigation",
    "paint",
    "resource"
];
class SplitTime {
    constructor(callback) {
        this.entryTypes = [];
        // 检测当前浏览器能力
        this.callback = callback;
        this.buffer = new Set();
        this.taskQueue = new PerformanceObserverTaskQueue();
    }
    observe(options) {
        this.entryTypes = options.entryTypes;
        this.taskQueue.add(this);
    }
    disconnect() {
        this.taskQueue.remove(this);
    }
    takeRecords() {
        const entries = Array.from(this.buffer);
        return new EntryList(entries);
    }
}
SplitTime.supportedEntryTypes = [];
export default SplitTime;
//# sourceMappingURL=performance-observer.js.map
import TaskQueue from './task-queue';
import EntryList from './entry-list';
import { ifSupported } from './utils';
import { observe as PaintObserve } from './timing/paint';
import { observe as LCPObserve } from './timing/largest-contentful-paint';
const globalTaskQueue = new TaskQueue();
class SplitTime {
    constructor(callback) {
        this.entryTypes = [];
        this.unsupportedEntryTypes = [];
        this.callback = callback;
        this.buffer = new Set();
        this.taskQueue = globalTaskQueue;
        this.useNative = false;
    }
    observe(options) {
        // TODO: 参数校验
        // TODO: 支持 entryTypes & type
        // TODO: 支持 bufferd
        const { entryTypes } = options;
        let supportedOptionsEntryTypes = [];
        this.entryTypes = entryTypes;
        this.unsupportedEntryTypes = entryTypes;
        if (ifSupported) {
            const { supportedEntryTypes } = PerformanceObserver;
            const supportedEntryTypesSet = new Set(supportedEntryTypes);
            supportedOptionsEntryTypes = entryTypes.filter((entryType) => supportedEntryTypesSet.has(entryType));
            this.unsupportedEntryTypes = entryTypes.filter((entryType) => !supportedEntryTypesSet.has(entryType));
            if (supportedOptionsEntryTypes.length) {
                this.useNative = true;
                new PerformanceObserver((list, observer) => {
                    this.processEntries(list);
                })
                    .observe({ entryTypes: supportedOptionsEntryTypes });
            }
        }
        if (this.unsupportedEntryTypes.length) {
            this.unsupportedEntryTypes.forEach((entryType) => {
                switch (entryType) {
                    case 'paint':
                        PaintObserve()
                            .then((entries) => {
                            this.taskQueue.performanceEntries = new Set([...this.taskQueue.performanceEntries, ...entries]);
                        });
                        break;
                    case 'largest-contentful-paint':
                        LCPObserve()
                            .then((entries) => {
                            this.taskQueue.performanceEntries = new Set([...this.taskQueue.performanceEntries, ...entries]);
                        });
                }
            });
            this.taskQueue.add(this);
        }
    }
    disconnect() {
        this.taskQueue.remove(this);
    }
    takeRecords() {
        const entries = Array.from(this.buffer);
        return new EntryList(entries);
    }
    processEntries(list) {
        this.useNative = true;
        const entries = Array.from(this.buffer);
        const nativeEntries = (list && list.getEntries()) || [];
        // Combine entries from native & SplitTime
        const entryList = new EntryList([...entries, ...nativeEntries]);
        this.buffer.clear();
        this.callback(entryList, this);
        // if native callback isn't called for a long time & buffer is still not empty, call split-time process method
        self.setTimeout(() => {
            this.useNative = false;
        }, 1000);
    }
}
SplitTime.supportedEntryTypes = [];
export default SplitTime;
//# sourceMappingURL=observer.js.map
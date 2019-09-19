import TaskQueue from './task-queue';
import EntryList from './entry-list';
import { ifSupported } from './utils';
const globalTaskQueue = new TaskQueue(); // 是否可以写成 static?
class SplitTime {
    constructor(callback) {
        this.entryTypes = [];
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
        let unsupportedOptionsEntryTypes = entryTypes;
        if (ifSupported) {
            const { supportedEntryTypes } = PerformanceObserver;
            const supportedEntryTypesSet = new Set(supportedEntryTypes);
            supportedOptionsEntryTypes = entryTypes.filter((entryType) => supportedEntryTypesSet.has(entryType));
            unsupportedOptionsEntryTypes = entryTypes.filter((entryType) => !supportedEntryTypesSet.has(entryType));
            if (supportedOptionsEntryTypes.length) {
                this.useNative = true;
                new PerformanceObserver((list, observer) => {
                    this.processEntries(list);
                })
                    .observe({ entryTypes: supportedOptionsEntryTypes });
            }
        }
        if (unsupportedOptionsEntryTypes.length) {
            this.entryTypes = unsupportedOptionsEntryTypes;
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
        const entries = Array.from(this.buffer);
        const nativeEntries = (list && list.getEntries()) || [];
        // Combine entries from native & SplitTime
        const entryList = new EntryList([...entries, ...nativeEntries]);
        this.buffer.clear();
        this.callback(entryList, this);
    }
}
SplitTime.supportedEntryTypes = [];
export default SplitTime;
//# sourceMappingURL=observer.js.map
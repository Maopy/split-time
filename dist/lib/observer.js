"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const task_queue_1 = require("./task-queue");
const entry_list_1 = require("./entry-list");
const utils_1 = require("./utils");
const paint_1 = require("./timing/paint");
const largest_contentful_paint_1 = require("./timing/largest-contentful-paint");
const globalTaskQueue = new task_queue_1.default();
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
        if (utils_1.ifSupported) {
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
                        paint_1.observe()
                            .then((entries) => {
                            this.taskQueue.performanceEntries = new Set([...this.taskQueue.performanceEntries, ...entries]);
                        });
                        break;
                    case 'largest-contentful-paint':
                        largest_contentful_paint_1.observe()
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
        return new entry_list_1.default(entries);
    }
    processEntries(list) {
        this.useNative = true;
        const entries = Array.from(this.buffer);
        const nativeEntries = (list && list.getEntries()) || [];
        // Combine entries from native & SplitTime
        const entryList = new entry_list_1.default([...entries, ...nativeEntries]);
        this.buffer.clear();
        this.callback(entryList, this);
        // if native callback isn't called for a long time & buffer is still not empty, call split-time process method
        self.setTimeout(() => {
            this.useNative = false;
        }, 1000);
    }
}
SplitTime.supportedEntryTypes = [];
exports.default = SplitTime;
//# sourceMappingURL=observer.js.map
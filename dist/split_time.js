(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.SplitTime = {}));
}(this, (function (exports) { 'use strict';

    class EntryList extends Array {
        constructor(entries) {
            super(...entries);
            this._entries = entries;
        }
        getEntries() {
            return this._entries;
        }
        getEntriesByType(type) {
            return this._entries.filter((e) => e.entryType === type);
        }
        getEntriesByName(name, type) {
            return this._entries
                .filter((e) => e.name === name)
                .filter((e) => (type ? e.entryType === type : true));
        }
    }
    //# sourceMappingURL=entry-list.js.map

    const INTERVAL = 100;
    class TaskQueue {
        constructor(registeredObservers, processedEntries) {
            this.registeredObservers = registeredObservers || new Set();
            this.processedEntries = processedEntries || new Set();
            this.performanceEntries = new Set();
            this.timerId = null;
        }
        add(observer) {
            this.registeredObservers.add(observer);
            if (this.registeredObservers.size === 1) {
                this.observe();
            }
        }
        remove(observer) {
            this.registeredObservers.delete(observer);
            if (!this.registeredObservers.size) {
                this.disconnect();
            }
        }
        disconnect() {
            self.clearInterval(this.timerId);
            this.timerId = null;
        }
        // call callbacks function when CPU idle
        idleCallback() {
        }
        // Polling
        observe() {
            this.timerId = self.setInterval(this.processEntries.bind(this), INTERVAL);
        }
        processEntries() {
            const entries = this.getNewEntries();
            entries.forEach((entry) => {
                const { entryType } = entry;
                const observers = this.getObserversForType(this.registeredObservers, entryType);
                // Add the entry to observer buffer
                observers.forEach((observer) => {
                    observer.buffer.add(entry);
                });
                // Mark the entry as processed
                this.processedEntries.add(entry);
            });
            // Queue task to process all observer buffers
            const task = () => this.registeredObservers.forEach(this.processBuffer);
            if ('requestAnimationFrame' in self) {
                self.requestAnimationFrame(task);
            }
            else {
                self.setTimeout(task, 0);
            }
        }
        processBuffer(observer) {
            // if use native observer, call callback function when native observers call
            if (observer.useNative)
                return;
            const entries = Array.from(observer.buffer);
            const entryList = new EntryList(entries);
            observer.buffer.clear();
            if (entries.length && observer.callback) {
                observer.callback.call(undefined, entryList, observer);
            }
        }
        getNewEntries() {
            const entries = self.performance.getEntries();
            const totalEntries = [...entries, ...this.performanceEntries];
            return totalEntries.filter((entry) => !this.processedEntries.has(entry));
        }
        getObserversForType(observers, type) {
            return Array.from(observers)
                .filter((observer) => observer.unsupportedEntryTypes.some((t) => t === type));
        }
    }

    const ifSupported = 'PerformanceObserver' in self && typeof PerformanceObserver === 'function';
    //# sourceMappingURL=utils.js.map

    const observe = () => {
        const INTERVAL = 100;
        let pollingTimerId = null;
        return new Promise((resolve, reject) => {
            pollingTimerId = self.setInterval(() => {
                const { timing } = self.performance;
                const { domContentLoadedEventStart, domContentLoadedEventEnd, navigationStart } = timing;
                if (domContentLoadedEventStart && domContentLoadedEventEnd && navigationStart) {
                    self.clearInterval(pollingTimerId);
                    resolve([
                        new PerformancePaintTiming('first-paint', domContentLoadedEventStart - navigationStart),
                        new PerformancePaintTiming('first-contentful-paint', domContentLoadedEventEnd - navigationStart)
                    ]);
                }
            }, INTERVAL);
        });
    };
    class PerformancePaintTiming {
        constructor(name, startTime) {
            this.duration = 0;
            this.entryType = 'paint';
            this.name = name;
            this.startTime = startTime;
        }
        toJSON() {
            return JSON.stringify(this);
        }
    }
    //# sourceMappingURL=paint.js.map

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
                            observe()
                                .then((entries) => {
                                this.taskQueue.performanceEntries = new Set([...this.taskQueue.performanceEntries, ...entries]);
                            });
                            break;
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
    //# sourceMappingURL=observer.js.map

    //# sourceMappingURL=index.js.map

    exports.default = SplitTime;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=split_time.js.map

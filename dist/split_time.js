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
            // TODO: wait for CPU idle
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
    //# sourceMappingURL=task-queue.js.map

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

    const MutationObserver = self.MutationObserver || self.WebKitMutationObserver;
    const TAG_WEIGHT_MAP = {
        SVG: 2,
        IMG: 2,
        CANVAS: 4,
        OBJECT: 4,
        EMBED: 4,
        VIDEO: 4
    };
    const WW = self.innerWidth;
    const WH = self.innerHeight;
    function getStyle(element, att) {
        return self.getComputedStyle(element)[att];
    }
    const observe$1 = () => {
        const endpoints = [];
        const mp = {};
        let options = {};
        let LCPResolver = null;
        let mutationCount = 0;
        let scheduleTimerTasks = false;
        let isChecking = false;
        let timerId = null;
        const mutationObserver = new MutationObserver((mutations) => {
            getSnapshot();
        });
        mutationObserver.observe(document, { childList: true, subtree: true });
        function getSnapshot() {
            const { navigationStart } = self.performance.timing;
            const timestamp = Date.now() - navigationStart;
            setMutationRecord(document, mutationCount++);
            endpoints.push({ timestamp });
        }
        function setMutationRecord(target, mutationCount) {
            const tagName = target.tagName;
            const IGNORE_TAG_SET = new Set(['META', 'LINK', 'STYLE', 'SCRIPT', 'NOSCRIPT']);
            if (!IGNORE_TAG_SET.has(tagName) && target.children) {
                for (let child = target.children, i = target.children.length - 1; i >= 0; i--) {
                    if (child[i].getAttribute('mr_c') === null) {
                        child[i].setAttribute('mr_c', mutationCount);
                    }
                    setMutationRecord(child[i], mutationCount);
                }
            }
        }
        function ifRipe(start) {
            const LIMIT = 1000;
            const ti = Date.now() - start;
            return ti > LIMIT || ti - (endpoints[endpoints.length - 1].timestamp) > 1000;
        }
        function rescheduleTimer() {
            const { navigationStart } = self.performance.timing;
            const DELAY = 500;
            if (!scheduleTimerTasks)
                return;
            if (!isChecking && ifRipe(navigationStart)) {
                checkLCP();
            }
            else {
                clearTimeout(timerId);
                timerId = setTimeout(() => {
                    rescheduleTimer();
                }, DELAY);
            }
        }
        function checkLCP() {
            isChecking = true;
            let res = deepTraversal(document.body);
            let tp;
            res.dpss.forEach(item => {
                if (tp && tp.st) {
                    if (tp.st < item.st) {
                        tp = item;
                    }
                }
                else {
                    tp = item;
                }
            });
            initResourceMap();
            let resultSet = filterTheResultSet(tp.els);
            let LCPOptions = calResult(resultSet);
            LCPResolver([new LargestContentfulPaint(LCPOptions)]);
            disable();
        }
        function deepTraversal(node) {
            if (node) {
                let dpss = [];
                for (let i = 0, child; (child = node.children[i]); i++) {
                    let s = deepTraversal(child);
                    if (s.st) {
                        dpss.push(s);
                    }
                }
                return calScore(node, dpss);
            }
            return {};
        }
        function calScore(node, dpss) {
            let { width, height, left, top, bottom, right } = node.getBoundingClientRect();
            let f = 1;
            if (WH < top || WW < left) {
                // 不在可视viewport中
                f = 0;
            }
            let sdp = 0;
            dpss.forEach(item => {
                sdp += item.st;
            });
            let weight = TAG_WEIGHT_MAP[node.tagName] || 1;
            if (weight === 1 &&
                getStyle(node, 'background-image') &&
                getStyle(node, 'background-image') !== 'initial' &&
                getStyle(node, 'background-image') !== 'none') {
                weight = TAG_WEIGHT_MAP['IMG']; // 将有图片背景的普通元素 权重设置为img
            }
            let st = width * height * weight * f;
            let els = [{ node, st, weight }];
            let areaPercent = calAreaPercent(node);
            if (sdp > st * areaPercent || areaPercent === 0) {
                st = sdp;
                els = [];
                dpss.forEach(item => {
                    els = els.concat(item.els);
                });
            }
            return {
                dpss,
                st,
                els
            };
        }
        function calAreaPercent(node) {
            let { left, right, top, bottom, width, height } = node.getBoundingClientRect();
            let wl = 0;
            let wt = 0;
            let wr = WW;
            let wb = WH;
            let overlapX = right - left + (wr - wl) - (Math.max(right, wr) - Math.min(left, wl));
            if (overlapX <= 0) {
                // x 轴无交点
                return 0;
            }
            let overlapY = bottom - top + (wb - wt) - (Math.max(bottom, wb) - Math.min(top, wt));
            if (overlapY <= 0) {
                return 0;
            }
            return (overlapX * overlapY) / (width * height);
        }
        function initResourceMap() {
            self.performance.getEntries().forEach((item) => {
                mp[item.name] = item.responseEnd;
            });
        }
        function filterTheResultSet(els) {
            let sum = 0;
            els.forEach(item => {
                sum += item.st;
            });
            let avg = sum / els.length;
            return els.filter(item => {
                return item.st >= avg;
            });
        }
        function calResult(resultSet) {
            let result = null;
            let rt = 0;
            resultSet.forEach(item => {
                let t = 0;
                if (item.weight === 1) {
                    let index = +item.node.getAttribute('mr_c') - 1;
                    t = endpoints[index].timestamp;
                }
                else if (item.weight === 2) {
                    if (item.node.tagName === 'IMG') {
                        t = mp[item.node.src];
                    }
                    else if (item.node.tagName === 'SVG') {
                        let index = +item.node.getAttribute('mr_c') - 1;
                        t = endpoints[index].timestamp;
                    }
                    else {
                        // background image
                        let match = getStyle(item.node, 'background-image').match(/url\(\"(.*?)\"\)/);
                        let s;
                        if (match && match[1]) {
                            s = match[1];
                        }
                        if (s.indexOf('http') == -1) {
                            s = location.protocol + match[1];
                        }
                        t = mp[s];
                    }
                }
                else if (item.weight === 4) {
                    if (item.node.tagName === 'CANVAS') {
                        let index = +item.node.getAttribute('mr_c') - 1;
                        t = endpoints[index].timestamp;
                    }
                    else if (item.node.tagName === 'VIDEO') {
                        t = mp[item.node.src];
                        !t && (t = mp[item.node.poster]);
                    }
                }
                rt < t && (rt = t, result = item);
            });
            options = {
                element: result.node,
                id: result.node.id || '',
                renderTime: rt,
                size: result.st,
                startTime: endpoints[+result.node.getAttribute('mr_c') - 1].timestamp,
                url: result.node.src || ''
            };
            return options;
        }
        function disable() {
            clearTimeout(timerId);
            scheduleTimerTasks = false;
            unregisterListeners();
        }
        function unregisterListeners() {
            if (mutationObserver)
                mutationObserver.disconnect();
        }
        return new Promise((resolve, reject) => {
            LCPResolver = resolve;
            if (document.readyState === 'complete') {
                scheduleTimerTasks = true;
                rescheduleTimer();
            }
            else {
                document.addEventListener('readystatechange', () => {
                    if (document.readyState === 'complete') {
                        scheduleTimerTasks = true;
                        rescheduleTimer();
                    }
                }, true);
            }
        });
    };
    class LargestContentfulPaint {
        constructor(options) {
            this.duration = 0;
            this.entryType = 'largest-contentful-paint';
            this.id = '';
            this.loadTime = 0;
            this.name = '';
            this.renderTime = 0;
            this.size = 0;
            this.startTime = 0;
            this.url = '';
            this.element = options.element;
            this.id = options.id;
            this.loadTime = options.loadTime || 0;
            this.renderTime = options.renderTime;
            this.startTime = options.startTime;
            this.url = options.url || '';
        }
        toJSON() {
            return JSON.stringify(this);
        }
    }
    //# sourceMappingURL=largest-contentful-paint.js.map

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
                        case 'largest-contentful-paint':
                            observe$1()
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
    //# sourceMappingURL=observer.js.map

    //# sourceMappingURL=index.js.map

    exports.default = SplitTime;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=split_time.js.map

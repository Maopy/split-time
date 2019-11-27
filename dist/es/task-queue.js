import EntryList from './entry-list';
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
export default TaskQueue;
//# sourceMappingURL=task-queue.js.map
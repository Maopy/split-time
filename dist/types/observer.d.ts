declare class SplitTime implements SplitTime {
    static readonly supportedEntryTypes: string[];
    callback: PerformanceObserverCallback;
    buffer: Set<PerformanceEntry>;
    entryTypes: string[];
    unsupportedEntryTypes: string[];
    useNative: Boolean;
    private taskQueue;
    constructor(callback: PerformanceObserverCallback);
    observe(options?: PerformanceObserverInit): void;
    disconnect(): void;
    takeRecords(): PerformanceEntryList;
    private processEntries;
}
export default SplitTime;

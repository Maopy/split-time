export default class EntryList extends Array<PerformanceEntry> implements PerformanceObserverEntryList {
    private _entries;
    constructor(entries: PerformanceEntry[]);
    getEntries(): PerformanceEntry[];
    getEntriesByType(type: string): PerformanceEntry[];
    getEntriesByName(name: string, type?: string): PerformanceEntry[];
}

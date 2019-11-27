import SplitTime from './observer';
declare class TaskQueue {
    private registeredObservers;
    private processedEntries;
    private timerId;
    performanceEntries: Set<PerformanceEntry>;
    constructor(registeredObservers?: Set<SplitTime>, processedEntries?: Set<PerformanceEntry>);
    add(observer: SplitTime): void;
    remove(observer: SplitTime): void;
    disconnect(): void;
    idleCallback(): void;
    private observe;
    private processEntries;
    private processBuffer;
    private getNewEntries;
    private getObserversForType;
}
export default TaskQueue;

import SplitTime from './observer';
interface TaskQueueOptions {
    registeredObservers?: Set<SplitTime>;
    processedEntries?: Set<PerformanceEntry>;
}
declare class TaskQueue {
    private registeredObservers;
    private processedEntries;
    private timerId;
    constructor({ registeredObservers, processedEntries }?: TaskQueueOptions);
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

interface PerformancePaintTiming extends PerformanceEntry {
    readonly duration: number;
    readonly entryType: string;
    name: string;
    startTime: number;
}
export declare const observe: () => Promise<PerformancePaintTiming[]>;
declare class PerformancePaintTiming implements PerformancePaintTiming {
    readonly duration: number;
    readonly entryType: string;
    name: string;
    startTime: number;
    constructor(name: string, startTime: number);
    toJSON(): string;
}
export default PerformancePaintTiming;

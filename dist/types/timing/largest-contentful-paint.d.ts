interface LargestContentfulPaint extends PerformanceEntry {
    readonly duration: number;
    element: HTMLElement;
    readonly entryType: string;
    id: string;
    loadTime: number;
    readonly name: string;
    renderTime: number;
    size: number;
    startTime: number;
    url: string;
}
export declare const observe: () => Promise<LargestContentfulPaint[]>;
declare class LargestContentfulPaint implements LargestContentfulPaint {
    readonly duration: number;
    element: HTMLElement;
    readonly entryType: string;
    id: string;
    loadTime: number;
    readonly name: string;
    renderTime: number;
    size: number;
    startTime: number;
    url: string;
    constructor(options: any);
    toJSON(): string;
}
export default LargestContentfulPaint;

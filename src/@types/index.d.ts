declare namespace PerformanceObserverPolyfill {
  interface SplitTime extends PerformanceObserver {
    buffer: Set<PerformanceEntry>
    callback: PerformanceObserverCallback
    entryTypes: string[]
  }
}

export default SplitTime

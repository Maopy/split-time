import SplitTime from './observer'
import EntryList from './entry-list'

const INTERVAL = 100

class TaskQueue {
  private registeredObservers: Set<SplitTime>
  private processedEntries: Set<PerformanceEntry>
  private timerId: number | null
  public performanceEntries: Set<PerformanceEntry>

  public constructor(registeredObservers?: Set<SplitTime>, processedEntries?: Set<PerformanceEntry>) {
    this.registeredObservers = registeredObservers || new Set()
    this.processedEntries = processedEntries || new Set()
    this.performanceEntries = new Set()
    this.timerId = null
  }

  public add(observer: SplitTime): void {
    this.registeredObservers.add(observer)

    if (this.registeredObservers.size === 1) { this.observe() }
  }

  public remove(observer: SplitTime): void {
    this.registeredObservers.delete(observer)

    if (!this.registeredObservers.size) { this.disconnect() }
  }

  public disconnect(): void {
    self.clearInterval(this.timerId)
    this.timerId = null
  }

  // call callbacks function when CPU idle
  public idleCallback(): void {
  }

  // Polling
  private observe(): void {
    this.timerId = self.setInterval(this.processEntries.bind(this), INTERVAL)
  }

  private processEntries(): void {
    const entries = this.getNewEntries()

    entries.forEach((entry): void => {
      const { entryType } = entry
      const observers = this.getObserversForType(
        this.registeredObservers,
        entryType
      )
      // Add the entry to observer buffer
      observers.forEach((observer): void => {
        observer.buffer.add(entry)
      })
      // Mark the entry as processed
      this.processedEntries.add(entry)
    });

    // Queue task to process all observer buffers
    // TODO: wait for CPU idle
    const task = (): void => this.registeredObservers.forEach(this.processBuffer)

    if ('requestAnimationFrame' in self) {
      self.requestAnimationFrame(task)
    } else {
      self.setTimeout(task, 0)
    }
  }

  private processBuffer(observer: SplitTime): void {
    // if use native observer, call callback function when native observers call
    if (observer.useNative) return

    const entries = Array.from(observer.buffer)
    const entryList = new EntryList(entries)
    observer.buffer.clear()

    if (entries.length && observer.callback) {
      observer.callback.call(undefined, entryList, observer)
    }
  }

  private getNewEntries(): PerformanceEntry[] {
    const entries = self.performance.getEntries()
    const totalEntries = [...entries, ...this.performanceEntries]

    return totalEntries.filter((entry: PerformanceEntry): boolean => !this.processedEntries.has(entry))
  }

  private getObserversForType(observers: Set<SplitTime>, type: string): SplitTime[] {
    return Array.from(observers)
      .filter((observer: SplitTime): boolean => observer.unsupportedEntryTypes.some((t): boolean => t === type))
  }
}

export default TaskQueue

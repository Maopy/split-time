import SplitTime from './observer'
import EntryList from './entry-list'

const INTERVAL = 100

interface TaskQueueOptions {
  registeredObservers?: Set<SplitTime>
  processedEntries?: Set<PerformanceEntry>
}

class TaskQueue {
  private registeredObservers: Set<SplitTime>
  private processedEntries: Set<PerformanceEntry>
  private timerId: number | null

  public constructor({
    registeredObservers = new Set(),
    processedEntries = new Set()
  }: TaskQueueOptions = {}) {
    this.registeredObservers = registeredObservers
    this.processedEntries = processedEntries
    this.timerId = null
  }

  // 添加一个 task
  public add(observer: SplitTime): void {
    this.registeredObservers.add(observer) // 注册一个 observer

    if (this.registeredObservers.size === 1) { // 只在刚有 observer 的时候监听一次
      this.observe() // 开始监听
    }
  }

  public remove(observer: SplitTime): void {
    this.registeredObservers.delete(observer)

    if (!this.registeredObservers.size) {
      this.disconnect()
    }
  }

  public disconnect(): void {
    self.clearInterval(this.timerId)
    this.timerId = null
  }

  // call callbacks function when CPU idle
  public idleCallback(): void {
    // Queue task to process all observer buffers
    const task = (): void => this.registeredObservers.forEach(this.processBuffer)

    if ('requestAnimationFrame' in self) {
      self.requestAnimationFrame(task)
    } else {
      self.setTimeout(task, 0)
    }
  }

  // 监听
  private observe(): void {
    // 利用 interval 不断执行
    this.timerId = self.setInterval(
      this.processEntries.bind(this),
      INTERVAL
    )
  }

  // 执行条目
  private processEntries(): void {
    const entries = this.getNewEntries() // 获取新的性能条目

    entries.forEach((entry): void => {
      const { entryType } = entry
      const observers = this.getObserversForType(
        this.registeredObservers,
        entryType
      ) // 获取 entryType 的 entry
      // Add the entry to observer buffer
      observers.forEach((observer): void => {
        observer.buffer.add(entry)
      })
      // Mark the entry as processed
      this.processedEntries.add(entry)
    });

    this.idleCallback()
  }

  // 调用 callback 返回一次 observe 的 buffer，buffer 中是这次所有的 entry
  private processBuffer(observer: SplitTime): void {
    const entries = Array.from(observer.buffer)
    const entryList = new EntryList(entries)
    observer.buffer.clear()

    if (entries.length && observer.callback) {
      !observer.useNative && observer.callback.call(undefined, entryList, observer)
    }
  }

  private getNewEntries(): PerformanceEntry[] {
    // TODO: 扩充 entry 来源
    const entries = self.performance.getEntries()
    return entries.filter((entry: PerformanceEntry): boolean => !this.processedEntries.has(entry))
  }

  private getObserversForType(
    observers: Set<SplitTime>,
    type: string
  ): SplitTime[] {
    return Array.from(observers)
      .filter((observer: SplitTime): boolean => observer.entryTypes.some((t): boolean => t === type))
  }
}

export default TaskQueue

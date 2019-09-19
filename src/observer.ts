import TaskQueue from './task-queue'
import EntryList from './entry-list'
import { ifSupported, totalEntryTypes } from './utils'

const globalTaskQueue = new TaskQueue() // 是否可以写成 static?

class SplitTime implements SplitTime {
  static readonly supportedEntryTypes: string[] = []
  
  public callback: PerformanceObserverCallback
  public buffer: Set<PerformanceEntry>
  public entryTypes: string[] = []
  public useNative: Boolean
  private taskQueue: TaskQueue

  public constructor(
    callback: PerformanceObserverCallback
  ) {
    this.callback = callback
    this.buffer = new Set()
    this.taskQueue = globalTaskQueue
    this.useNative = false
  }

  public observe(options?: PerformanceObserverInit): void {
    // TODO: 参数校验
    // TODO: 支持 entryTypes & type
    // TODO: 支持 bufferd
    const { entryTypes } = options
    let supportedOptionsEntryTypes = []
    let unsupportedOptionsEntryTypes = entryTypes

    if (ifSupported) {
      const { supportedEntryTypes } = PerformanceObserver
      const supportedEntryTypesSet = new Set(supportedEntryTypes)
      supportedOptionsEntryTypes = entryTypes.filter((entryType) => supportedEntryTypesSet.has(entryType))
      unsupportedOptionsEntryTypes = entryTypes.filter((entryType) => !supportedEntryTypesSet.has(entryType))

      if (supportedOptionsEntryTypes.length) {
        this.useNative = true

        new PerformanceObserver((list, observer) => {
          this.processEntries(list)
        })
          .observe({ entryTypes: supportedOptionsEntryTypes })
      }
    }

    if (unsupportedOptionsEntryTypes.length) {
      this.entryTypes = unsupportedOptionsEntryTypes
      this.taskQueue.add(this)
    }
  }

  public disconnect(): void {
    this.taskQueue.remove(this)
  }

  public takeRecords(): PerformanceEntryList {
    const entries = Array.from(this.buffer)
    return new EntryList(entries)
  }

  private processEntries(list?: PerformanceObserverEntryList):void {
    const entries = Array.from(this.buffer)
    const nativeEntries = (list && list.getEntries()) || []
    // Combine entries from native & SplitTime
    const entryList = new EntryList([...entries, ...nativeEntries])
    this.buffer.clear()

    this.callback(entryList, this)
  }
}

export default SplitTime

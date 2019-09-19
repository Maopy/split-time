const ERRORS = {
  invalidEntryTypes: `Uncaught DOMException: Failed to execute 'observe' on 'PerformanceObserver': An observe() call must include either entryTypes or type arguments.`
}
const VALID_TYPES = ['mark', 'measure', 'navigation', 'resource']
const isValidEntryType = (type) => VALID_TYPES.some((t) => type === t)
const checkImplementedEntryTypes = () => {
  const supportedEntryTypes = {
    PerformanceElementTiming: 'element',
    PerformanceFrameTiming: 'frame',
    PerformanceLongTaskTiming: 'longtask', // Long Tasks
    PerformanceMark: 'mark', // User Timing
    PerformanceMeasure: 'measure', // User Timing
    PerformanceNavigationTiming: 'navigation', // Navigation Timing
    PerformancePaintTiming: 'paint', // Paint Timing
    PerformanceResourceTiming: 'resource', // Resource Timing
    PerformanceServerTiming: 'server' // Server Timing
  }

  return Object.keys(supportedEntryTypes)
    .filter((perfInterface) => typeof window[perfInterface] === 'function')
    .reduce((acc, key) => acc.concat(supportedEntryTypes[key]), [])
}

class SplitTime {
  // static supportedEntryTypes: []

  constructor (callback, taskQueue) {
    this.callback = callback
    // this.taskQueue = taskQueue
    this.buffer = new Set()

    // private, EntryTypes already implemented
    this.implementedEntryTypes = checkImplementedEntryTypes()
    console.log('implemented entry types:', this.implementedEntryTypes)
  }

  observe (options) {
    if (!options || !options.entryTypes) {
      throw new Error(ERRORS.invalidEntryTypes)
    }

    const entryTypes = options.entryTypes.filter(isValidEntryType)

    if (!entryTypes.length) {
      throw new Error(ERRORS.invalidEntryTypes)
    }

    this.entryTypes = entryTypes

    // this.taskQueue.add(this)
  }

  disconnect () {
    // this.taskQueue.remove(this)
  }

  taskRecords () {
    const entries = Array.from(this.buffer)
    // return new EntryList(entries)
  }
}

export default SplitTime

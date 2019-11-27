interface PerformancePaintTiming extends PerformanceEntry {
  readonly duration: number
  readonly entryType: string
  name: string
  startTime: number
}

export const observe = (): Promise<Array<PerformancePaintTiming>> => {
  const INTERVAL = 100
  let pollingTimerId = null

  return new Promise((resolve, reject) => {
    pollingTimerId = self.setInterval(() => {
      const { timing } = self.performance
      const { domContentLoadedEventStart, domContentLoadedEventEnd, navigationStart } = timing
  
      if (domContentLoadedEventStart && domContentLoadedEventEnd && navigationStart) {
        self.clearInterval(pollingTimerId)
        resolve([
          new PerformancePaintTiming('first-paint', domContentLoadedEventStart - navigationStart),
          new PerformancePaintTiming('first-contentful-paint', domContentLoadedEventEnd - navigationStart)
        ])
      }
    }, INTERVAL)
  })
}

class PerformancePaintTiming implements PerformancePaintTiming {
  readonly duration: number = 0
  readonly entryType: string = 'paint'
  public name: string
  public startTime: number

  public constructor (name: string, startTime: number) {
    this.name = name
    this.startTime = startTime
  }

  public toJSON(): string {
    return JSON.stringify(this)
  }
}

export default PerformancePaintTiming

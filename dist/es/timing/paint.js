export const observe = () => {
    const INTERVAL = 100;
    let pollingTimerId = null;
    return new Promise((resolve, reject) => {
        pollingTimerId = self.setInterval(() => {
            const { timing } = self.performance;
            const { domContentLoadedEventStart, domContentLoadedEventEnd, navigationStart } = timing;
            if (domContentLoadedEventStart && domContentLoadedEventEnd && navigationStart) {
                self.clearInterval(pollingTimerId);
                resolve([
                    new PerformancePaintTiming('first-paint', domContentLoadedEventStart - navigationStart),
                    new PerformancePaintTiming('first-contentful-paint', domContentLoadedEventEnd - navigationStart)
                ]);
            }
        }, INTERVAL);
    });
};
class PerformancePaintTiming {
    constructor(name, startTime) {
        this.duration = 0;
        this.entryType = 'paint';
        this.name = name;
        this.startTime = startTime;
    }
    toJSON() {
        return JSON.stringify(this);
    }
}
export default PerformancePaintTiming;
//# sourceMappingURL=paint.js.map
const MutationObserver = self.MutationObserver || self.WebKitMutationObserver;
const TAG_WEIGHT_MAP = {
    SVG: 2,
    IMG: 2,
    CANVAS: 4,
    OBJECT: 4,
    EMBED: 4,
    VIDEO: 4
};
const WW = self.innerWidth;
const WH = self.innerHeight;
function getStyle(element, att) {
    return self.getComputedStyle(element)[att];
}
export const observe = () => {
    const endpoints = [];
    const mp = {};
    let options = {};
    let LCPResolver = null;
    let mutationCount = 0;
    let scheduleTimerTasks = false;
    let isChecking = false;
    let timerId = null;
    const mutationObserver = new MutationObserver((mutations) => {
        getSnapshot();
    });
    mutationObserver.observe(document, { childList: true, subtree: true });
    function getSnapshot() {
        const { navigationStart } = self.performance.timing;
        const timestamp = Date.now() - navigationStart;
        setMutationRecord(document, mutationCount++);
        endpoints.push({ timestamp });
    }
    function setMutationRecord(target, mutationCount) {
        const tagName = target.tagName;
        const IGNORE_TAG_SET = new Set(['META', 'LINK', 'STYLE', 'SCRIPT', 'NOSCRIPT']);
        if (!IGNORE_TAG_SET.has(tagName) && target.children) {
            for (let child = target.children, i = target.children.length - 1; i >= 0; i--) {
                if (child[i].getAttribute('mr_c') === null) {
                    child[i].setAttribute('mr_c', mutationCount);
                }
                setMutationRecord(child[i], mutationCount);
            }
        }
    }
    function ifRipe(start) {
        const LIMIT = 1000;
        const ti = Date.now() - start;
        return ti > LIMIT || ti - (endpoints[endpoints.length - 1].timestamp) > 1000;
    }
    function rescheduleTimer() {
        const { navigationStart } = self.performance.timing;
        const DELAY = 500;
        if (!scheduleTimerTasks)
            return;
        if (!isChecking && ifRipe(navigationStart)) {
            checkLCP();
        }
        else {
            clearTimeout(timerId);
            timerId = setTimeout(() => {
                rescheduleTimer();
            }, DELAY);
        }
    }
    function checkLCP() {
        isChecking = true;
        let res = deepTraversal(document.body);
        let tp;
        res.dpss.forEach(item => {
            if (tp && tp.st) {
                if (tp.st < item.st) {
                    tp = item;
                }
            }
            else {
                tp = item;
            }
        });
        initResourceMap();
        let resultSet = filterTheResultSet(tp.els);
        let LCPOptions = calResult(resultSet);
        LCPResolver([new LargestContentfulPaint(LCPOptions)]);
        disable();
    }
    function deepTraversal(node) {
        if (node) {
            let dpss = [];
            for (let i = 0, child; (child = node.children[i]); i++) {
                let s = deepTraversal(child);
                if (s.st) {
                    dpss.push(s);
                }
            }
            return calScore(node, dpss);
        }
        return {};
    }
    function calScore(node, dpss) {
        let { width, height, left, top, bottom, right } = node.getBoundingClientRect();
        let f = 1;
        if (WH < top || WW < left) {
            // 不在可视viewport中
            f = 0;
        }
        let sdp = 0;
        dpss.forEach(item => {
            sdp += item.st;
        });
        let weight = TAG_WEIGHT_MAP[node.tagName] || 1;
        if (weight === 1 &&
            getStyle(node, 'background-image') &&
            getStyle(node, 'background-image') !== 'initial' &&
            getStyle(node, 'background-image') !== 'none') {
            weight = TAG_WEIGHT_MAP['IMG']; // 将有图片背景的普通元素 权重设置为img
        }
        let st = width * height * weight * f;
        let els = [{ node, st, weight }];
        let areaPercent = calAreaPercent(node);
        if (sdp > st * areaPercent || areaPercent === 0) {
            st = sdp;
            els = [];
            dpss.forEach(item => {
                els = els.concat(item.els);
            });
        }
        return {
            dpss,
            st,
            els
        };
    }
    function calAreaPercent(node) {
        let { left, right, top, bottom, width, height } = node.getBoundingClientRect();
        let wl = 0;
        let wt = 0;
        let wr = WW;
        let wb = WH;
        let overlapX = right - left + (wr - wl) - (Math.max(right, wr) - Math.min(left, wl));
        if (overlapX <= 0) {
            // x 轴无交点
            return 0;
        }
        let overlapY = bottom - top + (wb - wt) - (Math.max(bottom, wb) - Math.min(top, wt));
        if (overlapY <= 0) {
            return 0;
        }
        return (overlapX * overlapY) / (width * height);
    }
    function initResourceMap() {
        self.performance.getEntries().forEach(item => {
            mp[item.name] = item.responseEnd;
        });
    }
    function filterTheResultSet(els) {
        let sum = 0;
        els.forEach(item => {
            sum += item.st;
        });
        let avg = sum / els.length;
        return els.filter(item => {
            return item.st >= avg;
        });
    }
    function calResult(resultSet) {
        let result = null;
        let rt = 0;
        resultSet.forEach(item => {
            let t = 0;
            if (item.weight === 1) {
                let index = +item.node.getAttribute('mr_c') - 1;
                t = endpoints[index].timestamp;
            }
            else if (item.weight === 2) {
                if (item.node.tagName === 'IMG') {
                    t = mp[item.node.src];
                }
                else if (item.node.tagName === 'SVG') {
                    let index = +item.node.getAttribute('mr_c') - 1;
                    t = endpoints[index].timestamp;
                }
                else {
                    // background image
                    let match = getStyle(item.node, 'background-image').match(/url\(\"(.*?)\"\)/);
                    let s;
                    if (match && match[1]) {
                        s = match[1];
                    }
                    if (s.indexOf('http') == -1) {
                        s = location.protocol + match[1];
                    }
                    t = mp[s];
                }
            }
            else if (item.weight === 4) {
                if (item.node.tagName === 'CANVAS') {
                    let index = +item.node.getAttribute('mr_c') - 1;
                    t = endpoints[index].timestamp;
                }
                else if (item.node.tagName === 'VIDEO') {
                    t = mp[item.node.src];
                    !t && (t = mp[item.node.poster]);
                }
            }
            rt < t && (rt = t, result = item);
        });
        options = {
            element: result.node,
            id: result.node.id || '',
            renderTime: rt,
            size: result.st,
            startTime: endpoints[+result.node.getAttribute('mr_c') - 1].timestamp,
            url: result.node.src || ''
        };
        return options;
    }
    function disable() {
        clearTimeout(timerId);
        scheduleTimerTasks = false;
        unregisterListeners();
    }
    function unregisterListeners() {
        if (mutationObserver)
            mutationObserver.disconnect();
    }
    return new Promise((resolve, reject) => {
        LCPResolver = resolve;
        if (document.readyState === 'complete') {
            scheduleTimerTasks = true;
            rescheduleTimer();
        }
        else {
            document.addEventListener('readystatechange', () => {
                if (document.readyState === 'complete') {
                    scheduleTimerTasks = true;
                    rescheduleTimer();
                }
            }, true);
        }
    });
};
class LargestContentfulPaint {
    constructor(options) {
        this.duration = 0;
        this.entryType = 'largest-contentful-paint';
        this.id = '';
        this.loadTime = 0;
        this.name = '';
        this.renderTime = 0;
        this.size = 0;
        this.startTime = 0;
        this.url = '';
        this.element = options.element;
        this.id = options.id;
        this.loadTime = options.loadTime || 0;
        this.renderTime = options.renderTime;
        this.startTime = options.startTime;
        this.url = options.url || '';
    }
    toJSON() {
        return JSON.stringify(this);
    }
}
export default LargestContentfulPaint;
//# sourceMappingURL=largest-contentful-paint.js.map
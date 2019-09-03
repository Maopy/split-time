/* global MutationObserver, performance */

const utils = {
  // 获取当前样式
  getStyle (element, att) {
    return window.getComputedStyle(element)[att]
  }
}
const TAG_WEIGHT_MAP = {
  SVG: 2,
  IMG: 2,
  CANVAS: 4,
  OBJECT: 4,
  EMBED: 4,
  VIDEO: 4
}
const WW = window.innerWidth
const WH = window.innerHeight
// const VIEWPORT_AREA = WW * WH

/**
 * Class to detect metrics.
 */
export default class Detector {
  /**
   * @param {!DetectorInit=} config
   */
  constructor (config = {}) {
    this.endpoints = []
    this.isChecking = false

    this._mutationCount = 1
    this._timerId = null

    // Timer tasks are only scheduled when detector is enabled.
    this._scheduleTimerTasks = false

    /** @type {?Function} */
    this._firstMeaningfulPaintResolver = null

    /** @type {?MutationObserver} */
    this._mutationObserver = null

    this.mp = {}

    this._registerListeners()
  }

  /**
   * Starts checking for a first meaningful time and returns a
   * promise that resolves to the found time.
   * @return {!Promise<number>}
   */
  getFirstMeaningfulPaint () {
    this._getSnapshot()

    return new Promise((resolve, reject) => {
      this._firstMeaningfulPaintResolver = resolve

      if (document.readyState === 'complete') {
        this.startSchedulingTimerTasks()
      } else {
        document.addEventListener('readystatechange', () => {
          if (document.readyState === 'complete') {
            this.startSchedulingTimerTasks()
          }
        }, true)
      }
    })
  }

  startSchedulingTimerTasks () {
    this._scheduleTimerTasks = true

    this.rescheduleTimer()
  }

  rescheduleTimer () {
    const navigationStart = performance.timing.navigationStart
    const DELAY = 500

    if (!this._scheduleTimerTasks) {
      console.log('startSchedulingTimerTasks must be called before calling rescheduleTimer')
      return
    }

    if (!this.isChecking && this._ifRipe(navigationStart)) {
      this._checkFMP()
    } else {
      clearTimeout(this._timerId)
      this._timerId = setTimeout(() => {
        this.rescheduleTimer()
      }, DELAY)
    }
  }

  deepTraversal (node) {
    if (node) {
      let dpss = []

      for (let i = 0, child; (child = node.children[i]); i++) {
        let s = this.deepTraversal(child)
        if (s.st) {
          dpss.push(s)
        }
      }

      return this.calScore(node, dpss)
    }
    return {}
  }

  calScore (node, dpss) {
    let {
      width,
      height,
      left,
      top,
      bottom,
      right
    } = node.getBoundingClientRect()
    let f = 1

    if (WH < top || WW < left) {
      // 不在可视viewport中
      f = 0
    }

    let sdp = 0

    dpss.forEach(item => {
      sdp += item.st
    })

    let weight = TAG_WEIGHT_MAP[node.tagName] || 1

    if (
      weight === 1 &&
      utils.getStyle(node, 'background-image') &&
      utils.getStyle(node, 'background-image') !== 'initial' &&
      utils.getStyle(node, 'background-image') !== 'none'
    ) {
      weight = TAG_WEIGHT_MAP['IMG'] // 将有图片背景的普通元素 权重设置为img
    }

    let st = width * height * weight * f

    let els = [{ node, st, weight }]

    let areaPercent = this.calAreaPercent(node)

    if (sdp > st * areaPercent || areaPercent === 0) {
      st = sdp
      els = []

      dpss.forEach(item => {
        els = els.concat(item.els)
      })
    }

    return {
      dpss,
      st,
      els
    }
  }

  calAreaPercent (node) {
    let {
      left,
      right,
      top,
      bottom,
      width,
      height
    } = node.getBoundingClientRect()
    let wl = 0
    let wt = 0
    let wr = WW
    let wb = WH

    let overlapX =
      right - left + (wr - wl) - (Math.max(right, wr) - Math.min(left, wl))
    if (overlapX <= 0) {
      // x 轴无交点
      return 0
    }

    let overlapY =
      bottom - top + (wb - wt) - (Math.max(bottom, wb) - Math.min(top, wt))
    if (overlapY <= 0) {
      return 0
    }

    return (overlapX * overlapY) / (width * height)
  }

  filterTheResultSet (els) {
    let sum = 0
    els.forEach(item => {
      sum += item.st
    })

    let avg = sum / els.length

    return els.filter(item => {
      return item.st > avg
    })
  }

  initResourceMap () {
    performance.getEntries().forEach(item => {
      this.mp[item.name] = item.responseEnd
    })
  }

  calResult (resultSet) {
    let rt = 0

    resultSet.forEach(item => {
      let t = 0
      if (item.weight === 1) {
        let index = +item.node.getAttribute('mr_c') - 1
        t = this.endpoints[index].timestamp
      } else if (item.weight === 2) {
        if (item.node.tagName === 'IMG') {
          t = this.mp[item.node.src]
        } else if (item.node.tagName === 'SVG') {
          let index = +item.node.getAttribute('mr_c') - 1
          t = this.endpoints[index].timestamp
        } else {
          // background image
          let match = utils.getStyle(item.node, 'background-image').match(/url\(\"(.*?)\"\)/)

          let s
          if (match && match[1]) {
            s = match[1]
          }
          if (s.indexOf('http') == -1) {
            s = location.protocol + match[1]
          }
          t = this.mp[s]
        }
      } else if (item.weight === 4) {
        if (item.node.tagName === 'CANVAS') {
          let index = +item.node.getAttribute('mr_c') - 1
          t = this.endpoints[index].timestamp
        } else if (item.node.tagName === 'VIDEO') {
          t = this.mp[item.node.src]

          !t && (t = this.mp[item.node.poster])
        }
      }

      console.log(t, item.node)
      rt < t && (rt = t)
    })

    return rt
  }

  disable () {
    clearTimeout(this._timerId)
    this._scheduleTimerTasks = false
    this._unregisterListeners()
  }

  _ifRipe (start) {
    const LIMIT = 1000
    const ti = Date.now() - start
    return ti > LIMIT || ti - (this.endpoints[this.endpoints.length - 1].timestamp) > 1000
  }

  _checkFMP () {
    this.isChecking = true

    let res = this.deepTraversal(document.body)
    let tp

    res.dpss.forEach(item => {
      if (tp && tp.st) {
        if (tp.st < item.st) {
          tp = item
        }
      } else {
        tp = item
      }
    })

    this.initResourceMap()
    let resultSet = this.filterTheResultSet(tp.els)
    let fmpTiming = this.calResult(resultSet)

    this._firstMeaningfulPaintResolver(fmpTiming)
    this.disable()
    console.log(tp, this.endpoints)
  }

  _setMutationRecord (target, mutationCount) {
    const tagName = target.tagName
    const IGNORE_TAG_SET = new Set(['META', 'LINK', 'STYLE', 'SCRIPT', 'NOSCRIPT'])

    if (!IGNORE_TAG_SET.has(tagName) && target.children) {
      for (let child = target.children, i = target.children.length - 1; i >= 0; i--) {
        if (child[i].getAttribute('mr_c') === null) {
          child[i].setAttribute('mr_c', mutationCount)
        }

        this._setMutationRecord(child[i], mutationCount)
      }
    }
  }

  _getSnapshot () {
    const navigationStart = performance.timing.navigationStart
    const timestamp = Date.now() - navigationStart
    this._setMutationRecord(document, this._mutationCount++)
    this.endpoints.push({ timestamp })
  }

  /**
   * Registers listeners to detect DOM mutations to detect mutation and network quiescence.
   */
  _registerListeners () {
    this._mutationObserver = new MutationObserver((mutations) => {
      // Typecast to fix: https://github.com/google/closure-compiler/issues/2539
      // eslint-disable-next-line no-self-assign
      mutations = /** @type {!Array<!MutationRecord>} */ (mutations)

      this._getSnapshot()
    })

    this._mutationObserver.observe(document, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Removes all added listeners.
   */
  _unregisterListeners () {
    if (this._mutationObserver) this._mutationObserver.disconnect()
  }
}

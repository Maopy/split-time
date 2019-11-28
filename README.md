<div align="center">
  <img src="./logo/logo.png" width="150" />
  <h1>
    Split Time
  </h1>
  <p align="center">
    <a href="https://www.npmjs.com/package/split-time">
      <img src="https://badge.fury.io/js/split-time.svg" alt="npm version" />
    </a>
    <a href="https://standardjs.com">
      <img src="https://img.shields.io/badge/code_style-standard-brightgreen.svg" alt="JavaScript Style Guide" />
    </a>
  </p>
</div>

## What is Split Time?

A JavaScript library for measuring FCP, LCP. Report real user measurements to tracking tool.

It provides the polyfill to use `PerformanceObserver` interface within browser environments.

## Installation

```bash
npm install split-time -S
```

## Usage

```js
new SplitTime((list, observer) => {
})
  .observe({
    entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint']
  })
```

## License

[MIT](LICENSE)

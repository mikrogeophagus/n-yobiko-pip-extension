(async () => {
  'use strict'

  const video = /** @type {HTMLVideoElement} */ (await waitForSelector('video[src^="blob"]'))

  /*
    requestAnimationFrame() をフックする

    - タブがフォアグラウンドのときは requestAnimationFrame() を呼び出す
    - タブがバックグラウンドのときは requestAnimationFrame() を模倣して requestVideoFrameCallback() を呼び出す
      - number 型のリクエスト ID を返す
      - DOMHighResTimeStamp 型のタイムスタンプをコールバック関数に渡す

    NOTE: setTimeout() や setInterval() はバックグラウンドでスロットリングされるので使用できない
          https://developer.chrome.com/blog/timer-throttling-in-chrome-88/
  */

  const originalRequestAnimationFrame = requestAnimationFrame

  // @ts-expect-error
  requestAnimationFrame = function (callback) {
    if (document.visibilityState === 'visible') {
      const requestId = originalRequestAnimationFrame(callback)
      return requestId
    }

    const fakeRequestId = video.requestVideoFrameCallback((now, _metadata) => callback(now))
    return fakeRequestId
  }
})()

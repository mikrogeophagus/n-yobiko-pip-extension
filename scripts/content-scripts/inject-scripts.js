'use strict'

const resources = [
  'scripts/common/dom-utils.js',
  'scripts/page-scripts/raf-hook.js'
]

for (const resource of resources) {
  const script = document.createElement('script')

  // @ts-expect-error
  script.src = chrome.runtime.getURL(resource)
  script.async = false

  document.body.appendChild(script)
}

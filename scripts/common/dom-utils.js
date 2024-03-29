'use strict'

/**
 * セレクターに一致する要素が出現するまで待機して取得する関数  
 * タイムアウト時間が経過した場合は例外をスローする
 * @param {string} selector - CSS セレクター
 * @param {object} [options] - 待機パラメーター（オプション）
 * @param {number} [options.timeout=30000] - タイムアウト時間（ミリ秒）
 * @returns {Promise<Element>} - HTML 要素
 * @throws {DOMException} - タイムアウトエラー
 */
function waitForSelector(selector, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(reject, timeout, new DOMException(`${selector} に一致する要素が ${timeout}ms 以内に出現せずタイムアウトしました`, 'TimeoutError'))

    function checkSelector() {
      const element = document.querySelector(selector)

      if (element) {
        clearTimeout(timeoutId)
        resolve(element)
      } else {
        requestAnimationFrame(checkSelector)
      }
    }

    checkSelector()
  })
}

/**
 * HTML 文字列を基に HTML 要素を生成するタグ関数  
 * 埋め込み式の値が文字列の場合はサニタイズする  
 * トップレベルの要素は 1 つまでとする
 * @param {TemplateStringsArray} strings - HTML 文字列
 * @param {...any} substitutions - 埋め込み式
 * @returns {?Element} - HTML 要素
 */
function html(strings, ...substitutions) {
  const template = document.createElement('template')

  template.innerHTML = String.raw({ raw: strings }, ...substitutions.map((substitution) => {
    return typeof substitution === 'string' ? sanitize(substitution) : substitution
  }))

  return template.content.firstElementChild
}

function sanitize(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

'use strict'

/**
 * CSS セレクターに一致する HTML 要素が現れるまで待機する関数
 *
 * - セレクターに一致する要素が現れた場合、その要素で解決するプロミスを返す
 * - タイムアウト時間が経過した場合、TimeoutError の DOMException で拒否するプロミスを返す
 *
 * @param {string} selector - CSS セレクター
 * @param {object} [options] - オプション設定
 * @param {number} [options.timeoutMs=30000] - タイムアウト時間（デフォルト値 30000 ミリ秒）
 * @returns {Promise<Element>} - CSS セレクターに一致する HTML 要素で解決するプロミス
 */
function waitForSelector(selector, { timeoutMs = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(timeout, timeoutMs)

    const observer = new MutationObserver(check)
    observer.observe(document, { childList: true, subtree: true })

    check()

    function check() {
      const element = document.querySelector(selector)

      if (element) {
        cleanup()
        resolve(element)
      }
    }

    function timeout() {
      cleanup()
      reject(new DOMException(
        `${selector} で選択される要素が ${timeoutMs}ms 以内に見つかりませんでした。`,
        'TimeoutError'
      ))
    }

    function cleanup() {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  })
}

/**
 * HTML の文字列をもとに要素を生成するタグ関数  
 * 埋め込み式の値が文字列の場合は HTML の特殊文字をエスケープする  
 * トップレベルの要素は 1 つまでとする
 * @param {TemplateStringsArray} strings - HTML 文字列
 * @param {...any} substitutions - 埋め込み式
 * @returns {?Element} - HTML 要素
 */
function html(strings, ...substitutions) {
  const template = document.createElement('template')

  template.innerHTML = String.raw({ raw: strings }, ...substitutions.map((substitution) => {
    return typeof substitution === 'string' ? escapeHtml(substitution) : substitution
  }))

  return template.content.firstElementChild
}

/**
 * HTML の特殊文字をエスケープする関数
 * 
 * @param {string} string - エスケープする文字列
 * @returns {string} - エスケープした文字列
 */
function escapeHtml(string) {
  return string
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

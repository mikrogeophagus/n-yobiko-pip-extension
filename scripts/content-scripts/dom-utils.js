'use strict'

/**
 * CSS セレクターに一致する HTML 要素が現れるまで待機する関数
 *
 * - セレクターに一致する要素が現れた場合、その要素で解決するプロミスを返す
 * - 操作を中止した場合、その理由 ({@linkcode AbortSignal.reason}) で拒否するプロミスを返す
 *
 * @param {string} selector - CSS セレクター
 * @param {object} [options] - オプション設定
 * @param {AbortSignal} [options.signal] - 中止シグナル（デフォルトでは 30 秒後にタイムアウトする）
 * @returns {Promise<Element>} - CSS セレクターに一致する HTML 要素で解決するプロミス
 */
function waitForSelector(selector, { signal = AbortSignal.timeout(30000) } = {}) {
  return new Promise((resolve, reject) => {
    // すでに操作が中止されているかチェック
    if (signal.aborted) return reject(signal.reason)

    // すでに要素が存在するかチェック
    const element = document.querySelector(selector)
    if (element) return resolve(element)

    const cleanUp = () => {
      observer.disconnect()
      signal.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      cleanUp()
      reject(signal.reason)
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector)

      if (element) {
        cleanUp()
        resolve(element)
      }
    })

    observer.observe(document, { childList: true, subtree: true })
    signal.addEventListener('abort', onAbort)
  })
}

/**
 * HTML の文字列をもとに要素を生成するタグ関数  
 * 埋め込み式の値が文字列の場合は HTML の特殊文字をエスケープする  
 * トップレベルの要素は 1 つまでとする
 * @param {TemplateStringsArray} strings - HTML 文字列
 * @param {...any} values - 埋め込み式の値
 * @returns {?Element} - HTML 要素
 * @throws {Error} - トップレベルの要素が 2 つ以上存在する場合
 */
function html(strings, ...values) {
  const template = document.createElement('template')

  template.innerHTML = String.raw({ raw: strings }, ...values.map((value) => {
    return typeof value === 'string' ? escapeHtml(value) : value
  }))

  if (template.content.childElementCount > 1) {
    throw new Error('トップレベルの要素は 1 つまでとしてください')
  }

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

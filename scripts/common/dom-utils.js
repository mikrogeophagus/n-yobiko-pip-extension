'use strict'

/**
 * セレクターに一致する要素が現れるまで待機して返す関数
 * セレクターに一致する要素が現れない場合はタイムアウト時間が経過したら例外を投げる
 * @param {string} selector CSS セレクター
 * @param {object} [options] オプション
 * @param {number} [options.timeout=30000] タイムアウト時間（ミリ秒）
 * @returns {Promise<Element>} HTML 要素
 */
function waitForSelector(selector, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(reject, timeout, new Error(`${selector} に一致する要素が見つかりません。`))

    function checkSelector() {
      const element = document.querySelector(selector)

      if (element) {
        clearTimeout(timeoutId)
        resolve(element)
      } else {
        setTimeout(checkSelector, 500)
      }
    }

    checkSelector()
  })
}

/**
 * HTML 文字列を基に HTML 要素を生成するタグ関数
 * 埋め込み式はサニタイズされる
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 * @returns {?Element}
 */
function element(strings, ...values) {
  const template = document.createElement('template')

  template.innerHTML = String.raw({ raw: strings }, ...values.map((value) => {
    return typeof value === 'string' ? escape(value) : value
  }))

  if (template.content.childElementCount > 1) {
    throw new Error('最上位の要素は一つでなければなりません。')
  }

  return template.content.firstElementChild
}

function escape(string) {
  return string
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/`/g, '&#x60;')
}

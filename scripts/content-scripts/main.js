(async () => {
  'use strict'

  const informationBar = await waitForSelector('[aria-label="動画プレイヤー"] > div:first-child')
  const controlBar = await waitForSelector('[aria-label="動画プレイヤー"] > div:last-child > div:last-child > div:last-child > div:last-child')

  // MARK: - 運営コメントの取得と設定

  // 表示中の運営コメントを保持する
  let officialComment = informationBar.textContent.trim()

  new MutationObserver(() => {
    officialComment = informationBar.textContent.trim()
  }).observe(informationBar, {
    subtree: true,
    childList: true
  })

  // MARK: - 映像レイヤーの取得と設定

  const sourceVideo = /** @type {HTMLVideoElement} */ (await waitForSelector('video'))
  sourceVideo.classList.add('layer', 'layer--hidden')
  sourceVideo.id = 'video-layer'

  // MARK: - コメントレイヤーの取得と設定

  const sourceCanvas = /** @type {HTMLCanvasElement} */ (await waitForSelector('canvas'))
  sourceCanvas.classList.add('layer', 'layer--hidden')
  sourceCanvas.id = 'comment-layer'

  const { width, height } = sourceCanvas

  // MARK: - コメント可視状態アイコンの取得と設定

  const commentsVisibilityIcon = await waitForSelector('i[type|="comment"]')
  let isCommentsVisible = commentsVisibilityIcon.getAttribute('type') === 'comment'

  // コメント可視状態アイコンを監視する
  new MutationObserver(() => {
    isCommentsVisible = commentsVisibilityIcon.getAttribute('type') === 'comment'

    // 再生停止中にコメントの可視状態が変化した場合もフレームが更新されるようにする
    drawVideoFrame()

    // 常にコメントレイヤーを非表示にする
    sourceCanvas.classList.add('layer--hidden')
  }).observe(commentsVisibilityIcon, {
    attributes: true,
    attributeFilter: [ 'type' ]
  })

  // MARK: - レイヤー合成用のキャンバス要素の作成と設定

  const canvas = /** @type {HTMLCanvasElement} */ (html`<canvas width="${width}" height="${height}" id="composite-canvas"></canvas>`)
  sourceCanvas.parentElement.insertBefore(canvas, sourceCanvas)

  const context = canvas.getContext('2d')

  // MARK: - 合成動画再生用の動画要素の作成と設定

  const video = /** @type {HTMLVideoElement} */ (html`<video autoplay muted id="composite-video"></video>`)
  sourceVideo.parentElement.insertBefore(video, sourceVideo)

  video.srcObject = canvas.captureStream()

  // MARK: - レイヤーの合成とアニメーションの処理

  /**
   * 映像レイヤーとコメントレイヤーを合成する関数
   * コメントが非表示の場合はコメントレイヤーを合成しない
   */
  function compositeLayers() {
    context.clearRect(0, 0, width, height)
    context.drawImage(sourceVideo, 0, 0, width, height)
    if (isCommentsVisible) context.drawImage(sourceCanvas, 0, 0, width, height)
  }

  /**
   * 運営コメントを描画する関数
   * コメントが非表示の場合や PiP モードでない場合は描画しない
   */
  function drawOfficialComment() {
    if (officialComment && isCommentsVisible && document.pictureInPictureElement) {
      // 背景
      context.fillStyle = 'rgba(46, 46, 71, 0.7)'
      context.fillRect(0, height - 64, width, 64)

      // テキスト
      context.fillStyle = 'white'
      context.textAlign = 'center'
      context.textBaseline = 'middle'
      context.font = 'bold 32px sans-serif'
      context.fillText(officialComment, width / 2, height - 32)
    }
  }

  /**
   * 動画のフレームを描画する関数
   */
  function drawVideoFrame() {
    compositeLayers()
    drawOfficialComment()
  }

  /**
   * 映像レイヤーとコメントレイヤーを合成してアニメーションを再生する関数
   * 映像レイヤーが再生されていない場合は終了する
  */
  function animate() {
    if (sourceVideo.paused || sourceVideo.ended) return
    requestAnimationFrame(animate)
    drawVideoFrame()
  }

  // MARK: - 動画のイベントリスナーの設定

  sourceVideo.addEventListener('play', () => animate())

  // PiP の対象が常に合成動画になるようにする
  sourceVideo.addEventListener('enterpictureinpicture', () => video.requestPictureInPicture())

  // 再生停止中にシーク操作をした場合もフレームが更新されるようにする
  sourceVideo.addEventListener('seeked', () => drawVideoFrame())

  // 再生停止中に PiP モードを変更した場合もフレームが更新されるようにする
  video.addEventListener('enterpictureinpicture', () => drawVideoFrame())
  video.addEventListener('leavepictureinpicture', () => drawVideoFrame())

  // MARK: - PiP モード切替ボタンの作成と設定

  const pipButtonContainer = /** @type {HTMLDivElement} */ (html`<div class="pip-button-container"></div>`)
  const togglePipButton = /** @type {HTMLAnchorElement} */ (html`
    <a class="pip-button">
      <!-- Bootstrap Icons | MIT License | https://github.com/twbs/icons/blob/main/LICENSE -->
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pip" viewBox="0 0 16 16">
        <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
        <path d="M8 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-3z"/>
      </svg>
    </a>
  `)

  togglePipButton.addEventListener('click', () => {
    document.pictureInPictureElement
      ? document.exitPictureInPicture()
      : video.requestPictureInPicture()
  })

  pipButtonContainer.appendChild(togglePipButton)
  controlBar.appendChild(pipButtonContainer)
})()

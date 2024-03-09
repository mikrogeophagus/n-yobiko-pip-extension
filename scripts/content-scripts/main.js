(async () => {
  'use strict'

  const videoPlayer = await waitForSelector('[aria-label="動画プレイヤー"]')
  const informationBar = videoPlayer.firstElementChild

  //================================================
  // 運営コメントの取得と設定
  //================================================

  // 表示中の運営コメントを保持する
  let officialComment = informationBar.textContent.trim()

  new MutationObserver((mutations, _observer) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const addedNode = mutation.addedNodes.item(0)
        officialComment = addedNode.textContent.trim()
      } else if (mutation.removedNodes.length) {
        officialComment = ''
      }
    }
  }).observe(informationBar, {
    subtree: true,
    childList: true
  })

  //================================================
  // 映像レイヤーの取得と設定
  //================================================

  /** @type {HTMLVideoElement} */
  const sourceVideo = await waitForSelector('video')
  sourceVideo.classList.add('layer', 'layer--hidden')
  sourceVideo.id = 'video-layer'

  //================================================
  // コメントレイヤーの取得と設定
  //================================================

  /** @type {HTMLCanvasElement} */
  const sourceCanvas = await waitForSelector('canvas')
  sourceCanvas.classList.add('layer', 'layer--hidden')
  sourceCanvas.id = 'comment-layer'

  const { width, height } = sourceCanvas

  //================================================
  // コメント可視状態アイコンの取得と設定
  //================================================

  /** @type {HTMLElement} */
  const commentsVisibilityIcon = await waitForSelector('i[type|="comment"]')
  let isCommentsVisible = commentsVisibilityIcon.getAttribute('type') === 'comment'

  // コメント可視状態アイコンを監視する
  new MutationObserver((mutations, _observer) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'type') {
        isCommentsVisible = mutation.target.getAttribute('type') === 'comment'

        // 再生停止中にコメントの可視状態が変化した場合もフレームが更新されるようにする
        drawVideoFrame()

        // XXX: なぜか常にコメントレイヤーを非表示にしないと、映像レイヤーと合成できなかったり、コメントがチラついて表示されたりする
        //      コメント表示切替ボタンをクリックすると、コメントレイヤーの display: none が付け外しされてコメントの可視状態が切り替わっている
        //      そのためコメント可視状態アイコンが変化したら、コメントレイヤーに display: none を付けて常に非表示にする必要がある
        sourceCanvas.classList.add('layer--hidden')
      }
    }
  }).observe(commentsVisibilityIcon, {
    attributes: true,
    attributeFilter: [ 'type' ]
  })

  //================================================
  // レイヤー合成用のキャンバス要素の作成と設定
  //================================================

  /** @type {HTMLCanvasElement} */
  const canvas = html`<canvas width="${width}" height="${height}" id="composite-canvas"></canvas>`
  sourceCanvas.parentElement.insertBefore(canvas, sourceCanvas)

  const context = canvas.getContext('2d')

  //================================================
  // 合成動画再生用の動画要素の作成と設定
  //================================================

  /** @type {HTMLVideoElement} */
  const video = html`<video autoplay muted id="composite-video"></video>`
  sourceVideo.parentElement.insertBefore(video, sourceVideo)

  video.srcObject = canvas.captureStream()

  //================================================
  // レイヤーの合成とアニメーションの処理
  //================================================

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

  //================================================
  // 動画のイベントリスナーの設定
  //================================================

  sourceVideo.addEventListener('play', (_event) => {
    animate()
  })

  // PiP の対象が常に合成動画になるようにする
  sourceVideo.addEventListener('enterpictureinpicture', async (_event) => {
    await video.requestPictureInPicture()
  })

  // 再生停止中にシーク操作をした場合もフレームが更新されるようにする
  sourceVideo.addEventListener('seeked', (_event) => {
    drawVideoFrame()
  })

  // 再生停止中に PiP モードを変更した場合もフレームが更新されるようにする
  video.addEventListener('enterpictureinpicture', (_event) => {
    drawVideoFrame()
  })

  // 再生停止中に PiP モードを変更した場合もフレームが更新されるようにする
  video.addEventListener('leavepictureinpicture', (_event) => {
    drawVideoFrame()
  })

  //================================================
  // PiP モード切替ボタンの作成と設定
  //================================================

  /** @type {HTMLDivElement} */
  const pipButtonContainer = html`<div class="pip-button-container"></div>`

  /** @type {HTMLAnchorElement} */
  const togglePipButton = html`
    <a class="pip-button">
      <!-- Bootstrap Icons | MIT License | https://github.com/twbs/icons/blob/main/LICENSE -->
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pip" viewBox="0 0 16 16">
        <path d="M0 3.5A1.5 1.5 0 0 1 1.5 2h13A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5v-9zM1.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-13z"/>
        <path d="M8 8.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-.5.5h-5a.5.5 0 0 1-.5-.5v-3z"/>
      </svg>
    </a>
  `

  togglePipButton.addEventListener('click', async (_event) => {
    document.pictureInPictureElement
      ? await document.exitPictureInPicture()
      : await sourceVideo.requestPictureInPicture()
  })

  const controlBar = videoPlayer
    .lastElementChild
    .lastElementChild
    .lastElementChild
    .lastElementChild

  pipButtonContainer.appendChild(togglePipButton)
  controlBar.appendChild(pipButtonContainer)
})()

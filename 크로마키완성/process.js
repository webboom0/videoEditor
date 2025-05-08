let processor = {
  timerCallback: function () {
    if (this.video.paused || this.video.ended) {
      return;
    }
    this.computeFrame();
    let self = this;
    setTimeout(function () {
      self.timerCallback();
    }, 0);
  },

  doLoad: function () {
    // 비디오 요소 초기화
    this.video = document.getElementById("video");

    // 비디오 캔버스 (원본)
    this.videoCanvas = document.getElementById("c1");
    this.videoCtx = this.videoCanvas.getContext("2d");

    // 배경 이미지 캔버스
    this.bgCanvas = document.createElement("canvas");
    this.bgCtx = this.bgCanvas.getContext("2d");

    // 결과 캔버스 (크로마키 처리된 최종 결과)
    this.resultCanvas = document.getElementById("c2");
    this.resultCtx = this.resultCanvas.getContext("2d");

    // 메인 뷰어 캔버스
    this.viewerCanvas = document.getElementById("viewerCanvas");
    this.viewerCtx = this.viewerCanvas.getContext("2d");

    // 배경 이미지 로드
    this.bgImage = new Image();
    this.bgImage.src = "media/foo.png"; // 배경 이미지 경로

    let self = this;
    this.bgImage.onload = function () {
      self.bgCanvas.width = self.bgImage.width;
      self.bgCanvas.height = self.bgImage.height;
      self.bgCtx.drawImage(self.bgImage, 0, 0);
    };

    this.video.addEventListener(
      "play",
      function () {
        self.width = self.video.videoWidth / 2;
        self.height = self.video.videoHeight / 2;

        // 캔버스 크기 설정
        self.videoCanvas.width = self.width;
        self.videoCanvas.height = self.height;
        self.resultCanvas.width = self.width;
        self.resultCanvas.height = self.height;
        self.viewerCanvas.width = self.video.videoWidth;
        self.viewerCanvas.height = self.video.videoHeight;

        self.timerCallback();
      },
      false,
    );
  },

  computeFrame: function () {
    if (!this.videoCtx || !this.video || !this.bgImage.complete) return;

    // 1. 비디오 프레임을 비디오 캔버스에 그리기
    this.videoCtx.drawImage(this.video, 0, 0, this.width, this.height);

    // 2. 비디오 프레임 데이터 가져오기
    let frame = this.videoCtx.getImageData(0, 0, this.width, this.height);
    let l = frame.data.length / 4;

    // 3. 크로마키 처리 (녹색 배경 제거)
    for (let i = 0; i < l; i++) {
      let r = frame.data[i * 4 + 0];
      let g = frame.data[i * 4 + 1];
      let b = frame.data[i * 4 + 2];

      // 크로마키 색상 (R:0, G:141, B:66) 감지
      // 약간의 허용 범위를 둠
      if (
        r < 30 && // 빨간색이 거의 없음
        g > 120 &&
        g < 160 && // 녹색이 141 근처
        b > 50 &&
        b < 80 // 파란색이 66 근처
      ) {
        frame.data[i * 4 + 3] = 0; // 투명하게 설정
      }
    }

    // 4. 크로마키 처리된 프레임을 결과 캔버스에 그리기
    this.resultCtx.putImageData(frame, 0, 0);

    // 5. 배경 이미지와 크로마키 처리된 비디오 합성
    this.viewerCtx.clearRect(
      0,
      0,
      this.viewerCanvas.width,
      this.viewerCanvas.height,
    );

    // 배경 이미지 그리기
    this.viewerCtx.drawImage(
      this.bgCanvas,
      0,
      0,
      this.viewerCanvas.width,
      this.viewerCanvas.height,
    );

    // 크로마키 처리된 비디오 그리기
    this.viewerCtx.drawImage(
      this.resultCanvas,
      0,
      0,
      this.viewerCanvas.width,
      this.viewerCanvas.height,
    );
  },
};

// 타임라인 관련 변수들
let timelineState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playheadPosition: 0,
};

// 타임라인 초기화
function initTimeline() {
  const playButton = document.querySelector(".play-button");
  const timelinePlayhead = document.querySelector(".timeline-playhead");
  const video = document.getElementById("video");

  playButton.addEventListener("click", () => {
    if (timelineState.isPlaying) {
      video.pause();
      playButton.classList.remove("paused");
    } else {
      video.play();
      playButton.classList.add("paused");
    }
    timelineState.isPlaying = !timelineState.isPlaying;
  });

  video.addEventListener("timeupdate", () => {
    timelineState.currentTime = video.currentTime;
    timelineState.playheadPosition = (video.currentTime / video.duration) * 100;
    timelinePlayhead.style.left = `${timelineState.playheadPosition}%`;
  });
}

// 파일 업로드 처리
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const video = document.getElementById("video");
    video.src = URL.createObjectURL(file);
    video.load();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  processor.doLoad();
  initTimeline();

  // 파일 업로드 이벤트 리스너
  document
    .getElementById("fileInput")
    .addEventListener("change", handleFileUpload);
});

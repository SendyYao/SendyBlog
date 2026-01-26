let tag = false;
let Song, audio, play_btn, progressBar, progressContainer, currentTimeEl, durationEl;
let playBtn, playIcon, pauseIcon, cover;

function initMusicWidget(SongString) {
    Song = SongString.split(";")
    document.getElementById("Song-Name").textContent = Song[0];
    document.getElementById("Song-Artist").textContent = Song[1];
    document.getElementById("mj-img").src = Song[2];
    document.getElementById("share").href = `https://kuwo.cn/search/list?key=${Song[0]}`

    audioLoad("https://hexo.yaohub.com" + Song[3])
    updateMediaInfo()

    progressBar = document.getElementById('progress-bar');
    progressContainer = document.getElementById('progress-container');
    currentTimeEl = document.getElementById('current-time');
    durationEl = document.getElementById('duration');

    playBtn = document.getElementById('play-btn')
    playIcon = document.getElementById('play-icon')
    pauseIcon = document.getElementById('pause-icon')
    cover = document.querySelector('.player-cover');

    // 拖动进度条
    let isDragging = false; let isPlaying = false; let lastTextUpdate = 0; // 节流 currentTime 文本更新

    playBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
        } else {
            audio.pause();
        }
    });

    audio.addEventListener('play', () => {
        isPlaying = true;
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        cover.classList.add('playing');
        requestAnimationFrame(updateProgress)
    });

    audio.addEventListener('pause', () => {
        playIcon.classList.remove('hidden');
        pauseIcon.classList.add('hidden');
        cover.classList.remove('playing');
    });

    // 监听 duration
    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
    });

    // 点击进度条进行快进或快退
    progressContainer.addEventListener('click', (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const newTime = (offsetX / rect.width) * audio.duration;
        audio.currentTime = newTime;
        currentTimeEl.textContent = formatTime(newTime);
    });

    function updateProgress() {
        // 使用 requestAnimationFrame 的自调循环
        if (isPlaying && !isDragging && audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 280;

            // 节流时间文本更新，每 0.5 秒一次
            const now = performance.now();
            if (now - lastTextUpdate > 500) {
                currentTimeEl.textContent = formatTime(audio.currentTime);
                progressBar.style.width = progress+"px";
                lastTextUpdate = now;
            }
        }

        // 每一帧都排队下一次刷新（但只要isPlaying为true才真正更新UI）
        requestAnimationFrame(updateProgress);
    }

    // 更新进度条
    progressBar.addEventListener('mousedown', () => {
        isDragging = true;
        isPlaying = !audio.paused;
        if (isPlaying) audio.pause()
    });

    document.addEventListener('mousemove', e => {
        if (isDragging) handleDrag(e)
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            // handleDrag(e)
            isDragging = false;
            if (isPlaying) audio.play()
        }
    });
}

function audioLoad(audioSrc) {
    audio = document.getElementById("my-audio");
    document.getElementById("audio-source").src = audioSrc
    audio.load()
}

// 🕓 格式化时间
function formatTime(sec) {
    if (isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function more(status) {
    const popup_menu = document.getElementById("popup-menu")
    $("#popup-menu").slideDown(500);

    play_btn = document.getElementById("play");

    play_btn.addEventListener("click", function () {
        if (status === false) {
            play_btn.textContent = "Pause😥";
            audio.play();
            tag = true;
        } else {
            play_btn.textContent = "Listen😊"
            audio.pause();
            tag = false;
        }
        $("#popup-menu").slideUp(1000);
    });
    popup_menu.onmouseleave = function () {
        $("#popup-menu").slideUp(1000);
    }
}

// 2025-11-06 Add Song Meta Info Display Support
function updateMediaInfo() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: Song[0],
            artist: Song[1],
            album: "",
            artwork: [
                {src: Song[2], sizes: '500x500', type: 'image/jpeg'}
            ]
        });
        navigator.mediaSession.setActionHandler('play', () => {
            audio.play();
            play_btn.textContent = "Pause😥"
        })
        navigator.mediaSession.setActionHandler('pause', () => {
            audio.pause();
            play_btn.textContent = "Listen😊"
        })
    }
}

function handleDrag(e) {
    const rect = progressContainer.getBoundingClientRect();
    const offsetX = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const percent = (offsetX / rect.width) * 100;
    const newTime = (offsetX / rect.width) * audio.duration;
    progressBar.style.width = `${percent}%`;
    currentTimeEl.textContent = formatTime(newTime);
}
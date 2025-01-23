document.addEventListener('DOMContentLoaded', () => {
    let audioContext, analyser, source;
    const audioControl = document.getElementById('audio-control');
    const audio = document.getElementById('audio');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const scene = document.querySelector('a-scene');
    const sphere = document.getElementById('visualSphere');
    const model = document.getElementById('base-entity');
    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const toggleLyricsButton = document.getElementById('toggle-lyrics');
    let isLyricsVisible = false;


    // 音声解析の初期化
    async function initAudioAnalyser() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.resume();

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.85;
            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

            return true;
        } catch (error) {
            console.error('Audio analyser initialization error:', error);
            return false;
        }
    }


    // 音声データの解析と視覚化
    AFRAME.registerComponent('audio-visualizer', {
        tick: function () {
            if (analyser && !audio.paused) {
                const freqByteData = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(freqByteData);

                // スフィアのスケールを変更
                let avgScale = 0;
                for (let i = 0; i < freqByteData.length; i++) {
                    avgScale += freqByteData[i];
                }
                avgScale /= freqByteData.length;
                const scale = 1 + (avgScale / 255) * 0.5;
                this.el.object3D.scale.set(scale, scale, scale);
            }
        }
    });



    // 歌詞の表示/非表示を切り替える
      toggleLyricsButton.addEventListener('click', () => {
        isLyricsVisible = !isLyricsVisible;
        lyricsOverlay.style.display = isLyricsVisible ? 'block' : 'none';
        updateLyricsButton();
      });

    function updateLyricsButton() {
        const icon = toggleLyricsButton.querySelector('i');
        icon.className = isLyricsVisible ? 'fas fa-times' : 'fas fa-align-justify';
    }
    updateLyricsButton();

    // 音声再生の制御
    audioControl.addEventListener('click', async () => {
        try {
            if (!audioContext) {
                const initialized = await initAudioAnalyser();
                if (!initialized) return;
            }

            if (audio.paused) {
                await audio.play();
                await audioContext.resume();
            } else {
                audio.pause();
            }
            updateAudioButton();
        } catch (error) {
            console.error('Audio control error:', error);
        }
    });

    function updateAudioButton() {
        const icon = audioControl.querySelector('i');
        icon.className = audio.paused ? 'fas fa-play' : 'fas fa-pause';
    }

    sphere.setAttribute('audio-visualizer', '');

    scene.addEventListener('targetFound', () => {
        scanningOverlay.classList.add('fade-out');
    });

    scene.addEventListener('targetLost', () => {
        scanningOverlay.classList.remove('fade-out');
    });

    scene.addEventListener('error', (e) => {
        console.error('A-Frame scene error:', e);
    });

    audio.addEventListener('play', updateAudioButton);
    audio.addEventListener('pause', updateAudioButton);
});
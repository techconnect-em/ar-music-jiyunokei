document.addEventListener('DOMContentLoaded', () => {
    let audioContext, analyser, source;
    const audioControl = document.getElementById('audio-control');
    const audio = document.getElementById('audio');
    const scanningOverlay = document.getElementById('scanning-overlay');
    const scene = document.querySelector('a-scene');
    const sphere = document.getElementById('visualSphere');
    const model = document.getElementById('base-entity');
    const equalizerContainer = document.getElementById('equalizer-container');
    const mindarTarget = document.querySelector('[mindar-image-target]');
    const lyricsOverlay = document.getElementById('lyrics-overlay');
    const toggleLyricsButton = document.getElementById('toggle-lyrics');

    const FFT_SIZE = 256;
    const numBars = FFT_SIZE / 4;
    let bars = [];
    let isLyricsVisible = false;


    // 音声解析の初期化
    async function initAudioAnalyser() {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.resume();

            analyser = audioContext.createAnalyser();
            analyser.fftSize = FFT_SIZE;
            analyser.smoothingTimeConstant = 0.85;
            source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);

             // イコライザーバーの初期化
            try {
                for (let i = 0; i < numBars; i++) {
                    const bar = document.createElement('a-entity');
                    bar.setAttribute('geometry', `primitive: box; width: 0.02; height: 0.1; depth: 0.02`);
                    bar.setAttribute('material', `color: yellow`);
                    equalizerContainer.appendChild(bar);
                    bars.push(bar);
                }
                console.log('Equalizer bars initialized successfully.');
            } catch (error) {
                console.error('Error initializing equalizer bars:', error);
            }


            return true;
        } catch (error) {
            console.error('Audio analyser initialization error:', error);
            return false;
        }
    }


    // 音声データの解析と視覚化
    AFRAME.registerComponent('audio-visualizer', {
         init: function () {
            this.barWidth = 0.02;
            this.barColor = 'yellow';
            this.equalizerRadius = 1.1;
            this.smoothing = 0.3;
            this.barHeights = new Array(numBars).fill(0); // スムージング用の配列
            console.log('Audio visualizer component initialized.');
        },
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

                // イコライザーバーの更新
                this.updateEqualizerBars(freqByteData);
            }
        },
       updateEqualizerBars: function (freqByteData) {
           try {
                const targetPosition = mindarTarget.object3D.position;
                const radius = parseFloat(sphere.getAttribute('radius')) * this.equalizerRadius;
                const sphereBottomY = targetPosition.y - parseFloat(sphere.getAttribute('radius'));

                for (let i = 0; i < numBars; i++) {
                  const bar = bars[i];

                 if (!bar) {
                     console.error('bar is null or undefined:', i, bars);
                      continue;
                 }
                // 使用する周波数データを選択（高周波数帯域をカット）
                    const freqIndex = Math.floor((i / numBars) * (FFT_SIZE / 2));
                    const freqSum = freqByteData[freqIndex] || 0;
                  let barHeight = (freqSum / 255) * 1.5;
                   barHeight = Math.max(0.1, barHeight); // 最小値を設定


                    // スムージング処理
                  this.barHeights[i] = this.barHeights[i] + (barHeight - this.barHeights[i]) * this.smoothing;

                   let angle = 0;
                    if (numBars > 1) {
                       angle = (i / (numBars - 1)) * Math.PI - (Math.PI / 2);
                   }
                    const x = Math.cos(angle - Math.PI / 2) * radius;
                    const z = Math.sin(angle - Math.PI / 2) * radius;
                    const y = sphereBottomY + this.barHeights[i] / 2;

                    bar.setAttribute('position', `${targetPosition.x + x} ${y} ${targetPosition.z + z}`);
                    bar.setAttribute('geometry', `primitive: box; width: ${this.barWidth}; height: ${this.barHeights[i]}; depth: ${this.barWidth}`);
                   bar.setAttribute('rotation', `0 ${-angle * 180 / Math.PI - 90} 0`);
                }

          } catch (error) {
              console.error('Error during equalizer animation:', error);
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
       lyricsOverlay.style.display = 'none'; // マーカー認識時、歌詞非表示
        scanningOverlay.classList.add('fade-out');
    });

    scene.addEventListener('targetLost', () => {
       if(isLyricsVisible){
         lyricsOverlay.style.display = 'block'; // マーカー認識消失時、歌詞表示
       } else {
          lyricsOverlay.style.display = 'none'; // マーカー認識消失時、歌詞非表示
       }
        scanningOverlay.classList.remove('fade-out');
    });

    scene.addEventListener('error', (e) => {
        console.error('A-Frame scene error:', e);
    });

    audio.addEventListener('play', updateAudioButton);
    audio.addEventListener('pause', updateAudioButton);
});
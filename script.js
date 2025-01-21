let audioContext, analyser, source;
        const audioControl = document.getElementById('audio-control');
        const audio = document.getElementById('audio');
        const scanningOverlay = document.getElementById('scanning-overlay');
        const scene = document.querySelector('a-scene');
        const sphere = document.getElementById('visualSphere');
        const model = document.getElementById('base-entity');
        const equalizerContainer = document.getElementById('equalizer-container');
         const mindarTarget = document.querySelector('[mindar-image-target]');

         const FFT_SIZE = 128;
        const numBars = FFT_SIZE / 2; // バーの数
        const barWidth = 0.05;
        const barColor = 'yellow';
         const equalizerRadius = 0.8;
        let bars = [];

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
                        bar.setAttribute('geometry', `primitive: box; width: ${barWidth}; height: 0.1; depth: ${barWidth}`);
                         bar.setAttribute('material', `color: ${barColor}`);
                         equalizerContainer.appendChild(bar);
                         bars.push(bar);
                    }
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
           tick: function () {
                if (analyser && !audio.paused) {
                    const freqByteData = new Uint8Array(FFT_SIZE / 2);
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
                   try {
                        const targetPosition = mindarTarget.object3D.position;
                        for (let i = 0; i < numBars; i++) {
                            const bar = bars[i];
                            const freqSum = freqByteData[i] || 0;
                             const barHeight = (freqSum / 255) * 1.5;

                            const angle = (i / numBars) * Math.PI * 2;
                            const x = Math.cos(angle) * equalizerRadius;
                            const z = Math.sin(angle) * equalizerRadius;


                              bar.setAttribute('position', `${targetPosition.x + x} ${barHeight / 2} ${targetPosition.z + z}`);
                            bar.setAttribute('geometry', `primitive: box; width: ${barWidth}; height: ${barHeight}; depth: ${barWidth}`);
                             bar.setAttribute('rotation', `0 ${-angle * 180 / Math.PI} 0`);

                        }
                    } catch (error) {
                       console.error("Error during equalizer animation:", error);
                    }
                }
            }
        });


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
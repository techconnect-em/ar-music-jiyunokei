        let audioContext, analyser, source;
        const audioControl = document.getElementById('audio-control');
        const audio = document.getElementById('audio');
        const scanningOverlay = document.getElementById('scanning-overlay');
        const scene = document.querySelector('a-scene');
        const sphere = document.getElementById('visualSphere');
        const model = document.getElementById('base-entity');
        const lightningContainer = document.getElementById('lightning-container');
        const FFT_SIZE = 128;
        const numLines = 16; // 稲妻のライン数
        const lightningSpeed = 0.5; // 稲妻の速度
        const lightningWidth = 0.02;
        const lightningColor = 'yellow';
        let boxes = [];
    

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

                 // 稲妻ラインの作成
                  try {
                        for (let i = 0; i < numLines; i++) {
                        const line = document.createElement('a-entity');
                            line.setAttribute('geometry', 'primitive: line');
                            line.setAttribute('material', `color: ${lightningColor}; width: ${lightningWidth};`);
                            lightningContainer.appendChild(line);
                        }
                    } catch (error) {
                        console.error('Error initializing lightning lines:', error);
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

                    // 稲妻のアニメーション
                     try {
                        const radius = parseFloat(sphere.getAttribute('radius'));
                        for (let i = 0; i < numLines; i++) {
                            const line = lightningContainer.children[i];
                            const angle = (i / numLines) * Math.PI * 2;
                            const startX = 0;
                            const startY = 0;
                            const startZ = 0;

                            const freqSum = freqByteData[i] || 0; // 周波数データが存在しない場合は0とする
                            const intensity = Math.min(1, freqSum / 255); // 0から1の範囲に正規化

                            // 稲妻の長さのアニメーション
                           let endX = Math.cos(angle) * radius * intensity ;
                           let endY = Math.sin(angle) * radius * intensity ;
                           let endZ = 0;


                            line.setAttribute('geometry', {
                            start: { x: startX, y: startY, z: startZ },
                                end: { x: endX, y: endY, z: endZ }
                            });

                        }
                    } catch (error) {
                         console.error("Error during lightning animation:", error);
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
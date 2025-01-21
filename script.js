        let audioContext, analyser, source;
        const audioControl = document.getElementById('audio-control');
        const audio = document.getElementById('audio');
        const scanningOverlay = document.getElementById('scanning-overlay');
        const scene = document.querySelector('a-scene');
        const sphere = document.getElementById('visualSphere');
        const model = document.getElementById('base-entity');
        const lightningContainer = document.getElementById('lightning-container');
        let lastBassAvg = 0;
        let kickStartTime = 0;
        const kickThreshold = 150; // キック検出の閾値
        const kickDuration = 250; // アニメーションの持続時間（ms）
        const minScale = 0.3; // スケールを縮小する最小値
        const originalScale = 0.4;
        let animationProgress = 0; // アニメーションの進行度
        let lastScale = originalScale;
        const numLines = 16; // 稲妻のライン数
        const lightningSpeed = 0.5; // 稲妻の速度
        const lightningWidth = 0.02;
        const lightningColor = 'yellow';



        // 音声解析の初期化
        async function initAudioAnalyser() {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                await audioContext.resume();

                analyser = audioContext.createAnalyser();
                analyser.fftSize = 256; // 周波数分解能を設定
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
            init: function () {
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
            },
            tick: function (time, deltaTime) {
                if (analyser && !audio.paused) {
                    const dataArray = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(dataArray);

                    // 低音（ベース）の平均を計算。さらに狭める
                    const bassAvg = dataArray.slice(0, 5).reduce((a, b) => a + b, 0) / 5; // 0~5のみ使用
                    const midAvg = dataArray.slice(10, 60).reduce((a, b) => a + b, 0) / 50; // 中域を追加
                    const trebleAvg = dataArray.slice(60).reduce((a, b) => a + b, 0) / (dataArray.length - 60); // 高域は狭め

                    // スムージング係数を調整
                    const smoothingFactor = 0.5;

                    // スケール変更の適用（低域の強さでスケールを決定）
                    const targetScale = 1 + (bassAvg / 255) * 0.5;
                    const currentScale = this.el.object3D.scale.x;
                    const smoothedScale = currentScale + (targetScale - currentScale) * smoothingFactor;
                    this.el.object3D.scale.set(smoothedScale, smoothedScale, smoothedScale);

                    // 透明度を中音域と高音域で制御
                    const targetOpacity = 0.3 + (midAvg / 255) * 0.3 + (trebleAvg / 255) * 0.2;
                    this.el.setAttribute('opacity', targetOpacity);

                     // キック音の検出とモデルの動き
                    const now = performance.now();
                    if (bassAvg > kickThreshold && now - kickStartTime > kickDuration) {
                       kickStartTime = now;
                         animationProgress = 0; // 新しいキックでアニメーションをリセット
                     }

                    const kickProgress = Math.min(1, (now - kickStartTime) / kickDuration);

                    // スケールの変化を計算
                    let targetScaleValue = originalScale;
                    if (kickProgress < 1) {
                    // アニメーション中はスケールを縮小、拡大
                       targetScaleValue = originalScale - (originalScale - minScale) * Math.sin(kickProgress * Math.PI);
                     }

                    // スムージングを適用
                    const smoothedScaleValue = lastScale + (targetScaleValue - lastScale) * 0.2;
                    lastScale = smoothedScaleValue;
                    model.setAttribute('scale', `${smoothedScaleValue} ${smoothedScaleValue} ${smoothedScaleValue}`);

                     // 稲妻アニメーション
                    try {
                        const radius = parseFloat(sphere.getAttribute('radius'));
                        for (let i = 0; i < numLines; i++) {
                            const line = lightningContainer.children[i];
                            const angle = (i / numLines) * Math.PI * 2;
                            const startX = 0;
                            const startY = 0;
                            const startZ = 0;

                            // 稲妻の長さのアニメーション
                            let endX = Math.cos(angle) * radius * Math.min(1, kickProgress * (lightningSpeed * 2) );
                            let endY = Math.sin(angle) * radius * Math.min(1, kickProgress * (lightningSpeed * 2) );
                            let endZ = 0;

                            line.setAttribute('geometry', {
                            start: { x: startX, y: startY, z: startZ },
                                end: { x: endX, y: endY, z: endZ }
                            });

                        }
                     } catch (error) {
                         console.error("Error during lightning animation:", error);
                    }


                    lastBassAvg = bassAvg;
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
        let audioContext, analyser, source;
        const audioControl = document.getElementById('audio-control');
        const audio = document.getElementById('audio');
        const scanningOverlay = document.getElementById('scanning-overlay');
        const scene = document.querySelector('a-scene');
        const sphere = document.getElementById('visualSphere');
        const model = document.getElementById('base-entity');
        const equalizerContainer = document.getElementById('equalizer-container');
         const mindarTarget = document.querySelector('[mindar-image-target]');
         const toggleEqualizerButton = document.getElementById('toggle-equalizer');


         const FFT_SIZE = 128;
        const numBars = FFT_SIZE / 2; // バーの数
        const barWidth = 0.05;
        const barColor = 'yellow';
        const equalizerRadius = 0.8; // 円周の半径
         let isEqualizerVisible = true; // イコライザーの表示状態

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
                            const barHeight = (freqSum / 255) * 1.5; // スケールを調整
                            const x = 0;
                            let z = 0;
                            let y = 0;


                                if (i < numBars / 2) {
                                // 上半分に配置
                                  y = equalizerRadius; // 上に配置
                                 z = (i / (numBars / 2) - 0.5) * equalizerRadius; //左右に分散
                                } else {
                                 y = -equalizerRadius; // 下に配置
                                 z = ((i - numBars / 2) / (numBars / 2) - 0.5) * equalizerRadius; // 左右に分散
                                }


                            if(isEqualizerVisible){
                                 bar.setAttribute('position', `${targetPosition.x + x} ${targetPosition.y + y + barHeight/2} ${targetPosition.z + z}`); //Y座標を調整
                                  bar.setAttribute('geometry', `primitive: box; width: ${barWidth}; height: ${barHeight}; depth: ${barWidth}`);
                                  bar.setAttribute('rotation', '0 0 0');
                            }else{
                                 bar.setAttribute('position', `${targetPosition.x} -10 ${targetPosition.z}`); //非表示の位置
                               }
                        }
                   } catch (error) {
                       console.error('Error during equalizer animation:', error);
                  }

                }
           }
        });



        // イコライザーの表示/非表示を切り替える
        toggleEqualizerButton.addEventListener('click', () => {
            isEqualizerVisible = !isEqualizerVisible;
              for (let i = 0; i < numBars; i++) {
                   const bar = bars[i];
                    if(!isEqualizerVisible){
                        bar.setAttribute('position', bar.getAttribute('position').x + ' -10 ' + bar.getAttribute('position').z); // 非表示
                      }
                }
                updateEqualizerButton();
         });


          function updateEqualizerButton() {
             const icon = toggleEqualizerButton.querySelector('i');
               icon.className = isEqualizerVisible ? 'fas fa-bars' : 'fas fa-eye-slash';
          }
           updateEqualizerButton();



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
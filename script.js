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
        const barWidth = 0.02; // バーの幅を細くする
        const barColor = 'yellow';
        const equalizerRadius = 1.1; // 円周の半径を拡大
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
                     try {
                        const targetPosition = mindarTarget.object3D.position;
                        const radius = parseFloat(sphere.getAttribute('radius')) * equalizerRadius; // スフィアの半径を取得
                        const sphereBottomY = targetPosition.y - parseFloat(sphere.getAttribute('radius')); // スフィアの底辺のY座標を取得


                        for (let i = 0; i < numBars; i++) {
                            const bar = bars[i];
                            const freqSum = freqByteData[i] || 0;
                            const barHeight = (freqSum / 255) * 1.5;

                            const angle = (i / (numBars-1)) * Math.PI - (Math.PI / 2);
                             const x = Math.cos(angle - Math.PI/2) * radius;
                            const z = Math.sin(angle - Math.PI/2) * radius;

                            const y = sphereBottomY + barHeight / 2;

                             if(isEqualizerVisible){
                                 bar.setAttribute('position', `${targetPosition.x + x} ${y} ${targetPosition.z + z}`);
                                bar.setAttribute('geometry', `primitive: box; width: ${barWidth}; height: ${barHeight}; depth: ${barWidth}`);
                                bar.setAttribute('rotation', `0 ${-angle * 180 / Math.PI -90} 0`);
                            }else{
                                 bar.setAttribute('position', `${targetPosition.x} -10 ${targetPosition.z}`);
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
                        bar.setAttribute('position', bar.getAttribute('position').x + ' -10 ' + bar.getAttribute('position').z);
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
// スクリプトに追加
AFRAME.registerComponent('particle-system', {
  schema: {
    preset: {default: 'default'},
    particleCount: {default: 500},
    color: {default: '#FFFFFF'},
    size: {default: 0.05},
    maxAge: {default: 5},
    velocityValue: {type: 'vec3', default: {x: 0.1, y: 0.1, z: 0.1}},
    velocitySpread: {type: 'vec3', default: {x: 0.2, y: 0.2, z: 0.2}},
    accelerationValue: {type: 'vec3', default: {x: 0, y: 0, z: 0}},
    accelerationSpread: {type: 'vec3', default: {x: 0.1, y: 0.1, z: 0.1}}
  },

  init: function() {
    this.particles = [];
    for (let i = 0; i < this.data.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  },

  createParticle: function() {
    const particle = document.createElement('a-sphere');
    particle.setAttribute('radius', this.data.size);
    particle.setAttribute('color', this.data.color);
    particle.setAttribute('opacity', Math.random() * 0.5 + 0.5);
    
    // ランダムな初期位置
    const pos = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: (Math.random() - 0.5) * 2
    };
    particle.setAttribute('position', pos);
    
    // 速度と加速度を設定
    particle.velocity = {
      x: this.data.velocityValue.x + (Math.random() - 0.5) * this.data.velocitySpread.x,
      y: this.data.velocityValue.y + (Math.random() - 0.5) * this.data.velocitySpread.y,
      z: this.data.velocityValue.z + (Math.random() - 0.5) * this.data.velocitySpread.z
    };
    
    this.el.appendChild(particle);
    return particle;
  },

  tick: function(time, deltaTime) {
    this.particles.forEach(particle => {
      const pos = particle.getAttribute('position');
      const vel = particle.velocity;
      
      // 位置の更新
      pos.x += vel.x * (deltaTime/1000);
      pos.y += vel.y * (deltaTime/1000);
      pos.z += vel.z * (deltaTime/1000);
      
      // 範囲外に出たら反対側に戻す
      if (Math.abs(pos.x) > 2) pos.x *= -0.9;
      if (Math.abs(pos.y) > 2) pos.y *= -0.9;
      if (Math.abs(pos.z) > 2) pos.z *= -0.9;
      
      particle.setAttribute('position', pos);
    });
  }
});
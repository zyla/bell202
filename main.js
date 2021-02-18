async function start () {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.audioWorklet.addModule('worklet.js')
  generator = new AudioWorkletNode(audioCtx, 'modulator', { numberOfOutputs: 2, outputChannelCount: [1, 1] });

  generator.connect(audioCtx.destination);

  const osc1 = startOscilloscope(audioCtx, '#osc1');
  generator.connect(osc1, 0, 0);
  generator.connect(osc1, 1, 1);

  const demodulator = new AudioWorkletNode(audioCtx, 'demodulator');
  generator.connect(demodulator);

  const osc2 = startOscilloscope(audioCtx, '#osc2');
  demodulator.connect(osc2, 0, 0);
  generator.connect(osc2, 1, 1);

  setTimeout(() => {
    sendBits([1,0,0,1,0,1,0,0,0,0,1]);
  }, 0);
}

start();

function sendBits(bits) {
  console.log('send bits', bits);
  generator.port.postMessage({ bits });
}

function sendText(text) {
  console.log('send text', text);
  const bits = [];
  for(let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    for(let j = 0; j < 8; j++) {
      bits.push(c & (0x80 >> j) ? 1 : 0);
    }
  }
  sendBits(bits);
}

function startOscilloscope(audioCtx, selector) {
  const exporter = new AudioWorkletNode(audioCtx, 'exporter', { numberOfInputs: 2 });

  var dataArray = new Float32Array(44110 / 1200 * 32);
  var dataEnd = 0;

  exporter.port.onmessage = (event) => {
    const samples = event.data;
    for(let i = 0; i < samples.length; i++) {
      dataArray[dataEnd] = samples[i];
      dataEnd = (dataEnd + 1) % dataArray.length;
    }
  };

  var canvas = document.querySelector(selector);
  var canvasCtx = canvas.getContext("2d");

  draw();

  function draw() {
    requestAnimationFrame(draw);

    canvas.width = document.body.clientWidth - 20;

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";

    canvasCtx.beginPath();

    var sliceWidth = canvas.width * 1.0 / dataArray.length;
    var x = 0;

    for (var i = 0; i < dataArray.length; i++) {

      var v = 1 - dataArray[i] * 0.95;
      var y = v * canvas.height / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.stroke();
  }

  return exporter;
}

// create web audio api context
var audioCtx;
var generator;

var analyser;
var dataArray;
var dataEnd = 0;

var exporter;

async function start () {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.audioWorklet.addModule('worklet.js')
  generator = new AudioWorkletNode(audioCtx, 'modulator');

  exporter = new AudioWorkletNode(audioCtx, 'exporter');

  // const generator = audioCtx.createOscillator();
  // generator.start();
  // generator.frequency.setValueAtTime(440, audioCtx.currentTime);

  generator.connect(audioCtx.destination);

  generator.connect(exporter);

  dataArray = new Float32Array(512);

  exporter.port.onmessage = (event) => {
    const samples = event.data;
    for(let i = 0; i < samples.length; i++) {
      dataArray[dataEnd] = samples[i];
      dataEnd = (dataEnd + 1) % dataArray.length;
    }
  };

  draw();
}

start();

function sendBits(bits) {
  bits = bits || [1,0,0,1,0,1];
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

// Get a canvas defined with ID "oscilloscope"
var canvas = document.getElementById("oscilloscope");
var canvasCtx = canvas.getContext("2d");

// draw an oscilloscope of the current audio source

function draw() {
  requestAnimationFrame(draw);

  canvasCtx.fillStyle = "rgb(200, 200, 200)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 1;
  canvasCtx.strokeStyle = "rgb(0, 0, 0)";

  canvasCtx.beginPath();

  var sliceWidth = canvas.width * 1.0 / dataArray.length;
  var x = 0;

  for (var i = 0; i < dataArray.length; i++) {

    var v = 1 - dataArray[i];
    var y = v * canvas.height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

//  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

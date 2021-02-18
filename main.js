// create web audio api context
var audioCtx;
var generator;

var analyser;
var dataArray;

async function start () {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  await audioCtx.audioWorklet.addModule('worklet.js')
  generator = new AudioWorkletNode(audioCtx, 'modulator');

  // const generator = audioCtx.createOscillator();
  // generator.start();
  // generator.frequency.setValueAtTime(440, audioCtx.currentTime);

  generator.connect(audioCtx.destination);

  analyser = audioCtx.createAnalyser();
  generator.connect(analyser);
  analyser.fftSize = 1024;
  dataArray = new Uint8Array(analyser.frequencyBinCount);

  draw();
}

function sendBits(bits) {
  bits = bits || [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1];
  console.log('send bits', bits);
  generator.port.postMessage({ bits });
}

// Get a canvas defined with ID "oscilloscope"
var canvas = document.getElementById("oscilloscope");
var canvasCtx = canvas.getContext("2d");

// draw an oscilloscope of the current audio source

function draw() {

  requestAnimationFrame(draw);

  analyser.getByteTimeDomainData(dataArray);

  canvasCtx.fillStyle = "rgb(200, 200, 200)";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 1;
  canvasCtx.strokeStyle = "rgb(0, 0, 0)";

  canvasCtx.beginPath();

  var sliceWidth = canvas.width * 1.0 / dataArray.length;
  var x = 0;

  for (var i = 0; i < dataArray.length; i++) {

    var v = dataArray[i] / 128.0;
    var y = v * canvas.height / 2;

    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
}

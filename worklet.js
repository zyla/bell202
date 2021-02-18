const BAUD_RATE = 1200;
const MARK_FREQ = 1200;
const SPACE_FREQ = 2200;

class Modulator extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);

    this.t = 0;
    this.sampleIndex = 0;
    this.startPhase = 0;
    this.bits = [];

    this.bitDuration = 1 / BAUD_RATE;
    this.sampleDuration = 1 / sampleRate;

    this.port.onmessage = (event) => {
      if(event.data.bits) {
        this.bits.push(...event.data.bits);
      }
    };
  }

  process (inputs, outputs, parameters) {
    assertEqual('number of outputs', outputs.length, 2);
    assertEqual('number of output[0] channels', outputs[0].length, 1);
    assertEqual('number of output[1] channels', outputs[1].length, 1);

    const output = outputs[0][0];
    const enableOutput = outputs[1][0];

    for (let i = 0; i < output.length; i++) {
      if(this.bits.length === 0) {
        return true;
      }

      // Second output - 1 when sending, 0 when idle.
      enableOutput[i] = 1;

      const freq = this.bits[0] ? MARK_FREQ : SPACE_FREQ;
      const phase = this.startPhase + 2 * Math.PI * this.sampleIndex * freq / sampleRate;
      output[i] = Math.sin(phase);
      this.sampleIndex++;
      this.t += this.sampleDuration;
      if(this.t >= this.bitDuration) {
        this.startPhase += 2 * Math.PI * this.t * freq;
        this.sampleIndex = 0;
        this.t -= this.bitDuration;
        this.bits.shift();
      }
    }
    return true;
  }
}

registerProcessor('modulator', Modulator);

class Exporter extends AudioWorkletProcessor {
  process (inputs, outputs, parameters) {
    if(inputs[0].length === 0 || inputs[1].length === 0) {
      return true;
    }

    assertEqual('number of inputs', inputs.length, 2);
    assertEqual('number of input[0] channels', inputs[0].length, 1);
    assertEqual('number of input[1] channels', inputs[1].length, 1);

    if(inputs[1][0].some(x => Math.abs(x) >= 0.1)) {
      this.port.postMessage(Float32Array.from(inputs[0][0]));
    }
    return true;
  }
}

registerProcessor('exporter', Exporter);

class Integrator {
  constructor(numSamples) {
    this.buffer = new Float32Array(numSamples);
    this.buffer.fill(0);
    this.offset = 0;
    this.accum = 0;
  }

  push(value) {
    this.accum += value - this.buffer[this.offset];
    this.buffer[this.offset] = value;
    this.offset = (this.offset + 1) % this.buffer.length;
  }

  value() {
    return this.accum;
  }

  valueSq() {
    return this.value() * this.value();
  }
}

// Heavily inspired by: https://www.notblackmagic.com/bitsnpieces/afsk/
class Demodulator extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);

    this.numIntegrationSamples = sampleRate / BAUD_RATE;

    this.markI  = new Integrator(this.numIntegrationSamples);
    this.markQ  = new Integrator(this.numIntegrationSamples);
    this.spaceI = new Integrator(this.numIntegrationSamples);
    this.spaceQ = new Integrator(this.numIntegrationSamples);

    this.sampleIndex = 0;
  }

  process (inputs, outputs, parameters) {
    if(inputs[0].length === 0) {
      return true;
    }
    assertEqual('number of inputs', inputs.length, 1);
    assertEqual('number of input channels', inputs[0].length, 1);
    assertEqual('number of outputs', outputs.length, 1);
    assertEqual('number of output channels', outputs[0].length, 1);

    const input = inputs[0][0];
    const output = outputs[0][0];
    for(let i = 0; i < input.length; i++) {
      this.markI.push(input[i] * Math.sin(2 * Math.PI * this.sampleIndex * MARK_FREQ / sampleRate));
      this.markQ.push(input[i] * Math.cos(2 * Math.PI * this.sampleIndex * MARK_FREQ / sampleRate));
      this.spaceI.push(input[i] * Math.sin(2 * Math.PI * this.sampleIndex * SPACE_FREQ / sampleRate));
      this.spaceQ.push(input[i] * Math.cos(2 * Math.PI * this.sampleIndex * SPACE_FREQ / sampleRate));

      const value =
          this.markI.valueSq() + this.markQ.valueSq()
          - this.spaceI.valueSq() - this.spaceQ.valueSq();

      const threshold = 0.5;

      output[i] = value >= threshold ? 1 : value <= -threshold ? -1 : value;

      this.sampleIndex++;
    }
    return true;
  }
}

function assertEqual(name, value, expected) {
  if(value !== expected) {
    throw new Error('Invalid ' + name + ': ' + value + ' (expected ' + expected + ')');
  }
}

function clamp(x) {
  return Math.max(-1, Math.min(1, x));
}

registerProcessor('demodulator', Demodulator);

class Modulator extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);

    this.t = 0;
    this.sampleIndex = 0;
    this.startPhase = 0;
    this.bits = [];

    this.bitDuration = 1 / 1200;
    this.sampleDuration = 1 / sampleRate;

    this.port.onmessage = (event) => {
      if(event.data.bits) {
        this.bits.push(...event.data.bits);
      }
    };
  }

  process (inputs, outputs, parameters) {
    const output = outputs[0];
    output.forEach(channel => {
      for (let i = 0; i < channel.length; i++) {
        if(this.bits.length === 0) {
          return;
        }
        // Second output - 1 when sending, 0 when idle.
//      if(outputs.length > 1) {
//        outputs[1][0][i] = 1;
//      }
        const freq = this.bits[0] ? 1200 : 2200;
        const phase = this.startPhase + 2 * Math.PI * this.sampleIndex * freq / sampleRate;
        channel[i] = Math.sin(phase);
        this.sampleIndex++;
        this.t += this.sampleDuration;
        if(this.t >= this.bitDuration) {
          this.startPhase += 2 * Math.PI * this.t * freq;
          this.sampleIndex = 0;
          this.t -= this.bitDuration;
          this.bits.shift();
        }
      }
    });
    return true;
  }
}

registerProcessor('modulator', Modulator);

class Exporter extends AudioWorkletProcessor {
  process (inputs, outputs, parameters) {
    if(inputs[0][0].some(x => x !== 0)) {
      this.port.postMessage(Float32Array.from(inputs[0][0]));
    }
    return true;
  }
}

registerProcessor('exporter', Exporter);


class Demodulator extends AudioWorkletProcessor {
  process (inputs, outputs, parameters) {
    inputs[0].forEach((input, channelIndex) => {
      const markI = new Float32Array(input.length);
      const markQ = new Float32Array(input.length);
      const spaceI = new Float32Array(input.length);
      const spaceQ = new Float32Array(input.length);

      for (let i = 0; i < input.length; i++) {
        markI [i] = input[i] * Math.sin(2 * Math.PI * i * 1200 / sampleRate);
        markQ [i] = input[i] * Math.cos(2 * Math.PI * i * 1200 / sampleRate);
        spaceI[i] = input[i] * Math.sin(2 * Math.PI * i * 2200 / sampleRate);
        spaceQ[i] = input[i] * Math.cos(2 * Math.PI * i * 2200 / sampleRate);
      }

      let markIAccum = 0;
      let markQAccum = 0;
      let spaceIAccum = 0;
      let spaceQAccum = 0;

      const numIntegrationSamples = Math.floor(sampleRate / 1200);

      for (let i = 0; i < input.length; i++) {
        markIAccum  += markI[i];
        markQAccum  += markQ[i];
        spaceIAccum += spaceI[i];
        spaceQAccum += spaceQ[i];

        if(i >= numIntegrationSamples) {
          markIAccum  -= markI[i - numIntegrationSamples];
          markQAccum  -= markQ[i - numIntegrationSamples];
          spaceIAccum -= spaceI[i - numIntegrationSamples];
          spaceQAccum -= spaceQ[i - numIntegrationSamples];
        }

        outputs[0][channelIndex][i] =
          Math.min(1, Math.max(-1, 
            0.1 * 
          (markIAccum * markIAccum + markQAccum * markQAccum
          - spaceIAccum * spaceIAccum - spaceQAccum * spaceQAccum)));
      }
    });
    return true;
  }
}

registerProcessor('demodulator', Demodulator);

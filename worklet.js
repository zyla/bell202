class Modulator extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);

    this.t = 0;
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
        const freq = this.bits[0] ? 1200 : 2200;
        const phase = this.startPhase + 2 * Math.PI * this.t * freq;
        channel[i] = Math.sin(phase);
        this.t += this.sampleDuration;
        if(this.t >= this.bitDuration) {
          this.startPhase += 2 * Math.PI * this.t * freq;
          this.t -= this.bitDuration;
          this.bits.shift();
        }
      }
    });
    return true;
  }
}

registerProcessor('modulator', Modulator)

class SineProcessor extends AudioWorkletProcessor {
  constructor() {
    super(arguments);

    this.t = 0;
  }

  process (inputs, outputs, parameters) {
    const output = outputs[0];
    output.forEach(channel => {
      for (let i = 0; i < channel.length; i++) {
        this.t += 1;
        channel[i] = Math.sin(2 * Math.PI * (this.t * parameters.frequency[i]) / sampleRate);
      }
    });
    return true;
  }

  // define the customGain parameter used in process method
  static get parameterDescriptors () {
    return [{
      name: 'frequency',
      defaultValue: 0,
      minValue: 0,
      maxValue: 22050,
      automationRate: 'a-rate'
    }]
  }
}

registerProcessor('sine-processor', SineProcessor)

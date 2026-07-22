class StereoWidthProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "width",
        defaultValue: 1,
        minValue: 0,
        maxValue: 2,
        automationRate: "k-rate",
      },
    ];
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input?.length || !output?.length) {
      return true;
    }

    const leftInput = input[0];
    const rightInput = input[1] || leftInput;
    const leftOutput = output[0];
    const rightOutput = output[1] || output[0];
    const width = parameters.width[0] ?? 1;

    for (let index = 0; index < leftOutput.length; index += 1) {
      const left = leftInput[index] || 0;
      const right = rightInput[index] || 0;
      const center = (left + right) * 0.5;
      const side = (left - right) * 0.5 * width;

      leftOutput[index] = center + side;
      rightOutput[index] = center - side;
    }

    return true;
  }
}

registerProcessor("stereo-width", StereoWidthProcessor);

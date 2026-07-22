export function makeImpulseResponse(
  context: AudioContext,
  durationSeconds: number,
  decay: number,
): AudioBuffer {
  const length = Math.floor(context.sampleRate * durationSeconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);

  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      const envelope = Math.pow(1 - index / length, decay);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return impulse;
}

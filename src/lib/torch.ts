// Torch / flashlight helper using the experimental MediaStreamTrack torch API.
// Works on Chrome Android (and most modern Android browsers). On iOS Safari
// this API is not exposed; when compiled with Capacitor a native plugin can
// be added later.

export const isTorchSupported = async (): Promise<boolean> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
    const track = stream.getVideoTracks()[0];
    const caps = (track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }) ?? {};
    stream.getTracks().forEach(t => t.stop());
    return Boolean(caps.torch);
  } catch {
    return false;
  }
};

export const setTorch = async (stream: MediaStream | null, on: boolean): Promise<boolean> => {
  if (!stream) return false;
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const caps = (track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }) ?? {};
  if (!caps.torch) return false;
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet & { torch: boolean }] });
    return true;
  } catch {
    return false;
  }
};

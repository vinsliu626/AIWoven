export type RecordingBatchConfig = {
  sliceMs: number;
  /** Flush a batch once speech is followed by this much silence. */
  silenceMs: number;
  /** Upper bound on one batch, so client memory and request size stay bounded. */
  maxBatchMs: number;
};

export type RecorderSlice<T> = {
  value: T;
  hasSpeech: boolean;
};

export type RecordingBatch<T> = {
  sequenceIndex: number;
  slices: T[];
  sliceCount: number;
};

export function computeRms(samples: ArrayLike<number>) {
  const len = samples.length || 0;
  if (len === 0) return 0;

  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    const value = Number(samples[i]) || 0;
    sum += value * value;
  }
  return Math.sqrt(sum / len);
}

/**
 * Groups MediaRecorder timeslice blobs into upload batches without ever
 * discarding one.
 *
 * MediaRecorder slices are byte ranges of a single container stream (WebM or
 * Ogg), not standalone files: the first slice carries the container header and
 * later slices only make sense after it. The server rebuilds the recording by
 * concatenating batches in sequence order, so every slice must be uploaded,
 * in order, exactly once. Silence detection is used only to choose where a
 * batch ends (at a pause after speech), never to drop audio.
 */
export function createRecordingChunkBatcher<T>(config: RecordingBatchConfig) {
  const sliceMs = Math.max(50, Math.round(config.sliceMs));
  const silenceSlices = Math.max(1, Math.ceil(Math.max(sliceMs, config.silenceMs) / sliceMs));
  const maxBatchSlices = Math.max(1, Math.ceil(Math.max(sliceMs, config.maxBatchMs) / sliceMs));

  let pending: T[] = [];
  let heardSpeech = false;
  let trailingSilentSlices = 0;
  let nextSequenceIndex = 0;

  const takeBatch = (): RecordingBatch<T> | null => {
    if (pending.length === 0) return null;
    const batch: RecordingBatch<T> = {
      sequenceIndex: nextSequenceIndex,
      slices: pending,
      sliceCount: pending.length,
    };
    nextSequenceIndex += 1;
    pending = [];
    heardSpeech = false;
    trailingSilentSlices = 0;
    return batch;
  };

  return {
    push(slice: RecorderSlice<T>) {
      pending.push(slice.value);
      if (slice.hasSpeech) {
        heardSpeech = true;
        trailingSilentSlices = 0;
      } else {
        trailingSilentSlices += 1;
      }

      if (pending.length >= maxBatchSlices) return takeBatch();
      if (heardSpeech && trailingSilentSlices >= silenceSlices) return takeBatch();
      return null;
    },

    flush() {
      return takeBatch();
    },

    getSequenceIndex() {
      return nextSequenceIndex;
    },
  };
}

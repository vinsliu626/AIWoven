"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { computeRms, createSpeechSegmenter } from "./audioVad";

export type NoteTab = "upload" | "record" | "text";
export type NotePhase = "idle" | "uploading" | "transcribing" | "organizing" | "finalizing" | "done" | "error";

const UPLOAD_CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_ATTEMPTS = 3;

export function useNoteController({
  locked,
  isLoadingGlobal,
  isZh,
  onUsageRefresh,
}: {
  locked: boolean;
  isLoadingGlobal: boolean;
  isZh: boolean;
  onUsageRefresh?: () => Promise<void> | void;
}) {
  const RECORDER_SLICE_MS = 250;
  const VAD_POLL_MS = 50;
  const VAD_SILENCE_MS = 650;
  const VAD_PRE_SPEECH_PAD_MS = 250;
  const VAD_POST_SPEECH_PAD_MS = 250;
  const VAD_ENERGY_THRESHOLD = 0.02;
  const MAX_SPEECH_SEGMENT_MS = 30_000;

  const finalizeAbortRef = useRef(false);
  const [tab, setTab] = useState<NoteTab>("upload");

  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [recordSecs, setRecordSecs] = useState(0);
  const timerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [resultComplete, setResultComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [finalizeStage, setFinalizeStage] = useState<string>("idle");
  const [finalizeProgress, setFinalizeProgress] = useState<number>(0);
  const [displayStage, setDisplayStage] = useState<string>("idle");
  const [displayProgress, setDisplayProgress] = useState<number>(0);
  const [phase, setPhase] = useState<NotePhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorTraceId, setErrorTraceId] = useState<string | null>(null);

  const [noteId, setNoteId] = useState<string | null>(null);
  const [uploadedChunks, setUploadedChunks] = useState(0);
  const [chunkError, setChunkError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState("");

  const uploadingRef = useRef<Promise<void>>(Promise.resolve());
  const chunkIndexRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const sliceSpeechDetectedRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordedDurationMsRef = useRef<number | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const uploadRequestRef = useRef<XMLHttpRequest | null>(null);
  const speechSegmenterRef = useRef(
    createSpeechSegmenter<Blob>({
      sliceMs: RECORDER_SLICE_MS,
      silenceMs: VAD_SILENCE_MS,
      preSpeechPadMs: VAD_PRE_SPEECH_PAD_MS,
      postSpeechPadMs: VAD_POST_SPEECH_PAD_MS,
      maxSegmentMs: MAX_SPEECH_SEGMENT_MS,
    })
  );

  const canGenerate = useMemo(() => {
    if (locked) return false;
    if (loading || isLoadingGlobal) return false;
    if (tab === "upload") return !!file;
    if (tab === "record") return !!noteId && !recording && uploadedChunks > 0 && !chunkError;
    return text.trim().length > 0;
  }, [tab, file, text, loading, isLoadingGlobal, locked, noteId, recording, uploadedChunks, chunkError]);

  function friendlyMessageFromApi(payload: any, fallback: string) {
    const code = String(payload?.error || "");
    if (code === "NOTE_DAILY_LIMIT_REACHED") {
      return isZh ? "今天的 AI Note 次数已经用完了。" : "You've used all AI Note generations for today.";
    }
    if (code === "NOTE_COOLDOWN_ACTIVE") {
      return isZh ? "请稍等片刻后再试。" : "Please wait a moment before sending another request.";
    }
    if (code === "NOTE_INPUT_TOO_LARGE") {
      return isZh ? "这段文本超过了当前套餐限制。" : "This text is too long for your current plan.";
    }
    const traceId = String(payload?.traceId || "").trim();
    if (traceId) setErrorTraceId(traceId);
    return payload?.message || fallback;
  }

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanupStream() {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
  }

  function stopVadTimer() {
    if (vadTimerRef.current) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }

  function cleanupAudioProcessing() {
    stopVadTimer();
    try {
      audioSourceRef.current?.disconnect();
    } catch {}
    try {
      analyserRef.current?.disconnect();
    } catch {}
    audioSourceRef.current = null;
    analyserRef.current = null;

    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx && ctx.state !== "closed") {
      void ctx.close().catch(() => {});
    }

    sliceSpeechDetectedRef.current = false;
  }

  function resetAll() {
    setError(null);
    setErrorTraceId(null);
    setResult("");
    setResultComplete(false);
    setSuccess(null);
  }

  function resetProgress() {
    setFinalizeStage("idle");
    setFinalizeProgress(0);
    setDisplayStage("idle");
    setDisplayProgress(0);
    setPhase("idle");
    setUploadProgress(0);
  }

  async function startRecording() {
    if (locked) {
      setError(isZh ? "请先登录后使用 AI Note。" : "Please sign in to use AI Notes.");
      return;
    }
    if (recording || loading || isLoadingGlobal) return;

    resetAll();
    setChunkError(null);
    setUploadedChunks(0);
    setLiveTranscript("");
    setRecordSecs(0);
    setNoteId(null);
    resetProgress();
    recordingStartedAtRef.current = null;
    recordedDurationMsRef.current = null;

    uploadingRef.current = Promise.resolve();
    chunkIndexRef.current = 0;
    speechSegmenterRef.current = createSpeechSegmenter<Blob>({
      sliceMs: RECORDER_SLICE_MS,
      silenceMs: VAD_SILENCE_MS,
      preSpeechPadMs: VAD_PRE_SPEECH_PAD_MS,
      postSpeechPadMs: VAD_POST_SPEECH_PAD_MS,
      maxSegmentMs: MAX_SPEECH_SEGMENT_MS,
    });
    sliceSpeechDetectedRef.current = false;

    try {
      const startRes = await fetch("/api/ai-note/start", { method: "POST" });
      const startJson = await startRes.json().catch(() => null);
      if (!startRes.ok || !startJson?.ok || !startJson?.noteId) {
        throw new Error(startJson?.error || `start failed: ${startRes.status}`);
      }
      const nid = String(startJson.noteId);
      setNoteId(nid);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("AudioContext is not supported in this browser.");
      }

      const audioContext = new AudioContextCtor();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.1;
      source.connect(analyser);
      audioSourceRef.current = source;
      analyserRef.current = analyser;

      const waveform = new Float32Array(analyser.fftSize);
      vadTimerRef.current = window.setInterval(() => {
        try {
          analyser.getFloatTimeDomainData(waveform);
          if (computeRms(waveform) >= VAD_ENERGY_THRESHOLD) {
            sliceSpeechDetectedRef.current = true;
          }
        } catch {}
      }, VAD_POLL_MS);

      const preferredTypes = ["audio/ogg;codecs=opus", "audio/ogg", "audio/webm;codecs=opus", "audio/webm"];
      const mimeType = preferredTypes.find((value) => MediaRecorder.isTypeSupported(value));
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      const queueSpeechSegmentUpload = (segmentBlobs: Blob[], sequenceIndex: number) => {
        if (segmentBlobs.length === 0) return;

        const merged = new Blob(segmentBlobs, { type: mr.mimeType || segmentBlobs[0]?.type || "audio/webm" });
        if (merged.size === 0) return;

        const type = merged.type || mr.mimeType || "audio/webm";
        const ext = type.includes("ogg") ? "ogg" : "webm";
        const fileChunk = new File([merged], `chunk-${sequenceIndex}.${ext}`, { type });

        uploadingRef.current = uploadingRef.current.then(async () => {
          try {
            const fd = new FormData();
            fd.append("noteId", nid);
            fd.append("chunkIndex", String(sequenceIndex));
            fd.append("file", fileChunk, fileChunk.name);

            const response = await fetch(`/api/ai-note/chunk?noteId=${encodeURIComponent(nid)}&chunkIndex=${sequenceIndex}`, {
              method: "POST",
              credentials: "include",
              body: fd,
            });

            const raw = await response.text();
            let json: any = null;
            try {
              json = raw ? JSON.parse(raw) : null;
            } catch {
              json = null;
            }

            if (!response.ok || json?.ok === false) {
              throw new Error(json?.error || json?.message || raw.slice(0, 300) || `chunk upload failed: ${response.status}`);
            }

            setUploadedChunks((count) => count + 1);
            chunkIndexRef.current = Math.max(chunkIndexRef.current, sequenceIndex + 1);
            if (json?.transcript) {
              setLiveTranscript((prev) => (prev ? `${prev}\n${String(json.transcript)}` : String(json.transcript)));
            }
          } catch (uploadError: any) {
            setChunkError(uploadError?.message || "chunk upload error");
          }
        });
      };

      mr.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        if (!nid) return;

        const segment = speechSegmenterRef.current.push({
          value: event.data,
          hasSpeech: sliceSpeechDetectedRef.current,
        });
        sliceSpeechDetectedRef.current = false;

        if (segment) {
          queueSpeechSegmentUpload(segment.slices, segment.sequenceIndex);
        }
      };

      mr.onstop = async () => {
        stopTimer();
        if (recordingStartedAtRef.current) {
          recordedDurationMsRef.current = Math.max(1, Date.now() - recordingStartedAtRef.current);
          recordingStartedAtRef.current = null;
        }
        const finalSegment = speechSegmenterRef.current.flush();
        if (finalSegment) {
          queueSpeechSegmentUpload(finalSegment.slices, finalSegment.sequenceIndex);
        }
        try {
          await uploadingRef.current;
        } catch {}
        cleanupAudioProcessing();
        cleanupStream();
        setRecording(false);
      };

      mr.start(RECORDER_SLICE_MS);
      setRecording(true);
      recordingStartedAtRef.current = Date.now();
      timerRef.current = window.setInterval(() => setRecordSecs((value) => value + 1), 1000);
    } catch (recordError: any) {
      cleanupAudioProcessing();
      cleanupStream();
      setRecording(false);
      setError(recordError?.message || (isZh ? "无法访问麦克风或当前浏览器不支持录音。" : "Cannot access microphone or the browser does not support recording."));
    }
  }

  async function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    try {
      if (recorder.state === "recording") {
        if (recordingStartedAtRef.current) {
          recordedDurationMsRef.current = Math.max(1, Date.now() - recordingStartedAtRef.current);
        }
        try {
          recorder.requestData();
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      recorder.stop();
    } catch {
      stopTimer();
      cleanupAudioProcessing();
      cleanupStream();
      setRecording(false);
    }
  }

  function onPickFile(nextFile: File | null) {
    resetAll();
    resetProgress();

    if (!nextFile) {
      setFile(null);
      return;
    }

    const name = nextFile.name.toLowerCase();
    const okExt =
      name.endsWith(".mp3") ||
      name.endsWith(".wav") ||
      name.endsWith(".m4a") ||
      name.endsWith(".mp4") ||
      name.endsWith(".webm") ||
      name.endsWith(".ogg") ||
      name.endsWith(".aac") ||
      name.endsWith(".flac");
    const okMime = !nextFile.type || nextFile.type.startsWith("audio/") || nextFile.type === "video/mp4";

    if (!okExt || !okMime) {
      setError(isZh ? "仅支持常见音频格式：mp3 / wav / m4a / mp4 / webm / ogg / aac / flac" : "Supported: mp3 / wav / m4a / mp4 / webm / ogg / aac / flac");
      setFile(null);
      return;
    }

    if (nextFile.size > MAX_UPLOAD_BYTES) {
      setError(isZh ? "音频文件必须小于 100 MB。" : "Choose an audio file smaller than 100 MB.");
      setFile(null);
      return;
    }

    setFile(nextFile);
  }

  function parseApiPayload(raw: string, responseTraceId?: string | null) {
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      payload = null;
    }
    if (!payload || typeof payload !== "object") payload = {};
    if (!payload.traceId && responseTraceId) payload.traceId = responseTraceId;
    return payload;
  }

  function uploadPart({
    noteId: activeNoteId,
    part,
    index,
    completedBytes,
    totalBytes,
    signal,
  }: {
    noteId: string;
    part: Blob;
    index: number;
    completedBytes: number;
    totalBytes: number;
    signal: AbortSignal;
  }) {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadRequestRef.current = xhr;
      const abort = () => xhr.abort();
      signal.addEventListener("abort", abort, { once: true });

      xhr.open("POST", "/api/ai-note/chunk");
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const loaded = Math.min(part.size, event.loaded);
        setUploadProgress(Math.min(100, Math.round(((completedBytes + loaded) / totalBytes) * 100)));
      };
      xhr.onerror = () => reject(new Error("Network interruption while uploading audio."));
      xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
      xhr.onload = () => {
        signal.removeEventListener("abort", abort);
        uploadRequestRef.current = null;
        const payload = parseApiPayload(xhr.responseText, xhr.getResponseHeader("x-trace-id") || xhr.getResponseHeader("x-vercel-id"));
        if (xhr.status < 200 || xhr.status >= 300 || payload?.ok === false) {
          const apiError = new Error(friendlyMessageFromApi(payload, "Unable to upload the audio file."));
          Object.assign(apiError, { status: xhr.status });
          reject(apiError);
          return;
        }
        resolve();
      };

      const form = new FormData();
      form.append("noteId", activeNoteId);
      form.append("chunkIndex", String(index));
      form.append("file", part, `part-${index}.bin`);
      xhr.send(form);
    });
  }

  async function uploadAudioFile(activeFile: File) {
    const totalChunks = Math.ceil(activeFile.size / UPLOAD_CHUNK_BYTES);
    const startResponse = await fetch("/api/ai-note/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceType: "upload", name: activeFile.name, mime: activeFile.type, size: activeFile.size, totalChunks }),
    });
    const startRaw = await startResponse.text();
    const startPayload = parseApiPayload(startRaw, startResponse.headers.get("x-trace-id") || startResponse.headers.get("x-vercel-id"));
    if (!startResponse.ok || !startPayload?.ok || !startPayload?.noteId) {
      throw new Error(friendlyMessageFromApi(startPayload, "Unable to start the audio upload."));
    }

    const activeNoteId = String(startPayload.noteId);
    setNoteId(activeNoteId);
    setUploadedChunks(0);
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setPhase("uploading");
    setDisplayStage("uploading");
    setUploadProgress(0);

    for (let index = 0; index < totalChunks; index += 1) {
      const start = index * UPLOAD_CHUNK_BYTES;
      const part = activeFile.slice(start, Math.min(activeFile.size, start + UPLOAD_CHUNK_BYTES), activeFile.type || "application/octet-stream");
      let lastError: unknown = null;
      for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
        try {
          await uploadPart({ noteId: activeNoteId, part, index, completedBytes: start, totalBytes: activeFile.size, signal: controller.signal });
          lastError = null;
          break;
        } catch (partError: any) {
          lastError = partError;
          const status = Number(partError?.status || 0);
          const retryable = !status || status === 429 || status >= 500;
          if (!retryable || attempt === MAX_UPLOAD_ATTEMPTS || controller.signal.aborted) break;
          await new Promise((resolve) => window.setTimeout(resolve, 400 * 2 ** (attempt - 1)));
        }
      }
      if (lastError) throw lastError;
      setUploadedChunks(index + 1);
      setUploadProgress(Math.round(((index + 1) / totalChunks) * 100));
    }

    uploadAbortRef.current = null;
    uploadRequestRef.current = null;
    return { noteId: activeNoteId, expectedChunks: totalChunks, expectedBytes: activeFile.size };
  }

  async function cancelGeneration() {
    finalizeAbortRef.current = true;
    uploadAbortRef.current?.abort();
    uploadRequestRef.current?.abort();
    uploadAbortRef.current = null;
    uploadRequestRef.current = null;
    const activeNoteId = noteId;
    setLoading(false);
    setPhase("idle");
    setDisplayStage("idle");
    setDisplayProgress(0);
    setUploadProgress(0);
    setError(null);
    if (activeNoteId) {
      void fetch("/api/ai-note/start", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: activeNoteId }),
      }).catch(() => {});
    }
    setNoteId(null);
    setUploadedChunks(0);
  }

  async function generateNotes() {
    if (locked) {
      setError(isZh ? "请先登录后使用 AI Note。" : "Please sign in to use AI Notes.");
      return;
    }
    if (!canGenerate) return;
    if (tab === "record" && chunkError) {
      setError(isZh ? `分片上传出错：${chunkError}` : `Chunk upload error: ${chunkError}`);
      return;
    }

    setLoading(true);
    setError(null);
    setResult("");
    setResultComplete(false);
    setSuccess(null);
    setErrorTraceId(null);

    try {
      if (tab === "text") {
        setPhase("organizing");
        setDisplayStage("organizing");
        const response = await fetch("/api/ai-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputType: "text", text: text.trim() }),
        });

        const raw = await response.text();
        const data = parseApiPayload(raw, response.headers.get("x-trace-id") || response.headers.get("x-vercel-id"));
        if (!response.ok || data?.ok === false) {
          throw new Error(friendlyMessageFromApi(data, isZh ? "生成笔记失败。" : "Unable to generate notes."));
        }

        setPhase("done");
        setDisplayStage("done");
        setDisplayProgress(100);
        setResult(String(data?.note ?? data?.result ?? ""));
        setResultComplete(true);
        setSuccess(isZh ? "笔记已生成。" : "Notes generated.");
        onUsageRefresh?.();
        return;
      }

      let processingNoteId = noteId;
      let inputType: "upload" | "record" = "record";
      let expectedChunks: number | undefined;
      let expectedBytes: number | undefined;

      if (tab === "upload") {
        if (!file) throw new Error(isZh ? "缺少上传文件。" : "Missing file.");
        const uploaded = await uploadAudioFile(file);
        processingNoteId = uploaded.noteId;
        expectedChunks = uploaded.expectedChunks;
        expectedBytes = uploaded.expectedBytes;
        inputType = "upload";
      }

      if (!processingNoteId) {
        throw new Error(isZh ? "缺少 noteId，请重新开始录音。" : "Missing noteId. Please start recording again.");
      }
      if (tab === "record" && recording) {
        throw new Error(isZh ? "请先停止录音，再生成笔记。" : "Stop recording before generating notes.");
      }
      if (tab === "record" && uploadedChunks <= 0) {
        throw new Error(isZh ? "还没有上传任何分片。" : "No chunks uploaded yet.");
      }

      try {
        await uploadingRef.current;
      } catch {}

      finalizeAbortRef.current = false;
      setFinalizeStage("asr");
      setFinalizeProgress(1);
      setPhase("transcribing");
      setDisplayStage("extracting");
      setDisplayProgress(0);

      const maxAttempts = 180;
      let finalNote = "";

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (finalizeAbortRef.current) {
          throw new Error(isZh ? "生成已取消。" : "Generation cancelled.");
        }

        const response = await fetch("/api/ai-note/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: processingNoteId,
            inputType,
            expectedChunks,
            expectedBytes,
            totalDurationMs: inputType === "record" ? recordedDurationMsRef.current ?? Math.max(1, recordSecs * 1000) : undefined,
          }),
        });

        const raw = await response.text();
        let json: any = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch {
          json = null;
        }

        if (!response.ok || json?.ok === false) {
          const retryAfterMs = Number(json?.retryAfterMs) || Number(json?.extra?.retryAfterMs) || 1500;
          const retryable = response.status === 202 || json?.error === "LOCKED";
          if (retryable && attempt < maxAttempts - 1) {
            await new Promise((resolve) => window.setTimeout(resolve, retryAfterMs));
            continue;
          }

          const nextProgress = Number.isFinite(json?.progress) ? Number(json.progress) : displayProgress;
          setFinalizeStage("failed");
          setFinalizeProgress(nextProgress);
          setDisplayStage("failed");
          setDisplayProgress(nextProgress);
          throw new Error(friendlyMessageFromApi(json, raw.slice(0, 300) || `Finalize error: ${response.status}`));
        }

        const nextStage = String(json?.stage || "done");
        const nextProgress = Number.isFinite(json?.progress) ? Number(json.progress) : 100;
        const partialNote = String(json?.partialNote || "").trim();
        setFinalizeStage(nextStage);
        setFinalizeProgress(nextProgress);
        setDisplayStage(
          nextStage === "asr"
            ? "extracting"
            : nextStage === "llm"
            ? "summarizing"
            : nextStage === "merge"
            ? "merge"
            : nextStage === "done"
            ? "formatting"
            : nextStage
        );
        setPhase(nextStage === "asr" ? "transcribing" : nextStage === "merge" || nextStage === "done" ? "finalizing" : "organizing");
        setDisplayProgress(nextProgress);
        if (partialNote) {
          setResult(partialNote);
          setResultComplete(false);
        }

        if (nextStage === "done") {
          finalNote = String(json?.note ?? json?.result ?? "");
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }

      if (!finalNote) {
        throw new Error(isZh ? "生成超时，请稍后重试。" : "Note generation timed out before completion.");
      }

      setDisplayStage("done");
      setDisplayProgress(100);
      setPhase("done");
      setResult(finalNote);
      setResultComplete(true);
      setSuccess(isZh ? "笔记已生成。" : "Notes generated.");
      onUsageRefresh?.();
    } catch (generateError: any) {
      if (generateError?.name === "AbortError") {
        setError(null);
        setPhase("idle");
        return;
      }
      setDisplayStage("failed");
      setPhase("error");
      setError(generateError?.message || (isZh ? "生成失败。" : "Failed to generate notes."));
    } finally {
      uploadAbortRef.current = null;
      uploadRequestRef.current = null;
      setLoading(false);
    }
  }

  function switchTab(next: NoteTab) {
    finalizeAbortRef.current = true;
    uploadAbortRef.current?.abort();
    uploadRequestRef.current?.abort();
    if (recording) {
      try {
        void stopRecording();
      } catch {}
    }

    cleanupAudioProcessing();
    cleanupStream();
    setTab(next);
    resetAll();
    setChunkError(null);
    setUploadedChunks(0);
    setLiveTranscript("");
    setRecordSecs(0);
    setNoteId(null);
    setFile(null);
    recordingStartedAtRef.current = null;
    recordedDurationMsRef.current = null;
    resetProgress();
  }

  useEffect(() => {
    return () => {
      finalizeAbortRef.current = true;
      stopTimer();
      uploadAbortRef.current?.abort();
      uploadRequestRef.current?.abort();
      cleanupAudioProcessing();
      cleanupStream();
    };
  }, []);

  return {
    tab,
    file,
    text,
    recording,
    recordSecs,
    loading,
    result,
    resultComplete,
    error,
    success,
    finalizeStage,
    finalizeProgress,
    displayStage,
    displayProgress,
    phase,
    uploadProgress,
    errorTraceId,
    noteId,
    uploadedChunks,
    chunkError,
    liveTranscript,
    canGenerate,
    setText,
    onPickFile,
    startRecording,
    stopRecording,
    generateNotes,
    switchTab,
    resetAll,
    cancelGeneration,
  };
}

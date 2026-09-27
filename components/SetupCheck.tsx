"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "starting" | "ready" | "error";

/** Explains why the browser couldn't use the camera or microphone. */
function describe(err: unknown) {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Your browser blocked the camera and microphone. Click the camera or lock icon in the address bar, allow access, then press Try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "We couldn't find a camera or microphone. Check one is plugged in (or switched on), then press Try again.";
  }
  if (name === "NotReadableError" || name === "AbortError") {
    return "Your camera or microphone is being used by another app. Close apps like Zoom or Teams, then press Try again.";
  }
  return "Something stopped the check from starting. Try another browser such as Chrome, Edge, Safari or Firefox.";
}

/** Camera preview, microphone level and a test sound — all in the browser, nothing is sent anywhere. */
export function SetupCheck() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [heardMic, setHeardMic] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [micId, setMicId] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);

  const supported =
    typeof window === "undefined" ||
    (Boolean(navigator.mediaDevices?.getUserMedia) && typeof RTCPeerConnection !== "undefined" && window.isSecureContext);

  function stop() {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioRef.current?.close().catch(() => {});
    audioRef.current = null;
  }

  useEffect(() => stop, []);

  async function start(camera = cameraId, mic = micId) {
    stop();
    setStatus("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: camera ? { deviceId: { exact: camera } } : true,
        audio: mic ? { deviceId: { exact: mic } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      // Microphone level from the live audio.
      const ctx = new AudioContext();
      audioRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const loop = () => {
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        const value = Math.min(1, peak / 64);
        setLevel(value);
        if (value > 0.15) setHeardMic(true);
        frameRef.current = requestAnimationFrame(loop);
      };
      loop();

      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === "videoinput"));
      setMics(devices.filter((d) => d.kind === "audioinput"));
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? "");
      setMicId(stream.getAudioTracks()[0]?.getSettings().deviceId ?? "");
      setStatus("ready");
    } catch (err) {
      stop();
      setError(describe(err));
      setStatus("error");
    }
  }

  function playTestSound() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 523.25;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1);
    osc.onended = () => void ctx.close();
  }

  if (!supported) {
    return (
      <div role="alert" className="pt-alert is-warn">
        <p>This browser can&apos;t do video calls. Please use an up-to-date Chrome, Edge, Safari or Firefox.</p>
      </div>
    );
  }

  return (
    <div className="sc">
      <div className={`sc-video ${status === "ready" ? "is-live" : ""}`}>
        <video ref={videoRef} autoPlay playsInline muted aria-label="Your camera preview" />
        {status !== "ready" && <p className="pt-muted pt-small">Your camera preview appears here</p>}
      </div>

      {status === "ready" ? (
        <>
          <div className="sc-row">
            <span className="pt-small">Microphone</span>
            <div className="sc-meter" role="meter" aria-label="Microphone level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
              <span style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
          </div>
          <ul className="sc-checks">
            <li className="is-ok">Camera working</li>
            <li className={heardMic ? "is-ok" : ""}>{heardMic ? "Microphone working" : "Say something — the bar should move"}</li>
          </ul>
          {(cameras.length > 1 || mics.length > 1) && (
            <div className="pt-field-grid">
              {cameras.length > 1 && (
                <div className="pt-field">
                  <label htmlFor="sc-camera">Camera</label>
                  <select id="sc-camera" value={cameraId} onChange={(e) => void start(e.target.value, micId)}>
                    {cameras.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {mics.length > 1 && (
                <div className="pt-field">
                  <label htmlFor="sc-mic">Microphone</label>
                  <select id="sc-mic" value={micId} onChange={(e) => void start(cameraId, e.target.value)}>
                    {mics.map((d, i) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <div className="pt-btn-row">
            <button type="button" className="pt-btn pt-btn-secondary" onClick={playTestSound}>
              Play a test sound
            </button>
            <button type="button" className="pt-btn pt-btn-secondary" onClick={() => { stop(); setStatus("idle"); setLevel(0); setHeardMic(false); }}>
              Stop the check
            </button>
          </div>
          <p className="pt-muted pt-small">
            Heard the sound and saw the bar move? You&apos;re all set. In the call, your browser may ask for permission again —
            choose Allow.
          </p>
        </>
      ) : (
        <>
          {error && (
            <div role="alert" className="pt-alert is-warn">
              <p>{error}</p>
            </div>
          )}
          <button type="button" className="pt-btn pt-btn-primary" disabled={status === "starting"} onClick={() => void start()}>
            {status === "starting" ? "Starting…" : error ? "Try again" : "Start the check"}
          </button>
          <p className="pt-muted pt-small">Your browser will ask to use your camera and microphone. Nothing is recorded or sent anywhere.</p>
        </>
      )}
    </div>
  );
}

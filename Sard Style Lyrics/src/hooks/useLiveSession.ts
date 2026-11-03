import { useEffect, useRef, useState } from "react";
import type {
  AppStatus,
  AudioSnapshot,
  Lyrics,
  MediaSnapshot,
  Track,
} from "../types";
import { PlaybackClock } from "../engine/clock";
import { LrclibProvider, recordingKey, cacheLyrics } from "../services/lyrics";
import { parseRecord } from "../lyrics/record";
import { errorMessage, retryDelay } from "../services/errors";
import * as native from "../services/native";

const provider = new LrclibProvider();
/** One live source: session metadata -> timed lyrics -> verified/estimated playback clock. */
export function useLiveSession(device: string) {
  const [enabled, setEnabled] = useState(true);
  const [status, setStatus] = useState<AppStatus>("Listening");
  const [track, setTrack] = useState<Track | null>(null);
  const [lyrics, setLyrics] = useState<Lyrics | null>(null);
  const [audio, setAudio] = useState<AudioSnapshot | null>(null);
  const [timelineUsable, setTimelineUsable] = useState(false);
  const [note, setNote] = useState(
    "Listening automatically. Play a song in your usual player.",
  );
  const clock = useRef(new PlaybackClock()).current,
    level = useRef(0);
  const [tryingAlternative,setTryingAlternative]=useState(false);
  const retryAction=useRef<()=>void>(()=>{});
  const captureQueue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    let disposed = false,
      busy = false,
      timer: ReturnType<typeof setInterval> | undefined,
      meterTimer: ReturnType<typeof setInterval> | undefined;
    let meterBusy=false;
    let key = "",
      loading = false,
      currentLyrics: Lyrics | null = null,
      nextLookup = Infinity,
      lastMedia = false,
      recognizing = false,
      nextRecognition = 0,
      revision = 0,
      usable = false;
    let alternativeNotice="";
    let sourceTrack: Track|null=null;
    const rejected=new Set<string>();
    let controller: AbortController | null = null,
      recognitionConfigured = false;
    retryAction.current=()=>{};
    setTryingAlternative(false);
    clock.reset();
    level.current = 0;
    setTimelineUsable(false);
    setAudio(null);
    setTrack(null);
    setLyrics(null);
    if (!enabled) {
      setStatus("Waiting for audio");
      setNote(
        "Listening is paused. Resume to follow your music automatically.",
      );
      return;
    }
    if (!native.native) {
      setStatus("Audio device unavailable");
      setNote(
        "Open the Windows desktop application to follow system audio automatically.",
      );
      return;
    }
    setStatus("Listening");
    setNote("Listening automatically. Waiting for your player…");

    async function lookup(song: Track, alternate=false) {
      controller?.abort();
      const ac = new AbortController();
      controller = ac;
      const expected = key;
      loading = true;
      nextLookup = Infinity;
      if (!alternate) {currentLyrics=null;setLyrics(null);}
      alternativeNotice="";
      setTryingAlternative(alternate);
      setStatus("Searching lyrics");
      setNote("Finding synchronized lyrics automatically…");
      try {
        const record = alternate ? await provider.alternative(song,rejected,ac.signal) : await provider.get(song, ac.signal, (message) => {
          if (!disposed && !ac.signal.aborted && key === expected)
            setNote(message);
        });
        if (disposed || ac.signal.aborted || key !== expected) return;
        if(alternate&&!record){setStatus(currentLyrics?(usable?'Visualizing':'Synchronizing'):'Lyrics unavailable');alternativeNotice='Δεν βρέθηκε άλλη συγχρονισμένη εκδοχή.';setNote(alternativeNotice);return;}
        const parsed = record
          ? parseRecord(record, song.duration || record.duration)
          : null;
        if (!parsed?.lines.some((line) => line.words.length)) {
          nextLookup = record?.instrumental ? Infinity : Date.now() + 300000;
          setStatus("Lyrics unavailable");
          setNote(
            record?.instrumental
              ? "Instrumental track — no lyrics."
              : "No synchronized lyrics are available for this recording. The app will check again automatically.",
          );
          return;
        }
        if(record){rejected.add(recordingKey(record));cacheLyrics(song,record);}
        alternativeNotice="";
        currentLyrics = parsed;
        setLyrics(parsed);
        if (record)
          setTrack({
            ...song,
            title: record.trackName,
            artist: record.artistName,
            album: record.albumName,
          });
        setStatus(usable ? "Visualizing" : "Synchronizing");
        setNote(
          usable ? "" : "Waiting for a playback position from your player.",
        );
      } catch (error) {
        if (!disposed && !ac.signal.aborted && key === expected) {
          nextLookup = Date.now() + Math.max(60000, retryDelay(error) ?? 0);
          setStatus("Lyrics unavailable");
          setNote(errorMessage(error) + " The app will retry automatically.");
        }
      } finally {
        if (controller === ac) {loading=false;if(!disposed)setTryingAlternative(false);}
      }
    }
    retryAction.current=()=>{if(sourceTrack&&!loading)void lookup(sourceTrack,true);};
    function accept(media: MediaSnapshot) {
      sourceTrack=media.track;
      lastMedia = true;
      const changed = key !== media.track.id;
      if (changed) {
        rejected.clear();
        alternativeNotice="";
        revision++;
        key = media.track.id;
        controller?.abort();
        currentLyrics = null;
        clock.reset();
        setLyrics(null);
        setTrack(media.track);
      }
      const valid =
        media.timelineValid &&
        Number.isFinite(media.position) &&
        media.position >= 0;
      if (valid)
        clock.update(
          media.track.id,
          media.position,
          media.playing,
          "media",
          media.playbackRate,
        );
      else clock.reset();
      usable = valid;
      setTimelineUsable(valid);
      if (changed || (!loading && !currentLyrics && Date.now() >= nextLookup))
        void lookup(media.track);
      else if (!loading && currentLyrics) {
        setStatus(valid ? "Visualizing" : "Synchronizing");
        setNote(
          valid
            ? alternativeNotice
            : "Your player shares the song but not a usable playback position. Waiting for its timeline…",
        );
      }
    }
    async function recognize() {
      if (recognizing || !recognitionConfigured || Date.now() < nextRecognition)
        return;
      recognizing = true;
      nextRecognition = Date.now() + 30000;
      setStatus("Recognizing song");
      const expectedRevision = revision;
      try {
        const result = await native.recognizeAudio();
        if (disposed || lastMedia || revision !== expectedRevision) return;
        if (!result || result.confidence < 0.65) {
          clock.pause();
          setTimelineUsable(false);
          setStatus("Recognition failed");
          setNote(
            "No confident song match yet. Listening will continue automatically.",
          );
          return;
        }
        sourceTrack=result.track;
        const changed = key !== result.track.id;
        if(changed)rejected.clear();
        if (changed) {
          key = result.track.id;
          clock.reset();
          setTrack(result.track);
          setLyrics(null);
          currentLyrics = null;
        }
        const valid =
          typeof result.position === "number" &&
          Number.isFinite(result.position) &&
          result.position >= 0;
        if (valid)
          clock.update(result.track.id, result.position!, true, "recognition");
        usable = valid;
        setTimelineUsable(valid);
        if (changed || (!loading && !currentLyrics && Date.now() >= nextLookup))
          void lookup(result.track);
        else if (currentLyrics) {
          setStatus(valid ? "Visualizing" : "Synchronizing");
          setNote(
            valid
              ? ""
              : "Song identified. The recognition source does not supply a playback position.",
          );
        }
      } catch (error) {
        if (!disposed && !lastMedia) {
          const message = errorMessage(error);
          if (message.includes("Collecting an eight-second"))
            nextRecognition = Date.now() + 2000;
          setStatus("Listening");
          setNote(message);
        }
      } finally {
        recognizing = false;
      }
    }
    async function poll() {
      if (disposed || busy) return;
      busy = true;
      try {
        const [a, m] = await Promise.allSettled([
          native.audioSnapshot(),
          native.mediaSnapshot(),
        ]);
        if (disposed) return;
        if (a.status === "fulfilled") {
          setAudio(a.value);
          level.current = a.value.level;
        }
        if (m.status === "fulfilled" && m.value) {
          accept(m.value);
          return;
        }
        const hadMedia = lastMedia;
        lastMedia = false;
        if (hadMedia || clock.source === "media") {
          revision++;
          controller?.abort();
          loading = false;
          key = "";
          currentLyrics = null;
          usable = false;
          sourceTrack=null;
          clock.reset();
          setLyrics(null);
          setTrack(null);
          setTimelineUsable(false);
        }
        if (
          recognitionConfigured &&
          a.status === "fulfilled" &&
          a.value.available &&
          !a.value.silent
        ) {
          void recognize();
          return;
        }
        clock.pause();
        usable = false;
        setTimelineUsable(false);
        if (a.status === "fulfilled" && !a.value.available) {
          setStatus("Audio device unavailable");
          setNote(
            a.value.error ??
              "Waiting for an available output device. Reconnecting automatically…",
          );
        } else if (m.status === "rejected") {
          setStatus("Recognition failed");
          setNote(
            "Windows media-session access failed: " + errorMessage(m.reason),
          );
        } else {
          setStatus("Waiting for audio");
          setNote(
            "Listening automatically. Play a song in a player that shares Windows media information.",
          );
        }
      } finally {
        busy = false;
      }
    }
    captureQueue.current = captureQueue.current
      .catch(() => {})
      .then(async () => {
        if (disposed) return;
        try {
          await native.startCapture(device);
        } catch (error) {
          if (!disposed) {
            setStatus("Audio device unavailable");
            setNote(errorMessage(error));
          }
        }
        if (disposed) return;
        recognitionConfigured = await native
          .recognitionConfigured()
          .catch(() => false);
        if (disposed) return;
        void poll();
        meterTimer=setInterval(async()=>{
          if(disposed||meterBusy)return;meterBusy=true;
          try{const snapshot=await native.audioSnapshot();if(!disposed){setAudio(snapshot);level.current=snapshot.level;}}catch{/* Source poll reports capture errors. */}finally{meterBusy=false;}
        },60);
        timer = setInterval(() => {
          if (clock.source === "media" && clock.age > 5) {
            clock.pause();
            usable = false;
            setTimelineUsable(false);
            setStatus("Synchronizing");
            setNote(
              "Playback timeline interrupted. Reconnecting automatically…",
            );
          }
          void poll();
        }, 500);
      });
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      clearInterval(meterTimer);
      clock.pause();
      captureQueue.current = captureQueue.current
        .catch(() => {})
        .then(() => native.stopCapture())
        .catch(() => {});
    };
  }, [enabled, device, clock]);
  return {
    enabled,
    setEnabled,
    tryingAlternative,
    tryAlternative:()=>retryAction.current(),
    status,
    track,
    lyrics,
    audio,
    timelineUsable,
    note,
    clock,
    level,
  };
}

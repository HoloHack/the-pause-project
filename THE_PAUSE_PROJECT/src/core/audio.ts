import type { ExperienceStore } from './state';

export interface SoundNarrationController { destroy(): void }
const $ = <T extends HTMLElement>(selector: string): T | null => document.querySelector<T>(selector);
const clamp = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** Optional, gesture-initiated synthesis. No external audio or recorded content. */
export function createSoundNarration(store: ExperienceStore): SoundNarrationController {
  const soundButton = $<HTMLButtonElement>('#sound-toggle');
  const voiceButton = $<HTMLButtonElement>('#voice-toggle');
  const pauseButton = $<HTMLButtonElement>('#pause-moment');
  const status = $<HTMLElement>('#media-status');
  const speechSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const AudioCtor = window.AudioContext;
  let context: AudioContext | null = null;
  let compressor: DynamicsCompressorNode | null = null;
  let hum: OscillatorNode | null = null;
  let secondHum: OscillatorNode | null = null;
  let humGain: GainNode | null = null;
  let voiceActive = false;
  let lastTick = 0;
  let destroyed = false;
  let lastChapter = '';
  let chordCooldown = 0;

  const setStatus = (message: string): void => { if (status) status.textContent = message; };
  const syncButtons = (): void => {
    if (soundButton) {
      soundButton.setAttribute('aria-pressed', String(store.snapshot.audioEnabled));
      soundButton.textContent = store.snapshot.audioEnabled ? 'SOUND ON' : 'SOUND OFF';
    }
    if (voiceButton) {
      voiceButton.setAttribute('aria-pressed', String(voiceActive));
      voiceButton.textContent = voiceActive ? 'STOP VOICE' : 'NARRATE';
    }
  };

  const ensureContext = async (): Promise<AudioContext | null> => {
    if (!AudioCtor || destroyed) return null;
    if (!context) {
      try {
        context = new AudioCtor({ latencyHint: 'interactive' });
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -24;
        compressor.knee.value = 24;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.01;
        compressor.release.value = 0.3;
        compressor.connect(context.destination);
        humGain = context.createGain();
        humGain.gain.value = 0;
        humGain.connect(compressor);
        hum = context.createOscillator();
        secondHum = context.createOscillator();
        hum.type = 'sine';
        secondHum.type = 'sine';
        hum.frequency.value = 55;
        secondHum.frequency.value = 82.41;
        hum.connect(humGain);
        secondHum.connect(humGain);
        hum.start();
        secondHum.start();
      } catch (error) {
        console.warn('Audio unavailable; visual controls remain usable.', error);
        return null;
      }
    }
    try { if (context.state !== 'running') await context.resume(); } catch { return null; }
    return context;
  };

  const stopHum = (): void => {
    if (context && humGain) humGain.gain.setTargetAtTime(0, context.currentTime, 0.1);
  };

  const tone = (frequency: number, duration: number, volume: number, type: OscillatorType, delay = 0): void => {
    if (!context || !compressor || context.state !== 'running' || !store.snapshot.audioEnabled) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.00001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.00001, start + duration);
    oscillator.connect(gain);
    gain.connect(compressor);
    oscillator.addEventListener('ended', () => { oscillator.disconnect(); gain.disconnect(); }, { once: true });
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  };

  const pauseChord = (): void => {
    if (!store.snapshot.audioEnabled || !context) return;
    const now = performance.now();
    if (now - chordCooldown < 650) return;
    chordCooldown = now;
    [220, 277.18, 329.63, 440].forEach((f, i) => tone(f, 2.4 + i * 0.12, 0.014, 'sine', i * 0.07));
  };

  const onSound = async (): Promise<void> => {
    if (store.snapshot.audioEnabled) {
      store.patch({ audioEnabled: false });
      stopHum();
      setStatus('Sound off.');
    } else {
      const audio = await ensureContext();
      if (!audio) { store.patch({ audioEnabled: false }); setStatus('Audio is unavailable in this browser.'); }
      else { store.patch({ audioEnabled: true }); tone(587.33, 0.12, 0.008, 'sine'); setStatus('Sound on.'); }
    }
    syncButtons();
  };

  const cancelNarration = (): void => {
    if (speechSupported) window.speechSynthesis.cancel();
    voiceActive = false;
    syncButtons();
  };
  const readCurrentChapter = (): string => {
    const chapter = document.querySelector<HTMLElement>(`[data-chapter="${store.snapshot.chapter}"]`);
    return chapter?.dataset.narration ?? chapter?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 700) ?? '';
  };
  const onVoice = (): void => {
    if (!speechSupported) { setStatus('Spoken narration is not supported here. The written transcript is available.'); return; }
    if (voiceActive) { cancelNarration(); setStatus('Narration stopped.'); return; }
    const text = readCurrentChapter();
    if (!text) { setStatus('No narration is available for this chapter.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-AU';
    utterance.rate = 0.94;
    utterance.pitch = 0.96;
    utterance.volume = 0.9;
    utterance.onend = () => { voiceActive = false; syncButtons(); setStatus('Narration completed.'); };
    utterance.onerror = () => { voiceActive = false; syncButtons(); setStatus('Narration stopped or unavailable.'); };
    voiceActive = true;
    syncButtons();
    try { window.speechSynthesis.speak(utterance); setStatus('Narrating the current chapter.'); }
    catch { cancelNarration(); setStatus('Narration could not start.'); }
  };
  if (!speechSupported && voiceButton) {
    voiceButton.disabled = true;
    voiceButton.title = 'This browser does not support speech synthesis';
  }

  const onPause = (): void => {
    pauseChord();
    const message = $<HTMLElement>('#pause-response');
    if (message) message.textContent = 'A pause creates room for a better choice.';
    setStatus('The pause was triggered. Choose what happens next.');
  };
  const onHover = (event: Event): void => {
    if (!store.snapshot.audioEnabled || !context || context.state !== 'running') return;
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('a, button, [role="tab"]')) return;
    const now = performance.now();
    if (now - lastTick < 95) return;
    lastTick = now;
    tone(660, 0.06, 0.0035, 'sine');
  };
  const onVisibility = (): void => {
    if (document.hidden) {
      stopHum();
      if (voiceActive) cancelNarration();
      void context?.suspend().catch(() => undefined);
    } else if (store.snapshot.audioEnabled && context) void context.resume().catch(() => undefined);
  };
  soundButton?.addEventListener('click', onSound);
  voiceButton?.addEventListener('click', onVoice);
  pauseButton?.addEventListener('click', onPause);
  document.addEventListener('pointerover', onHover, { passive: true });
  document.addEventListener('visibilitychange', onVisibility);
  const unsubscribe = store.onFrame((state) => {
    if (state.chapter !== lastChapter) {
      if (voiceActive) cancelNarration();
      lastChapter = state.chapter;
    }
    if (!context || !humGain || !state.audioEnabled || context.state !== 'running') return;
    const target = state.visible ? clamp(0.002 + state.velocityIntensity * 0.004, 0, 0.007) : 0;
    humGain.gain.setTargetAtTime(target, context.currentTime, 0.14);
  });
  syncButtons();
  return { destroy(): void {
    destroyed = true;
    unsubscribe(); cancelNarration(); stopHum();
    soundButton?.removeEventListener('click', onSound);
    voiceButton?.removeEventListener('click', onVoice);
    pauseButton?.removeEventListener('click', onPause);
    document.removeEventListener('pointerover', onHover);
    document.removeEventListener('visibilitychange', onVisibility);
    try { hum?.stop(); secondHum?.stop(); } catch { /* already stopped */ }
    void context?.close().catch(() => undefined);
    context = null;
  } };
}

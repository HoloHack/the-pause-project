export type ChapterId = 'threshold' | 'recognise' | 'intervene' | 'support' | 'outro';
export type QualityLevel = 'high' | 'balanced' | 'low' | 'static';
export type PortalId = 'closed' | 'recognise' | 'intervene' | 'support';

export interface ExperienceState {
  readonly chapter: ChapterId;
  readonly portal: PortalId;
  readonly scrollY: number;
  readonly scrollProgress: number;
  readonly scrollVelocity: number;
  readonly velocityIntensity: number;
  readonly pointerX: number;
  readonly pointerY: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly reducedMotion: boolean;
  readonly visible: boolean;
  readonly quality: QualityLevel;
  readonly audioEnabled: boolean;
}

export type StateListener = (next: Readonly<ExperienceState>) => void;
export type FrameListener = (next: Readonly<ExperienceState>, deltaSeconds: number) => void;

type MutableState = { -readonly [K in keyof ExperienceState]: ExperienceState[K] };

export class ExperienceStore {
  private state: MutableState;
  private subscribers = new Set<StateListener>();
  private frameSubscribers = new Set<FrameListener>();

  constructor(initial: ExperienceState) {
    this.state = { ...initial };
  }

  get snapshot(): Readonly<ExperienceState> {
    return this.state;
  }

  patch(next: Partial<ExperienceState>): void {
    let changed = false;
    for (const key of Object.keys(next) as (keyof ExperienceState)[]) {
      const candidate = next[key];
      if (candidate !== undefined && this.state[key] !== candidate) {
        (this.state as unknown as Record<string, unknown>)[key] = candidate;
        changed = true;
      }
    }
    if (changed) for (const listener of this.subscribers) listener(this.state);
  }

  onChange(listener: StateListener): () => void {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  onFrame(listener: FrameListener): () => void {
    this.frameSubscribers.add(listener);
    return () => this.frameSubscribers.delete(listener);
  }

  frame(deltaSeconds: number): void {
    for (const listener of this.frameSubscribers) listener(this.state, deltaSeconds);
  }

  dispose(): void {
    this.subscribers.clear();
    this.frameSubscribers.clear();
  }
}

export function chooseInitialQuality(reducedMotion: boolean): QualityLevel {
  if (reducedMotion) return 'static';
  const capabilities = navigator as Navigator & { deviceMemory?: number };
  const memory = capabilities.deviceMemory ?? 8;
  const cores = capabilities.hardwareConcurrency ?? 8;
  const compact = window.matchMedia('(max-width: 760px)').matches;
  if (memory <= 2 || cores <= 2) return 'low';
  if (compact || memory <= 4 || cores <= 4) return 'balanced';
  return 'high';
}

export function createExperienceStore(): ExperienceStore {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return new ExperienceStore({
    chapter: 'threshold',
    portal: 'closed',
    scrollY: window.scrollY,
    scrollProgress: 0,
    scrollVelocity: 0,
    velocityIntensity: 0,
    pointerX: 0,
    pointerY: 0,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    reducedMotion,
    visible: !document.hidden,
    quality: chooseInitialQuality(reducedMotion),
    audioEnabled: false
  });
}

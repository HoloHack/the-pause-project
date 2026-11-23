import type { ExperienceStore } from './state';

export interface LessonInteraction { destroy(): void }
interface RecognitionCase { title: string; detail: string; explanation: string; cue: string }
const cases: readonly RecognitionCase[] = [
  { title: 'A disagreement', detail: 'Two friends have a frustrating conversation. Both express their views, then stop.', explanation: 'A disagreement is not automatically bullying. The impact still matters; listen and repair harm if needed.', cue: 'CONFLICT ≠ AUTOMATICALLY BULLYING' },
  { title: 'A repeated pile-on', detail: 'Several accounts repeatedly post humiliating comments about the same student despite being asked to stop.', explanation: 'Repeated targeting and a power imbalance are warning signs. Do not amplify the posts. Save evidence and seek support.', cue: 'PATTERN + POWER + HARM' },
  { title: 'Exclusion used to hurt', detail: 'A group deliberately keeps excluding someone from shared online activities to embarrass them.', explanation: 'Deliberate social exclusion can cause harm. Check privately on the person and involve a trusted adult where needed.', cue: 'INTENT + IMPACT' }
];
interface Choice { title: string; effect: string; next: string; path: string }
const choices: readonly Choice[] = [
  { title: 'Do not repost', effect: 'You interrupt the spread instead of giving the message a larger audience.', next: 'Next: check how the person is doing privately.', path: 'quiet' },
  { title: 'Reach out privately', effect: 'Support matters even when you cannot safely confront the behaviour in public.', next: 'Next: ask what kind of help would feel useful.', path: 'support' },
  { title: 'Report and tell an adult', effect: 'Evidence and platform reports can support further action without a public argument.', next: 'Next: save links or screenshots before blocking when safe.', path: 'report' }
];
const steps = [
  { name: 'PRESERVE', title: 'Keep evidence', detail: 'Take screenshots and save links or dates before deleting messages if it is safe to do so.' },
  { name: 'REPORT', title: 'Use the platform tools', detail: 'Report harmful posts or accounts. Avoid replying in ways that escalate the situation.' },
  { name: 'PROTECT', title: 'Make space', detail: 'Mute or block the account and review privacy settings. You do not owe someone continued access to you.' },
  { name: 'CONNECT', title: 'Tell someone', detail: 'Speak to a trusted adult, teacher or counsellor. eSafety has Australian guidance for cyberbullying.' }
] as const;
const datasets = {
  lifetime: [{ group: '10–12', value: 46 }, { group: '13–15', value: 57 }, { group: '16–17', value: 59 }],
  recent: [{ group: '10–12', value: 34 }, { group: '13–15', value: 42 }, { group: '16–17', value: 39 }]
} as const;

type Mode = keyof typeof datasets;
const text = (query: string, value: string): void => {
  const el = document.querySelector<HTMLElement>(query);
  if (el) el.textContent = value;
};
const setPressed = (selector: string, chosen: string): void => {
  for (const button of document.querySelectorAll<HTMLButtonElement>(selector)) {
    const selected = button.dataset.value === chosen;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
};

/** Accessible SVG diagrams and evidence-backed, responsive data graphics. */
export function createLessonInteraction(store: ExperienceStore): LessonInteraction {
  const listeners: Array<() => void> = [];
  const on = <E extends Event>(element: Element | null, type: string, cb: (e: E) => void): void => {
    if (!element) return;
    const listener = cb as EventListener;
    element.addEventListener(type, listener);
    listeners.push(() => element.removeEventListener(type, listener));
  };
  const recognitionButtons = document.querySelectorAll<HTMLButtonElement>('[data-recognition]');
  const choiceButtons = document.querySelectorAll<HTMLButtonElement>('[data-choice]');
  const stepButtons = document.querySelectorAll<HTMLButtonElement>('[data-support-step]');
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('[data-evidence-tab]');
  const periodButtons = document.querySelectorAll<HTMLButtonElement>('[data-period]');
  let mode: Mode = 'lifetime';
  let evidenceTab = 'prevalence';
  const announce = (message: string): void => text('#lesson-announcement', message);
  const chooseRecognition = (index: number): void => {
    const item = cases[index];
    if (!item) return;
    text('#recognition-title', item.title);
    text('#recognition-detail', item.detail);
    text('#recognition-explanation', item.explanation);
    text('#recognition-cue', item.cue);
    setPressed('[data-recognition]', String(index));
    document.querySelector('#recognition-diagram')?.setAttribute('data-active-case', String(index));
    announce(`Recognition example: ${item.title}. ${item.explanation}`);
  };
  recognitionButtons.forEach(btn => on(btn, 'click', () => chooseRecognition(Number(btn.dataset.recognition ?? 0))));
  const chooseAction = (index: number): void => {
    const choice = choices[index];
    if (!choice) return;
    text('#action-title', choice.title);
    text('#action-effect', choice.effect);
    text('#action-next', choice.next);
    setPressed('[data-choice]', String(index));
    document.querySelector('#action-diagram')?.setAttribute('data-path', choice.path);
    announce(`${choice.title}. ${choice.effect}`);
  };
  choiceButtons.forEach(btn => on(btn, 'click', () => chooseAction(Number(btn.dataset.choice ?? 0))));
  const chooseStep = (index: number): void => {
    const item = steps[index];
    if (!item) return;
    text('#support-step-title', item.title);
    text('#support-step-detail', item.detail);
    setPressed('[data-support-step]', String(index));
    document.querySelector('#support-diagram')?.setAttribute('data-step', String(index));
    announce(`${item.name}: ${item.detail}`);
  };
  stepButtons.forEach(btn => on(btn, 'click', () => chooseStep(Number(btn.dataset.supportStep ?? 0))));
  const updateChart = (): void => {
    const dataset = datasets[mode];
    setPressed('[data-period]', mode);
    for (const [i, item] of dataset.entries()) {
      const bar = document.querySelector<SVGRectElement>(`#data-bar-${i}`);
      const label = document.querySelector<SVGTextElement>(`#data-label-${i}`);
      if (bar) {
        bar.style.transform = `scaleY(${item.value / 100})`;
        bar.setAttribute('aria-label', `${item.group} year olds: ${item.value} percent`);
      }
      if (label) { label.textContent = `${item.value}%`; label.setAttribute('y', String(280 - item.value / 100 * 240 - 14)); }
    }
    const suffix = mode === 'lifetime' ? 'ever experienced' : 'experienced in the previous 12 months';
    text('#chart-description', `Australian children surveyed in December 2024–February 2025 who ${suffix} cyberbullying. 10–12 years: ${dataset[0].value}%; 13–15 years: ${dataset[1].value}%; 16–17 years: ${dataset[2].value}%.`);
    text('#chart-measure', mode === 'lifetime' ? 'EVER EXPERIENCED' : 'PAST 12 MONTHS');
    text('#chart-primary-value', mode === 'lifetime' ? '53' : '38');
    text('#chart-summary', mode === 'lifetime' ? 'of Australian children aged 10–17 surveyed reported ever experiencing cyberbullying. 38% reported it in the previous 12 months.' : 'of Australian children aged 10–17 surveyed reported experiencing cyberbullying in the previous 12 months. 53% reported it at some point.');
  };
  periodButtons.forEach(btn => on(btn, 'click', () => {
    const selected = btn.dataset.period;
    if (selected !== 'lifetime' && selected !== 'recent') return;
    mode = selected;
    updateChart();
    announce(`Chart changed to ${mode === 'lifetime' ? 'lifetime prevalence' : 'past-year prevalence'}.`);
  }));
  const updateTab = (): void => {
    setPressed('[data-evidence-tab]', evidenceTab);
    const prevalence = document.querySelector<HTMLElement>('#panel-prevalence');
    const bystander = document.querySelector<HTMLElement>('#panel-bystander');
    if (prevalence) prevalence.hidden = evidenceTab !== 'prevalence';
    if (bystander) bystander.hidden = evidenceTab !== 'bystander';
  };
  tabButtons.forEach(btn => on(btn, 'click', () => {
    if (btn.dataset.evidenceTab !== 'prevalence' && btn.dataset.evidenceTab !== 'bystander') return;
    evidenceTab = btn.dataset.evidenceTab;
    updateTab();
    announce(evidenceTab === 'prevalence' ? 'Australian cyberbullying prevalence chart.' : 'Separate research on peer intervention in school bullying. Not an online success rate.');
  }));
  chooseRecognition(0);
  chooseAction(0);
  chooseStep(0);
  updateChart();
  updateTab();

  // Self-drawing schematics retain static SVG paths when JS or animation is unavailable.
  const diagrams = Array.from(document.querySelectorAll<SVGSVGElement>('.lesson-diagram'));
  let observer: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window && !store.snapshot.reducedMotion) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('drawn');
          observer?.unobserve(entry.target);
        }
      }
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0.2 });
    for (const diagram of diagrams) observer.observe(diagram);
  } else for (const diagram of diagrams) diagram.classList.add('drawn');

  return { destroy(): void { for (const release of listeners) release(); observer?.disconnect(); } };
}

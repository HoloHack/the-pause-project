export interface ReflectionWall { destroy(): void }
type Category = 'reflection' | 'action' | 'pledge';
interface Entry { id: string; category: Category; body: string; sample: boolean; created: number }
const STORAGE = 'the-pause-project:reflection-wall:v1';
const LIKES = 'the-pause-project:local-appreciation:v1';
const categories: readonly Category[] = ['reflection', 'action', 'pledge'];
const samples: Entry[] = [
  { id: 'sample-a', category: 'reflection', body: 'I thought not replying meant I had done enough. Now I would check privately whether someone needs help.', sample: true, created: 0 },
  { id: 'sample-b', category: 'action', body: 'If a group chat starts targeting someone, I can stop forwarding the screenshot and ask a teacher for support.', sample: true, created: 0 },
  { id: 'sample-c', category: 'pledge', body: 'I will read twice before I post, and I will not make someone else the punchline.', sample: true, created: 0 },
  { id: 'sample-d', category: 'reflection', body: 'A joke is not funny just because lots of people reacted to it.', sample: true, created: 0 },
  { id: 'sample-e', category: 'action', body: 'My first move can be a private message: “Are you okay, and would you like help reporting it?”', sample: true, created: 0 },
  { id: 'sample-f', category: 'pledge', body: 'I will make room for the person who feels left out, online and offline.', sample: true, created: 0 }
];
const isCategory = (s: unknown): s is Category => typeof s === 'string' && (categories as readonly string[]).includes(s);
const safeString = (value: unknown): string => typeof value === 'string' ? value.normalize('NFKC')
  .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '')
  .replace(/\s+/g, ' ').trim().slice(0, 240) : '';
const containsContact = (s: string): boolean => /(?:https?:\/\/|www\.|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b\+?\d[\d ()-]{8,}\d\b|@[A-Z0-9_.]{2,})/i.test(s);
const loadEntries = (): Entry[] => {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw || raw.length > 40_000) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-30).flatMap((part: unknown) => {
      if (!part || typeof part !== 'object') return [];
      const entry = part as Record<string, unknown>;
      const body = safeString(entry.body);
      if (!isCategory(entry.category) || body.length < 12 || containsContact(body) || typeof entry.id !== 'string' || !/^local-[\w-]{8,70}$/.test(entry.id)) return [];
      return [{ id: entry.id, category: entry.category, body, sample: false, created: typeof entry.created === 'number' ? entry.created : 0 } satisfies Entry];
    });
  } catch { return []; }
};
const loadLikes = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LIKES) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && /^(sample-[a-f]|local-[\w-]{8,70})$/.test(s)).slice(-60) : [];
  } catch { return []; }
};
function button(text: string, className: string, action: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.className = className;
  element.dataset.action = action;
  return element;
}

/** All visitor text is plain text nodes. No backend, HTML rendering or network requests. */
export function createReflectionWall(): ReflectionWall {
  const form = document.querySelector<HTMLFormElement>('#reflection-form');
  const textarea = document.querySelector<HTMLTextAreaElement>('#reflection-text');
  const category = document.querySelector<HTMLSelectElement>('#reflection-category');
  const feed = document.querySelector<HTMLElement>('#reflection-list');
  const feedback = document.querySelector<HTMLElement>('#reflection-feedback');
  const count = document.querySelector<HTMLElement>('#reflection-count');
  const filters = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-wall-filter]'));
  if (!form || !textarea || !category || !feed || !feedback || !count) return { destroy() {} };
  const release: Array<() => void> = [];
  const bind = (target: EventTarget, event: string, listener: EventListener): void => {
    target.addEventListener(event, listener);
    release.push(() => target.removeEventListener(event, listener));
  };
  let entries = loadEntries();
  let likes = new Set(loadLikes());
  let active: Category | 'all' = 'all';
  const announce = (message: string): void => { feedback.textContent = message; };
  const save = (): boolean => {
    try { localStorage.setItem(STORAGE, JSON.stringify(entries)); localStorage.setItem(LIKES, JSON.stringify([...likes])); return true; }
    catch { announce('This browser could not save your notes. Your entries will remain only until the page closes.'); return false; }
  };

  const render = (): void => {
    const all = [...samples, ...entries.slice().reverse()];
    const visible = active === 'all' ? all : all.filter(item => item.category === active);
    const fragment = document.createDocumentFragment();
    for (const entry of visible) {
      const article = document.createElement('article');
      article.className = 'reflection-card glass-surface';
      article.setAttribute('role', 'listitem');
      const head = document.createElement('div');
      head.className = 'reflection-card-meta';
      const tag = document.createElement('span');
      tag.textContent = `${entry.sample ? 'FICTIONAL EXAMPLE' : 'MY LOCAL NOTE'} / ${entry.category.toUpperCase()}`;
      head.append(tag);
      const paragraph = document.createElement('p');
      paragraph.textContent = entry.body; // Never render visitor-controlled HTML.
      const actions = document.createElement('div');
      actions.className = 'reflection-card-actions';
      const react = button(likes.has(entry.id) ? '♥ APPRECIATED' : '♡ APPRECIATE', 'reflection-react', 'react');
      react.dataset.entryId = entry.id;
      react.setAttribute('aria-pressed', String(likes.has(entry.id)));
      react.setAttribute('aria-label', `${likes.has(entry.id) ? 'Remove' : 'Add'} local appreciation for this ${entry.category}`);
      actions.append(react);
      if (!entry.sample) {
        const del = button('DELETE MY NOTE', 'reflection-delete', 'delete');
        del.dataset.entryId = entry.id;
        del.setAttribute('aria-label', 'Delete this locally saved note');
        actions.append(del);
      }
      article.append(head, paragraph, actions);
      fragment.append(article);
    }
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'reflection-empty';
      empty.textContent = 'No notes in this category yet. You can add your own below.';
      fragment.append(empty);
    }
    feed.replaceChildren(fragment);
    count.textContent = `${entries.length} local ${entries.length === 1 ? 'entry' : 'entries'} saved on this device`;
    for (const option of filters) {
      const selected = option.dataset.wallFilter === active;
      option.setAttribute('aria-pressed', String(selected));
      option.classList.toggle('selected', selected);
    }
  };

  for (const option of filters) bind(option, 'click', () => {
    const next = option.dataset.wallFilter;
    if (next !== 'all' && !isCategory(next)) return;
    active = next;
    render();
  });
  bind(form, 'submit', (ev) => {
    ev.preventDefault();
    const body = safeString(textarea.value);
    if (body.length < 12) { announce('Write at least 12 characters so your reflection has some meaning.'); textarea.focus(); return; }
    if (body.length > 220 || textarea.value.length > 1000) { announce('Keep your note to 220 characters or fewer.'); textarea.focus(); return; }
    if (containsContact(body)) { announce('For your privacy, please remove names, handles, contact details and links.'); textarea.focus(); return; }
    if (!isCategory(category.value)) { announce('Choose a reflection type first.'); category.focus(); return; }
    const id = `local-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
    entries = [...entries, { id, category: category.value, body, sample: false, created: Date.now() }].slice(-30);
    save();
    textarea.value = '';
    active = 'all';
    render();
    announce('Your reflection was added locally. Only this browser can see it; nothing was published.');
  });
  bind(feed, 'click', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const control = target.closest<HTMLButtonElement>('button[data-action][data-entry-id]');
    const id = control?.dataset.entryId;
    if (!id || ![...samples, ...entries].some(entry => entry.id === id)) return;
    if (control?.dataset.action === 'react') {
      if (likes.has(id)) likes.delete(id); else likes.add(id);
      save(); render(); announce('Your reaction was updated on this device.');
    } else if (control?.dataset.action === 'delete' && id.startsWith('local-')) {
      entries = entries.filter(entry => entry.id !== id);
      likes.delete(id);
      save(); render(); announce('Your local note was deleted.');
    }
  });
  const reset = document.querySelector<HTMLButtonElement>('#clear-local-reflections');
  if (reset) bind(reset, 'click', () => {
    entries = [];
    likes.clear();
    save(); render(); announce('Local notes and reactions cleared. The fictional examples remain.');
  });
  render();
  return { destroy(): void { release.forEach(fn => fn()); } };
}

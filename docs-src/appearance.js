// Docs-only preference. Run before styles paint; no library runtime required.
(() => {
  const key = 'mica-docs-appearance';
  const media = matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark', 'system'].includes(value);
  const cycle = ['system', 'light', 'dark'];
  const nextMode = () => cycle[(cycle.indexOf(mode) + 1) % cycle.length];
  const label = value => value[0].toUpperCase() + value.slice(1);
  let mode = 'system';
  try { const saved = localStorage.getItem(key); if (valid(saved)) mode = saved; } catch {}
  const applyDocument = doc => {
    const resolved = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode;
    doc.documentElement.style.colorScheme = mode === 'system' ? 'light dark' : mode;
    doc.documentElement.style.setProperty('--check-glyph', `var(--check-glyph-${resolved})`);
  };
  const apply = () => {
    applyDocument(document);
    document.querySelectorAll('[data-appearance]').forEach(select => { select.value = mode; });
    document.querySelectorAll('[data-appearance-toggle]').forEach(button => {
      const description = `Appearance: ${label(mode)}. Switch to ${label(nextMode())}`;
      button.setAttribute('aria-label', description);
      button.title = description;
      button.querySelectorAll('[data-mode]').forEach(icon => { icon.toggleAttribute('hidden', icon.dataset.mode !== mode); });
    });
    document.querySelectorAll('iframe').forEach(frame => {
      try { if (frame.contentDocument?.documentElement) applyDocument(frame.contentDocument); } catch {}
    });
  };
  apply();
  media.addEventListener('change', apply);
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    mode = valid(event.newValue) ? event.newValue : 'system'; apply();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-appearance]').forEach(select => {
      select.addEventListener('change', () => {
        mode = valid(select.value) ? select.value : 'system';
        try { localStorage.setItem(key, mode); } catch {}
        apply();
      });
    });
    document.querySelectorAll('[data-appearance-toggle]').forEach(button => {
      button.hidden = false;
      button.addEventListener('click', () => {
        mode = nextMode();
        try { localStorage.setItem(key, mode); } catch {}
        apply();
      });
    });
    document.querySelectorAll('iframe').forEach(frame => frame.addEventListener('load', apply));
    apply();
  });
})();

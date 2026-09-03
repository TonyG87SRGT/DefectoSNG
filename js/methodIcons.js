const ICONS = Object.freeze({
  vik: `
    <svg viewBox="0 0 24 24" role="img" aria-label="Визуальный и измерительный контроль">
      <circle cx="9" cy="9" r="4.5"></circle>
      <path d="m12.4 12.4 6.1 6.1"></path>
      <path d="M3 20.5h11.5M5.5 20.5v-3M8.5 20.5v-2M11.5 20.5v-3"></path>
    </svg>`,
  uzk: `
    <svg viewBox="0 0 24 24" role="img" aria-label="Ультразвуковой контроль">
      <rect x="2.5" y="8.5" width="4" height="7" rx="1"></rect>
      <path d="M8.5 8.2a5.3 5.3 0 0 1 0 7.6M11.3 5.3a9.4 9.4 0 0 1 0 13.4M14.2 2.8a13 13 0 0 1 0 18.4"></path>
    </svg>`,
  pvk: `
    <svg viewBox="0 0 24 24" role="img" aria-label="Капиллярный контроль">
      <path d="M12 2.5C9.2 6.2 6.2 9.7 6.2 14a5.8 5.8 0 0 0 11.6 0c0-4.3-3-7.8-5.8-11.5Z"></path>
      <path d="M12 8v7.5"></path>
      <circle cx="12" cy="18" r="1"></circle>
    </svg>`,
  rk: `
    <svg viewBox="0 0 24 24" role="img" aria-label="Радиографический контроль">
      <rect x="9" y="2.5" width="6" height="4" rx="1"></rect>
      <path d="m10 7-5.5 11M12 7v11M14 7l5.5 11"></path>
      <path d="M4 13.5h16M3 20.5h18"></path>
    </svg>`,
  vibration: `
    <svg viewBox="0 0 24 24" role="img" aria-label="Вибродиагностика">
      <rect x="2.5" y="3" width="19" height="18" rx="3"></rect>
      <path d="M5 14h2l1.7-5 2.5 9 2.2-12 2.2 8H19"></path>
    </svg>`
});

export function renderMethodIcon(methodKey) {
  return ICONS[methodKey] || ICONS.vik;
}

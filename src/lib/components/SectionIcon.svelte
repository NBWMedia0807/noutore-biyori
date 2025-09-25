<script>
  export let name;
  export let size = 24;
  export let className = '';

  const paths = {
    'text-icon': `
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>
      <path d="M14 3v4h4"></path>
      <line x1="8" y1="11" x2="16" y2="11"></line>
      <line x1="8" y1="15" x2="16" y2="15"></line>
    `,
    'clock-icon': `
      <circle cx="12" cy="12" r="8"></circle>
      <polyline points="12 7 12 12 16 14"></polyline>
    `,
    'features-icon': `
      <path d="M12 4.5l1.9 3.86 4.27.62-3.09 3 .73 4.3L12 14.9l-3.81 1.98.73-4.3-3.09-3 4.27-.62z"></path>
    `,
    'brain-icon': `
      <path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-2 2.83c0 1.57 1.2 2.87 2.73 3.05A3 3 0 0 0 9 16v2a2 2 0 0 0 2 2"></path>
      <path d="M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 2 2.83c0 1.57-1.2 2.87-2.73 3.05A3 3 0 0 1 15 16v2a2 2 0 0 1-2 2"></path>
      <path d="M12 3v18"></path>
    `,
    'game-icon': `
      <path d="M5 9h14a3 3 0 0 1 2.83 3.95l-1.2 3.5A3 3 0 0 1 17.8 18H6.2a3 3 0 0 1-2.83-1.55l-1.2-3.5A3 3 0 0 1 5 9z"></path>
      <line x1="8.5" y1="13" x2="11.5" y2="13"></line>
      <line x1="10" y1="11.5" x2="10" y2="14.5"></line>
      <circle cx="16.5" cy="13" r="1"></circle>
      <circle cx="19" cy="11.5" r="1"></circle>
    `,
    'home-icon': `
      <path d="M4 10.5 12 4l8 6.5"></path>
      <path d="M6 10v8h12v-8"></path>
      <path d="M10 18v-4h4v4"></path>
    `,
    'news-icon': `
      <path d="M4 7h12.5a1.5 1.5 0 0 1 1.5 1.5V21H5a1 1 0 0 1-1-1z"></path>
      <path d="M18 8h2v11a2 2 0 0 1-2 2H6"></path>
      <rect x="8" y="8.5" width="4" height="2.5"></rect>
      <line x1="8" y1="13" x2="14" y2="13"></line>
      <line x1="8" y1="16.5" x2="13" y2="16.5"></line>
    `,
    'trophy-icon': `
      <path d="M8 4h8"></path>
      <path d="M8 4v2a3 3 0 0 1-3 3H4V6a2 2 0 0 1 2-2z"></path>
      <path d="M16 4v2a3 3 0 0 0 3 3h1V6a2 2 0 0 0-2-2z"></path>
      <path d="M9 15h6"></path>
      <path d="M10 18h4"></path>
      <path d="M12 6v9"></path>
    `
  };

  $: markup = paths[name] ?? '';
  $: classes = ['section-icon-svg', className].filter(Boolean).join(' ');
</script>

{#if markup}
  <svg
    class={classes}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {@html markup}
  </svg>
{/if}

<style>
  :global(.section-icon-svg) {
    flex-shrink: 0;
    display: inline-block;
  }
</style>

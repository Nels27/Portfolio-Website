export const TRACKS = [
  { id: 'nonprofit', title: 'Non-profit work' },
  { id: 'professional', title: 'Day to day role' },
  { id: 'side-projects', title: 'Technical side projects' },
];
export const PROJECTS = [
  'agentsofolympus',
  'charger-firmware-test-automation',
  'emerging-100-event-branding',
  'meridian-sigma',
  'portfolio-website',
];
export const WEB_ROUTES = [
  '/',
  ...TRACKS.map((t) => `/tracks/${t.id}/`),
  ...PROJECTS.map((p) => `/projects/${p}/`),
  '/journey/',
  '/colophon/',
];

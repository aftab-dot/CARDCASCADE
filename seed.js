import { addDays, today } from './util.js';

// Sample dataset: "Sprint 14: Mobile MVP"
// 5 columns, 18 cards, 42 story points, 4 developers, 10-day sprint, currently Day 6 (18 points remaining).
export function seed() {
  const start = addDays(today(), -5); // so "today" is Day 6
  const end = addDays(start, 9);

  const team = [
    { id: 'aarav', name: 'Aarav K', color: '#ff6b6b' },
    { id: 'meera', name: 'Meera R', color: '#2fc9a0' },
    { id: 'rohan', name: 'Rohan S', color: '#f2a93b' },
    { id: 'zoya', name: 'Zoya M', color: '#5c9dff' },
  ];
  const columns = [
    { id: 'backlog', name: 'Backlog', wip: null, color: '#8b93a7' },
    { id: 'todo', name: 'To Do', wip: 5, color: '#3b9cff' },
    { id: 'progress', name: 'In Progress', wip: 3, color: '#ffb020' },
    { id: 'review', name: 'Review', wip: 3, color: '#b46cff' },
    { id: 'done', name: 'Done', wip: null, color: '#2fd47a', done: true },
  ];
  // [title, points, assignee, column, tags, description]
  const rows = [
    ['Project scaffolding & CI', 3, 'rohan', 'done', ['devops'], 'Set up repo, lint rules and the CI pipeline.'],
    ['Design system tokens', 2, 'zoya', 'done', ['design'], 'Colors, spacing and typography tokens for the app.'],
    ['Login screen UI', 3, 'zoya', 'done', ['frontend', 'mobile'], 'Email + password form with validation states.'],
    ['Onboarding carousel', 5, 'zoya', 'done', ['frontend', 'mobile'], 'Three-step intro carousel with skip option.'],
    ['Push notification setup', 5, 'aarav', 'done', ['backend', 'mobile'], 'Register devices and send a test notification.'],
    ['Profile screen', 3, 'meera', 'done', ['frontend'], 'View and edit profile details.'],
    ['Splash screen & app icon', 1, 'zoya', 'done', ['design'], 'Branded splash and adaptive icon.'],
    ['Settings screen', 2, 'meera', 'done', ['frontend'], 'Notification and account settings.'],
    ['User Auth API', 5, 'aarav', 'progress', ['backend'], 'JWT login, refresh tokens and logout endpoints.'],
    ['Home feed API integration', 2, 'meera', 'progress', ['backend', 'mobile'], 'Fetch and paginate the home feed.'],
    ['Search screen', 2, 'rohan', 'review', ['frontend'], 'Debounced search with recent queries.'],
    ['Crash reporting', 1, 'rohan', 'review', ['devops', 'qa'], 'Wire up crash reporting to the release build.'],
    ['Dark mode toggle', 2, 'zoya', 'todo', ['frontend', 'design'], 'Respect system theme and allow manual override.'],
    ['Deep links', 2, 'aarav', 'todo', ['mobile'], 'Open specific screens from external links.'],
    ['Analytics events', 1, 'meera', 'backlog', ['backend'], 'Track sign-up and first-feed-view events.'],
    ['Accessibility audit', 1, 'zoya', 'backlog', ['qa', 'design'], 'Screen-reader and contrast review.'],
    ['Rate-app prompt', 1, 'rohan', 'backlog', ['mobile'], 'Ask for a store rating after the 3rd session.'],
    ['Store listing assets', 1, 'meera', 'backlog', ['design'], 'Screenshots and description for the store.'],
  ];
  const cards = rows.map((r, i) => ({
    id: 'CC-' + (101 + i), title: r[0], points: r[1], assignee: r[2], colId: r[3], tags: r[4], desc: r[5],
  }));

  return {
    version: 1,
    counter: 101 + rows.length,
    team, columns, cards,
    sprint: {
      id: 14, name: 'Sprint 14: Mobile MVP',
      goal: 'Ship a usable mobile MVP: sign-in, home feed and search.',
      start, end,
      // remaining points at the end of days 0..5 (today, day 6, is computed live from the board)
      snapshots: { 0: 42, 1: 42, 2: 39, 3: 34, 4: 29, 5: 23 },
    },
    dayOverride: null, // demo clock (null = real date)
    history: [
      { name: 'Sprint 10', velocity: 28, committed: 34 },
      { name: 'Sprint 11', velocity: 31, committed: 36 },
      { name: 'Sprint 12', velocity: 35, committed: 38 },
      { name: 'Sprint 13', velocity: 37, committed: 40 },
    ],
    retro: {
      well: [{ id: 'r1', text: 'CI pipeline caught regressions early', votes: 3 }],
      improve: [{ id: 'r2', text: 'Review column keeps filling up', votes: 2 }],
      actions: [{ id: 'r3', text: 'Cap Review WIP at 3 and swap reviewers daily', votes: 0, done: false }],
    },
  };
}

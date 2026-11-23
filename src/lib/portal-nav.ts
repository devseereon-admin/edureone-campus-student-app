import type { IconName } from '@/components/ui';

/** Native bottom tabs. Paths are the portal's student routes. */
export const TABS: { key: string; title: string; icon: IconName; path: string }[] = [
  { key: 'home', title: 'Home', icon: 'home-outline', path: '/student/dashboard' },
  { key: 'attendance', title: 'Attendance', icon: 'calendar-outline', path: '/student/attendance' },
  { key: 'fees', title: 'Fees', icon: 'wallet-outline', path: '/student/fees' },
  { key: 'notices', title: 'Notices', icon: 'megaphone-outline', path: '/student/notices' },
];

/** Everything else, listed on the native More screen. */
export const MORE_LINKS: { title: string; icon: IconName; path: string }[] = [
  { title: 'Assignments', icon: 'document-text-outline', path: '/student/assignments' },
  { title: 'Timetable', icon: 'time-outline', path: '/student/timetable' },
  { title: 'Exams', icon: 'school-outline', path: '/student/exams' },
  { title: 'Results', icon: 'ribbon-outline', path: '/student/results' },
  { title: 'Academic calendar', icon: 'calendar-number-outline', path: '/student/calendar' },
  { title: 'Study materials', icon: 'library-outline', path: '/student/materials' },
  { title: 'Library', icon: 'book-outline', path: '/student/library' },
  { title: 'Transport', icon: 'bus-outline', path: '/student/transport' },
  { title: 'Gate pass', icon: 'shield-checkmark-outline', path: '/student/gate-pass' },
  { title: 'Wallet', icon: 'card-outline', path: '/student/wallet' },
  { title: 'Gallery', icon: 'images-outline', path: '/student/gallery' },
];

export const START_SIGNED_IN = '/';
export const START_SIGNED_OUT = '/login/student';

/** The native tab bar shows on the signed-in student / parent pages. */
export const showsTabBar = (path: string) => path.startsWith('/student/');

export const activeTab = (path: string) =>
  TABS.find((t) => path === t.path || path.startsWith(`${t.path}/`))?.key ?? (showsTabBar(path) ? 'more' : null);

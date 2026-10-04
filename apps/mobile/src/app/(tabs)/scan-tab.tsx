import { Redirect } from 'expo-router';

/** Placeholder route: the central tab button opens the full-screen /scan modal instead. */
export default function ScanTab() {
  return <Redirect href="/scan" />;
}

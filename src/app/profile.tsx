import { Card, ErrorView, KeyValue, Screen } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { BRAND } from '@/lib/config';
import { useData } from '@/lib/use-data';

export default function Profile() {
  const { session, refreshStudent } = useAuth();
  const { error, refreshing, refresh } = useData(() => refreshStudent());
  const s = session?.student;
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      <Card>
        <KeyValue label="Name" value={s?.full_name ?? '—'} />
        <KeyValue label="Admission no." value={s?.student_no ?? '—'} />
        <KeyValue label="Email" value={s?.email ?? '—'} />
        <KeyValue label="Class" value={[s?.class_name, s?.section_name].filter(Boolean).join(' - ') || '—'} />
        <KeyValue label="Session" value={s?.session_year ?? '—'} />
        <KeyValue label="School" value={BRAND.school} />
      </Card>
    </Screen>
  );
}

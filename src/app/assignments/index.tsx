import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Empty, ErrorView, Loading, Screen, Segmented, colors } from '@/components/ui';
import { statusOf } from '@/lib/assignment';
import { asArray } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

type Group = 'pending' | 'submitted' | 'graded';
export default function Assignments() {
  const { data, error, loading, refreshing, refresh } = useData(async () => asArray(await portal.assignments(), ['assignments']));
  const [group, setGroup] = useState<Group>('pending');
  const groups = useMemo(() => {
    const rows = data ?? [];
    return {
      pending: rows.filter((r) => String(r.submission_status || 'PENDING').toUpperCase() === 'PENDING'),
      submitted: rows.filter((r) => ['SUBMITTED', 'LATE', 'RESUBMITTED'].includes(String(r.submission_status).toUpperCase())),
      graded: rows.filter((r) => String(r.submission_status).toUpperCase() === 'GRADED'),
    };
  }, [data]);
  const rows = groups[group];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Segmented
        value={group}
        onChange={setGroup}
        options={[
          { value: 'pending', label: `Pending (${groups.pending.length})` },
          { value: 'submitted', label: `Submitted (${groups.submitted.length})` },
          { value: 'graded', label: `Graded (${groups.graded.length})` },
        ]}
      />
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading label="Loading assignments…" /> : null}
      {data && rows.length === 0 ? <Card><Empty icon="checkmark-done-outline" title="Nothing here" /></Card> : null}
      {rows.map((a) => {
        const st = statusOf(a);
        return (
          <Card key={a.assignment_uuid} onPress={() => router.push({ pathname: '/assignments/[id]', params: { id: a.assignment_uuid, title: a.title } })} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{a.title}</Text>
              <Badge label={st.label} tone={st.tone} />
            </View>
            <Text style={{ color: colors.muted }}>
              {[a.subject_name, a.teacher_name, a.due_date && `Due ${formatDate(a.due_date)}`].filter(Boolean).join(' · ')}
            </Text>
            {String(a.submission_status).toUpperCase() === 'GRADED' ? (
              <Text style={{ color: colors.green, fontWeight: '600' }}>
                {a.obtained_marks ?? '—'}/{a.max_marks ?? '—'} marks
              </Text>
            ) : null}
          </Card>
        );
      })}
    </Screen>
  );
}

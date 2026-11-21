import { Text, View } from 'react-native';
import { Badge, Card, Empty, ErrorView, Loading, Screen, Stat, colors } from '@/components/ui';
import { formatDate, formatTime } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

export default function GatePasses() {
  const { data, error, loading, refreshing, refresh } = useData(() => portal.gatePasses());
  const rows: any[] = data?.gate_passes ?? [];
  const summary = data?.summary ?? {};
  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading /> : null}
      {data ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Total passes" value={summary.total_passes ?? rows.length} icon="exit-outline" />
            <Stat label="Currently out" value={summary.currently_out ?? rows.filter((r) => r.status === 'OUT').length} icon="walk-outline" tone="amber" />
          </View>
          {rows.length === 0 ? <Card><Empty icon="exit-outline" title="No gate passes issued" /></Card> : null}
          {rows.map((p) => (
            <Card key={p.gate_pass_uuid} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '700', color: colors.text }}>{p.gate_pass_number || 'Gate pass'}</Text>
                <Badge label={p.status === 'RETURNED' ? 'Returned' : p.status === 'OUT' ? 'Out' : p.status || '—'} tone={p.status === 'RETURNED' ? 'green' : 'amber'} />
              </View>
              <Text style={{ color: colors.text }}>{p.purpose || '—'}</Text>
              <Text style={{ color: colors.muted }}>
                {formatDate(p.out_time)} · Out {formatTime(p.out_time)} · In {formatTime(p.in_time)}
              </Text>
              {p.permission_authority ? <Text style={{ color: colors.muted }}>Approved by {p.permission_authority}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

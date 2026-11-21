import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge, Card, ErrorView, Loading, Screen, SectionTitle, Stat, colors } from '@/components/ui';
import { num } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  P: { bg: colors.greenSoft, fg: colors.green },
  A: { bg: colors.redSoft, fg: colors.red },
  L: { bg: colors.amberSoft, fg: colors.amber },
  H: { bg: '#F1F5F9', fg: colors.muted },
};
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Attendance() {
  const { data, error, loading, refreshing, refresh } = useData(() => portal.attendance());
  const [offset, setOffset] = useState(0);
  const now = new Date();
  const view = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const y = view.getFullYear();
  const m = view.getMonth();

  const marks = useMemo(() => new Map<string, string>((data?.attendance ?? []).map((a: any) => [String(a.attendance_date).slice(0, 10), String(a.status || '').toUpperCase()])), [data]);
  const days = Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
    const d = i + 1;
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const date = new Date(y, m, d);
    return { d, status: marks.get(key) || (date.getDay() === 0 ? 'H' : null), future: date > now };
  });
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const percent = num(data?.attendance_percentage);
  const minimum = num(data?.eligibility?.minimum_percentage) || 75;
  const eligible = data?.eligibility?.eligible ?? percent >= minimum;
  const trend: any[] = data?.monthly_trend ?? [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading label="Loading attendance…" /> : null}
      {data ? (
        <>
          {!eligible ? (
            <Card style={{ backgroundColor: colors.amberSoft, borderColor: '#F3D19C' }}>
              <Text style={{ color: colors.amber, fontWeight: '700' }}>Attendance below {minimum}%</Text>
              <Text style={{ color: colors.amber, marginTop: 2 }}>Maintain at least {minimum}% attendance to stay eligible for exams.</Text>
            </Card>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <Stat label="Attendance" value={`${percent}%`} icon="pie-chart-outline" tone={eligible ? 'green' : 'amber'} />
            <Stat label="Present" value={num(data.present)} icon="checkmark-circle-outline" tone="green" />
            <Stat label="Absent" value={num(data.absent)} icon="close-circle-outline" tone="red" />
            <Stat label="On leave" value={num(data.on_leave)} icon="airplane-outline" tone="amber" />
          </View>

          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Pressable onPress={() => setOffset((o) => o - 1)} hitSlop={10} accessibilityLabel="Previous month">
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              </Pressable>
              <Text style={{ fontWeight: '700', color: colors.text, fontSize: 16 }}>
                {view.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable onPress={() => setOffset((o) => Math.min(0, o + 1))} hitSlop={10} disabled={offset === 0} accessibilityLabel="Next month">
                <Ionicons name="chevron-forward" size={22} color={offset === 0 ? colors.border : colors.primary} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row' }}>
              {WEEK.map((w) => (
                <Text key={w} style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12 }}>{w}</Text>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {Array.from({ length: lead }, (_, i) => <View key={`b${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />)}
              {days.map(({ d, status, future }) => {
                const st = status ? STATUS_STYLE[status] : null;
                return (
                  <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                    <View style={{ flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: st?.bg ?? 'transparent', borderWidth: st ? 0 : 1, borderColor: colors.border, borderStyle: future ? 'dashed' : 'solid', opacity: future ? 0.5 : 1 }}>
                      <Text style={{ fontSize: 13, color: st?.fg ?? colors.text }}>{d}</Text>
                      {status && status !== 'H' ? <Text style={{ fontSize: 9, fontWeight: '700', color: st?.fg }}>{status}</Text> : null}
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              <Badge label="P Present" tone="green" />
              <Badge label="A Absent" tone="red" />
              <Badge label="L Leave" tone="amber" />
              <Badge label="Holiday" tone="grey" />
            </View>
          </Card>

          {trend.length > 0 ? (
            <>
              <SectionTitle>Monthly trend</SectionTitle>
              <Card style={{ gap: 10 }}>
                {trend.map((t, i) => {
                  const p = Math.max(0, Math.min(100, num(t.attendance_percentage)));
                  return (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: colors.text }}>{t.month_label}</Text>
                        <Text style={{ color: colors.muted }}>{p}%</Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: colors.primarySoft, borderRadius: 4 }}>
                        <View style={{ width: `${p}%`, height: 8, borderRadius: 4, backgroundColor: p >= minimum ? colors.green : colors.amber }} />
                      </View>
                    </View>
                  );
                })}
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

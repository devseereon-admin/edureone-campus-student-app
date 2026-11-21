import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Card, Empty, ErrorView, Loading, Screen, Segmented, colors } from '@/components/ui';
import { formatDate, formatTime, pick } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

type Kind = 'regular' | 'summer' | 'examination' | 'additional';
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalise = (row: any) => ({
  day: String(pick(row, ['day', 'Day'], '')),
  period: Number(pick(row, ['period', 'Period'], 0)),
  start: pick(row, ['start_time', 'Start Time', 'startTime'], ''),
  end: pick(row, ['end_time', 'End Time', 'endTime'], ''),
  subject: pick(row, ['subject', 'Subject', 'subject_name'], '—'),
  teacher: pick(row, ['teacher', 'Teacher', 'teacher_name'], ''),
  room: pick(row, ['room', 'Room', 'classroom'], ''),
});

/** Rows can be flat periods or records holding a `schedule`/`entries` list. */
function flatten(rows: any[]): any[] {
  return rows.flatMap((r) => {
    const inner = r?.schedule ?? r?.entries ?? r?.periods ?? r?.timetable ?? r?.data;
    return Array.isArray(inner) ? inner : [r];
  });
}

export default function Timetable() {
  const { data, error, loading, refreshing, refresh } = useData(() => portal.timetable());
  const [kind, setKind] = useState<Kind>('regular');
  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const [day, setDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');

  const t = useMemo(() => data?.timetables ?? {}, [data]);
  const rows = useMemo(() => flatten(Array.isArray(t[kind]) ? t[kind] : []), [t, kind]);
  const periods = useMemo(
    () => rows.map(normalise).filter((r) => !r.day || r.day.toLowerCase().startsWith(day.slice(0, 3).toLowerCase())).sort((a, b) => a.period - b.period || String(a.start).localeCompare(String(b.start))),
    [rows, day],
  );
  const options = (['regular', 'summer', 'examination', 'additional'] as Kind[])
    .filter((k) => k === 'regular' || (Array.isArray(t[k]) && t[k].length))
    .map((k) => ({ value: k, label: k === 'examination' ? 'Exams' : k[0].toUpperCase() + k.slice(1) }));

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <ErrorView message={error} onRetry={refresh} /> : null}
      {loading && !data ? <Loading label="Loading timetable…" /> : null}
      {data ? (
        <>
          {data.class_name ? (
            <Text style={{ color: colors.muted }}>
              Class {[data.class_name, data.section_name].filter(Boolean).join(' - ')}
              {data.academic_year ? ` · ${data.academic_year}` : ''}
            </Text>
          ) : null}
          {options.length > 1 ? <Segmented value={kind} options={options} onChange={setKind} /> : null}
          {kind === 'examination' ? (
            rows.length === 0 ? (
              <Card><Empty icon="ribbon-outline" title="No exam timetable yet" /></Card>
            ) : (
              rows.map((r, i) => (
                <Card key={i}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{pick(r, ['subject', 'subject_name', 'Subject', 'paper_name'], 'Paper')}</Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    {formatDate(pick(r, ['date', 'exam_date', 'Date']))} · {formatTime(pick(r, ['start_time', 'Start Time']))} – {formatTime(pick(r, ['end_time', 'End Time']))}
                  </Text>
                  {pick(r, ['room', 'room_name']) ? <Text style={{ color: colors.muted }}>Room {pick(r, ['room', 'room_name'])}</Text> : null}
                </Card>
              ))
            )
          ) : (
            <>
              <Segmented value={day} options={DAYS.map((d) => ({ value: d, label: d.slice(0, 3) }))} onChange={setDay} />
              {periods.length === 0 ? (
                <Card><Empty icon="time-outline" title={`No periods on ${day}`} /></Card>
              ) : (
                periods.map((p, i) => (
                  <Card key={`${p.period}-${i}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <View style={{ width: 54, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, color: colors.muted }}>Period</Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.primary }}>{p.period || i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: colors.text }}>{p.subject}</Text>
                      <Text style={{ color: colors.muted, marginTop: 2 }}>
                        {[p.start && `${formatTime(p.start)} – ${formatTime(p.end)}`, p.teacher, p.room && `Room ${p.room}`].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  </Card>
                ))
              )}
            </>
          )}
        </>
      ) : null}
    </Screen>
  );
}

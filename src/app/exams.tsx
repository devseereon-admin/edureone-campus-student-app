import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, Card, Empty, ErrorView, KeyValue, Loading, Screen, Segmented, SectionTitle, colors } from '@/components/ui';
import { formatDate, formatTime, num, titleCase } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

export default function Exams() {
  const [tab, setTab] = useState<'schedule' | 'results'>('schedule');
  const schedule = useData(() => portal.examSchedule());
  const results = useData(() => portal.examResults());
  const exams: any[] = schedule.data?.exams ?? schedule.data?.data?.exams ?? [];
  const resultRows: any[] = useMemo(() => results.data?.results ?? results.data?.data?.results ?? [], [results.data]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = useMemo(() => resultRows.find((r) => r.result_uuid === selected) ?? resultRows[0], [resultRows, selected]);
  const marks: any[] = current?.subject_marks ?? [];
  const obtained = marks.reduce((s, m) => s + (m.is_absent ? 0 : num(m.marks)), 0);
  const max = marks.reduce((s, m) => s + num(m.max_marks), 0);
  const pct = current?.percentage != null ? num(current.percentage) : max ? Math.round((obtained / max) * 100) : 0;

  const active = tab === 'schedule' ? schedule : results;
  return (
    <Screen refreshing={active.refreshing} onRefresh={active.refresh}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'schedule', label: 'Schedule' }, { value: 'results', label: 'Results' }]} />
      {active.error ? <ErrorView message={active.error} onRetry={active.refresh} /> : null}
      {active.loading && !active.data ? <Loading /> : null}

      {tab === 'schedule' && schedule.data ? (
        exams.length === 0 ? (
          <Card><Empty icon="ribbon-outline" title="No exams scheduled" /></Card>
        ) : (
          exams.map((e) => {
            const st = String(e.status || '').toUpperCase();
            return (
              <Card key={e.exam_uuid} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, flex: 1, fontSize: 16 }}>{e.exam_name}</Text>
                  <Badge label={titleCase(st || 'Scheduled')} tone={st === 'COMPLETED' ? 'grey' : st === 'IN PROGRESS' ? 'amber' : 'blue'} />
                </View>
                <Text style={{ color: colors.muted }}>{formatDate(e.from_date)} – {formatDate(e.to_date)}</Text>
                {(e.papers ?? []).map((p: any) => (
                  <View key={p.paper_uuid || `${p.subject_name}-${p.date}`} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{p.subject_name || p.paper_name}</Text>
                    <Text style={{ color: colors.muted, fontSize: 13 }}>
                      {[formatDate(p.date), p.time && formatTime(p.time), p.duration_minutes && `${p.duration_minutes} min`, p.room_name && `Room ${p.room_name}`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ))}
              </Card>
            );
          })
        )
      ) : null}

      {tab === 'results' && results.data ? (
        resultRows.length === 0 ? (
          <Card><Empty icon="ribbon-outline" title="No published results yet" /></Card>
        ) : (
          <>
            {resultRows.length > 1 ? (
              <Segmented value={current?.result_uuid ?? ''} onChange={setSelected} options={resultRows.map((r) => ({ value: r.result_uuid, label: r.exam_name || 'Exam' }))} />
            ) : null}
            <Card style={{ gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{current?.exam_name || 'Result'}</Text>
              <KeyValue label="Total" value={`${obtained} / ${max}`} />
              <KeyValue label="Percentage" value={`${pct}%`} />
              {current?.grade ? <KeyValue label="Grade" value={current.grade} /> : null}
              {current?.result_status || current?.status ? <KeyValue label="Status" value={titleCase(current.result_status || current.status)} /> : null}
            </Card>
            <SectionTitle>Subject marks</SectionTitle>
            {marks.map((m) => (
              <Card key={m.subject_uuid || m.subject_name} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{m.subject_name}</Text>
                {m.is_absent ? <Badge label="Absent" tone="red" /> : <Text style={{ color: colors.text, fontWeight: '700' }}>{num(m.marks)} / {num(m.max_marks)}</Text>}
              </Card>
            ))}
          </>
        )
      ) : null}
    </Screen>
  );
}

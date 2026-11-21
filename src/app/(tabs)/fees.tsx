import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Badge, Button, Card, Empty, ErrorView, KeyValue, Loading, Screen, Segmented, Stat, colors } from '@/components/ui';
import { asArray } from '@/lib/api';
import { WEB_URL } from '@/lib/config';
import { downloadAndOpen } from '@/lib/files';
import { formatDate, money, num, pick, titleCase } from '@/lib/format';
import { portal } from '@/lib/student-api';
import { useData } from '@/lib/use-data';

const statusTone = (s: string) => (s === 'PAID' ? 'green' : s === 'PARTIAL' || s === 'PARTIALLY_PAID' ? 'amber' : s === 'OVERDUE' ? 'red' : 'blue');

export default function Fees() {
  const [tab, setTab] = useState<'dues' | 'history'>('dues');
  const dues = useData(async () => asArray(await portal.dues(), ['dues']));
  const history = useData(async () => asArray(await portal.payments(), ['payments', 'transactions']));
  const [downloading, setDownloading] = useState<string | null>(null);

  const rows = dues.data ?? [];
  const total = rows.reduce((s, d) => s + num(d.amount), 0);
  const discount = rows.reduce((s, d) => s + num(d.discount), 0);
  const paid = rows.reduce((s, d) => s + num(d.paid_amount), 0);
  const balance = rows.reduce((s, d) => s + num(d.balance_amount), 0);
  const late = rows.reduce((s, d) => s + num(d.late_fee), 0);

  const receipt = async (p: any) => {
    const id = pick(p, ['transaction_uuid', 'payment_uuid', 'uuid']);
    if (!id) return;
    setDownloading(id);
    try {
      await downloadAndOpen(`/payments/${id}/receipt`, `receipt-${pick(p, ['receipt_no'], id)}.pdf`);
    } catch (e: any) {
      Alert.alert('Receipt', e?.message || 'Unable to download the receipt.');
    } finally {
      setDownloading(null);
    }
  };

  const refresh = () => (tab === 'dues' ? dues.refresh() : history.refresh());

  return (
    <Screen refreshing={tab === 'dues' ? dues.refreshing : history.refreshing} onRefresh={refresh}>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'dues', label: 'My dues' }, { value: 'history', label: 'Payments' }]} />

      {tab === 'dues' ? (
        <>
          {dues.error ? <ErrorView message={dues.error} onRetry={dues.refresh} /> : null}
          {dues.loading && !dues.data ? <Loading label="Loading fee details…" /> : null}
          {dues.data ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Stat label="Balance due" value={money(balance)} icon="alert-circle-outline" tone={balance > 0 ? 'red' : 'green'} />
                <Stat label="Paid" value={money(paid)} icon="checkmark-circle-outline" tone="green" />
              </View>
              <Card>
                <KeyValue label="Total fees" value={money(total)} />
                {discount > 0 ? <KeyValue label="Discount" value={`− ${money(discount)}`} /> : null}
                {late > 0 ? <KeyValue label="Late fee" value={money(late)} /> : null}
                <KeyValue label="Paid" value={money(paid)} />
                <KeyValue label="Balance" value={money(balance)} />
              </Card>
              {balance > 0 && WEB_URL ? <Button title="Pay online" icon="card-outline" onPress={() => router.push('/pay')} /> : null}
              {rows.length === 0 ? (
                <Card><Empty icon="wallet-outline" title="No fees assigned" hint="Your fee details will appear here once the school assigns them." /></Card>
              ) : (
                rows.map((d, i) => {
                  const status = String(pick(d, ['payment_status', 'status'], num(d.balance_amount) <= 0 ? 'PAID' : 'PENDING')).toUpperCase();
                  return (
                    <Card key={pick(d, ['due_uuid'], i)} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                        <Text style={{ fontWeight: '700', color: colors.text, flex: 1 }}>{pick(d, ['component_name', 'fee_name'], 'Fee')}</Text>
                        <Badge label={titleCase(status)} tone={statusTone(status) as any} />
                      </View>
                      <Text style={{ color: colors.muted }}>
                        {[d.fee_month && titleCase(d.fee_month), d.due_date && `Due ${formatDate(d.due_date)}`].filter(Boolean).join(' · ')}
                      </Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                        <Text style={{ color: colors.muted }}>Amount {money(d.amount)}</Text>
                        <Text style={{ color: num(d.balance_amount) > 0 ? colors.red : colors.green, fontWeight: '700' }}>Balance {money(d.balance_amount)}</Text>
                      </View>
                    </Card>
                  );
                })
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          {history.error ? <ErrorView message={history.error} onRetry={history.refresh} /> : null}
          {history.loading && !history.data ? <Loading label="Loading payments…" /> : null}
          {history.data && history.data.length === 0 ? <Card><Empty icon="receipt-outline" title="No payments yet" /></Card> : null}
          {(history.data ?? []).map((p, i) => {
            const id = pick(p, ['transaction_uuid', 'payment_uuid', 'uuid'], String(i));
            return (
              <Card key={id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', color: colors.text }}>{money(pick(p, ['total_amount', 'paid_amount', 'amount'], 0))}</Text>
                  <Text style={{ color: colors.muted }}>{formatDate(pick(p, ['payment_date', 'created_at']))}</Text>
                </View>
                <Text style={{ color: colors.muted }}>
                  {[p.receipt_no && `Receipt ${p.receipt_no}`, titleCase(pick(p, ['payment_mode', 'payment_method', 'mode'], ''))].filter(Boolean).join(' · ')}
                </Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                  <Button small variant="outline" icon="download-outline" title="Receipt" loading={downloading === id} onPress={() => receipt(p)} />
                </View>
              </Card>
            );
          })}
        </>
      )}
    </Screen>
  );
}

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Alert as AlertType, Stock, api } from '../api';

export const AlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.listAlerts(), api.listStocks()])
      .then(([a, s]) => {
        setAlerts(a);
        setStocks(s);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const create = async () => {
    setError(null);
    const target = parseFloat(price);
    if (!symbol || isNaN(target) || target <= 0) {
      setError('Pick a symbol and enter a valid price');
      return;
    }
    try {
      const newAlert = await api.createAlert(symbol, target, condition);
      setAlerts((prev) => [newAlert, ...prev]);
      setSymbol('');
      setPrice('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  };

  const remove = async (id: string) => {
    await api.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const labelFor = (s: Stock) =>
    s.symbol.includes(':') ? s.symbol.split(':')[1].replace('USDT', '') : s.symbol;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Symbol</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {stocks.map((s) => (
            <Pressable
              key={s.symbol}
              style={[styles.chip, symbol === s.symbol && styles.chipActive]}
              onPress={() => setSymbol(s.symbol)}
            >
              <Text style={[styles.chipText, symbol === s.symbol && styles.chipTextActive]}>
                {labelFor(s)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.fieldLabel}>Target price (USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 150.00"
          placeholderTextColor="#777"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.fieldLabel}>Trigger when price is</Text>
        <View style={styles.conditionRow}>
          {(['ABOVE', 'BELOW'] as const).map((c) => (
            <Pressable
              key={c}
              style={[styles.conditionChip, condition === c && styles.conditionActive]}
              onPress={() => setCondition(c)}
            >
              <Text style={[styles.conditionText, condition === c && styles.conditionTextActive]}>
                {c === 'ABOVE' ? 'Above target' : 'Below target'}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={create}>
          <Text style={styles.buttonText}>Create alert</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color="#3B82F6" />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No alerts yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.meta}>
                  {item.condition === 'ABOVE' ? '\u2265' : '\u2264'} ${item.targetPrice.toFixed(2)}
                </Text>
                <Text style={styles.status}>
                  {item.active ? 'Active' : item.triggeredAt ? 'Triggered' : 'Inactive'}
                </Text>
              </View>
              <Pressable onPress={() => remove(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A', padding: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 16 },
  form: { backgroundColor: '#151B2B', borderRadius: 12, padding: 16, marginBottom: 24 },
  fieldLabel: { color: '#9BA3B8', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  chipsRow: { marginBottom: 16 },
  chipsContent: { paddingRight: 8 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999,
    backgroundColor: '#1E2538', marginRight: 8,
  },
  chipActive: { backgroundColor: '#3B82F6' },
  chipText: { color: '#9BA3B8', fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  input: {
    backgroundColor: '#1E2538', borderRadius: 12, paddingHorizontal: 16,
    paddingVertical: 12, color: '#fff', fontSize: 16, marginBottom: 16,
  },
  conditionRow: { flexDirection: 'row', marginBottom: 16 },
  conditionChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1E2538',
    alignItems: 'center', marginRight: 8,
  },
  conditionActive: { backgroundColor: '#3B82F6' },
  conditionText: { color: '#9BA3B8', fontSize: 13 },
  conditionTextActive: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#EF4444', marginBottom: 8, fontSize: 13 },
  empty: { color: '#5E6580', textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row', backgroundColor: '#151B2B', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 8,
  },
  symbol: { color: '#fff', fontSize: 16, fontWeight: '600' },
  meta: { color: '#9BA3B8', fontSize: 14, marginTop: 2 },
  status: { color: '#5E6580', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  delete: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});

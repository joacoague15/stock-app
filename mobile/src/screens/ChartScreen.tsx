import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { api, Candle } from '../api';
import { RootStackParamList } from './types';

type Props = NativeStackScreenProps<RootStackParamList, 'Chart'>;

function prettySymbol(symbol: string): string {
  if (symbol.includes(':')) {
    const pair = symbol.split(':')[1];
    if (pair.endsWith('USDT')) return `${pair.replace('USDT', '')} / USDT`;
    return pair;
  }
  return symbol;
}

const Y_AXIS_WIDTH = 56;

export const ChartScreen: React.FC<Props> = ({ route }) => {
  const { symbol } = route.params;
  const [candles, setCandles] = useState<Candle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCandles(symbol)
      .then(setCandles)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [symbol]);

  const values = candles?.s === 'ok' ? candles.c : [];
  const chartData = values.map((value) => ({ value }));

  const cardInnerWidth = Dimensions.get('window').width - 48 - 32;
  const plotWidth = cardInnerWidth - Y_AXIS_WIDTH;
  const spacing = chartData.length > 1 ? plotWidth / (chartData.length - 1) : plotWidth;

  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const pad = (max - min) * 0.15 || max * 0.05;
  const yOffset = Math.max(min - pad, 0);
  const maxValue = max + pad - yOffset;

  const title = prettySymbol(symbol);

  return (
    <View style={styles.container}>
      <Text style={styles.symbol}>{title}</Text>
      <Text style={styles.subtitle}>Last 30 days</Text>

      <View style={styles.card}>
        {loading ? (
          <ActivityIndicator color="#3B82F6" />
        ) : chartData.length === 0 ? (
          <Text style={styles.empty}>No data</Text>
        ) : (
          <LineChart
            data={chartData}
            width={plotWidth}
            height={220}
            spacing={spacing}
            color="#3B82F6"
            thickness={2}
            hideDataPoints
            curved
            areaChart
            startFillColor="#3B82F6"
            endFillColor="#3B82F6"
            startOpacity={0.35}
            endOpacity={0}
            yAxisOffset={yOffset}
            maxValue={maxValue}
            yAxisColor="#2A3045"
            xAxisColor="#2A3045"
            rulesColor="#2A3045"
            yAxisTextStyle={{ color: '#5E6580', fontSize: 11 }}
            initialSpacing={0}
            endSpacing={0}
            noOfSections={4}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A', padding: 24 },
  symbol: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subtitle: { color: '#9BA3B8', fontSize: 14, marginBottom: 24 },
  card: {
    backgroundColor: '#151B2B', borderRadius: 16, padding: 16,
    minHeight: 260, alignItems: 'center', justifyContent: 'center',
  },
  empty: { color: '#5E6580', fontSize: 16 },
});

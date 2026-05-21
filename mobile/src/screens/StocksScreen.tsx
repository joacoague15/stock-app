import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, Stock } from '../api';
import { useAuth } from '../auth';
import { connectSocket } from '../socket';
import { RootStackParamList } from './types';

type LivePrice = { price: number; previousClose: number };

type Props = NativeStackScreenProps<RootStackParamList, 'Stocks'>;

export const StocksScreen: React.FC<Props> = ({ navigation }) => {
  const { logout } = useAuth();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listStocks()
      .then((data) => {
        setStocks(data);
        const initial: Record<string, LivePrice> = {};
        for (const s of data) {
          if (s.quote) initial[s.symbol] = { price: s.quote.c, previousClose: s.quote.pc };
        }
        setLivePrices(initial);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Live updates via socket.
  useEffect(() => {
    if (stocks.length === 0) return;
    const socket = connectSocket();
    const symbols = stocks.map((s) => s.symbol);

    const onTrade = (trade: { s: string; p: number }) => {
      setLivePrices((prev) => ({
        ...prev,
        [trade.s]: {
          price: trade.p,
          previousClose: prev[trade.s]?.previousClose ?? trade.p,
        },
      }));
    };

    socket.on('connect', () => socket.emit('subscribe', symbols));
    socket.on('trade', onTrade);
    if (socket.connected) socket.emit('subscribe', symbols);

    return () => {
      socket.off('trade', onTrade);
      socket.emit('unsubscribe', symbols);
    };
  }, [stocks]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Stocks</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>

      <FlatList
        data={stocks}
        keyExtractor={(item) => item.symbol}
        renderItem={({ item }) => {
          const live = livePrices[item.symbol];
          const change = live ? ((live.price - live.previousClose) / live.previousClose) * 100 : 0;
          const positive = change >= 0;
          return (
            <Pressable
              style={styles.row}
              onPress={() => navigation.navigate('Chart', { symbol: item.symbol })}
            >
              <View>
                <Text style={styles.symbol}>{item.symbol}</Text>
                <Text style={styles.name}>{item.name}</Text>
              </View>
              <View style={styles.priceCol}>
                <Text style={styles.price}>
                  {live ? `$${live.price.toFixed(2)}` : '—'}
                </Text>
                {live ? (
                  <Text style={[styles.change, { color: positive ? '#10B981' : '#EF4444' }]}>
                    {positive ? '+' : ''}{change.toFixed(2)}%
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={styles.alertsBtn}
        onPress={() => navigation.navigate('Alerts')}
      >
        <Text style={styles.alertsBtnText}>Manage Alerts</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A', padding: 16 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700' },
  logout: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  row: {
    backgroundColor: '#151B2B',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  symbol: { color: '#fff', fontSize: 16, fontWeight: '600' },
  name: { color: '#9BA3B8', fontSize: 13, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { color: '#fff', fontSize: 16, fontWeight: '600' },
  change: { fontSize: 13, marginTop: 2 },
  alertsBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  alertsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

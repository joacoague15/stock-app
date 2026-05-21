import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BannerData, NotificationBanner } from './src/components/NotificationBanner';
import { AuthProvider, useAuth } from './src/auth';
import { setForegroundHandler, setupFcm } from './src/fcm';
import { AlertsScreen } from './src/screens/AlertsScreen';
import { ChartScreen } from './src/screens/ChartScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { StocksScreen } from './src/screens/StocksScreen';
import { RootStackParamList } from './src/screens/types';
import { connectSocket, disconnectSocket } from './src/socket';

const Stack = createNativeStackNavigator<RootStackParamList>();

const theme = {
  ...DefaultTheme,
  dark: true,
  colors: { ...DefaultTheme.colors, background: '#0B0F1A', card: '#0B0F1A', text: '#fff', border: '#2A3045', primary: '#3B82F6' },
};

const Root: React.FC = () => {
  const { token, ready } = useAuth();
  const [banner, setBanner] = useState<BannerData | null>(null);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setForegroundHandler(null);
      return;
    }
    connectSocket();
    setForegroundHandler((title, body) => setBanner({ title, body }));
    setupFcm();
    return () => setForegroundHandler(null);
  }, [token]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' }}>
        <ActivityIndicator color="#3B82F6" />
      </View>
    );
  }

  if (!token) return <LoginScreen />;

  return (
    <>
      <NavigationContainer theme={theme}>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0B0F1A' },
            headerTintColor: '#3B82F6',
            headerTitleStyle: { color: '#fff' },
          }}
        >
          <Stack.Screen name="Stocks" component={StocksScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Chart" component={ChartScreen} options={({ route }) => ({ title: route.params.symbol })} />
          <Stack.Screen name="Alerts" component={AlertsScreen} options={{ title: 'Alerts' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <NotificationBanner data={banner} onDismiss={() => setBanner(null)} />
    </>
  );
};

const App: React.FC = () => (
  <SafeAreaProvider>
    <StatusBar barStyle="light-content" backgroundColor="#0B0F1A" />
    <AuthProvider>
      <Root />
    </AuthProvider>
  </SafeAreaProvider>
);

export default App;

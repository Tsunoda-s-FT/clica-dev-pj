// App.tsx
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ActivityIndicator, View, Text } from 'react-native';

import { AuthTabsProps, MainStackProps, LoginData, AuthTabsParamList } from './types';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

const log = (...args: any[]) => console.log('[App]', ...args);

log('Starting application');

const Tab = createBottomTabNavigator<AuthTabsParamList>();
const Stack = createStackNavigator();

const AuthTabs: React.FC<AuthTabsProps> = ({ onLogin }) => {
  log('AuthTabs Render');
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = focused
            ? (route.name === 'Home' ? 'home' : 'settings')
            : (route.name === 'Home' ? 'home-outline' : 'settings-outline');
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#87CEFA',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Home"
        children={(props) => <HomeScreen {...props} onLogin={onLogin} />}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Settings"
        children={() => <SettingsScreen onSettingsSubmit={onLogin} />}
      />
    </Tab.Navigator>
  );
};

const MainStack: React.FC<MainStackProps> = ({ onLogin }) => {
  log('MainStack Render');
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthTabs">
        {(props) => <AuthTabs {...props} onLogin={onLogin} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

const App: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      log('Checking login status from storage');
      try {
        const loginData = await AsyncStorage.getItem('loginData');
        const loggedIn = !!loginData;
        setIsLoggedIn(loggedIn);
        log('Login status:', loggedIn);
      } catch (error) {
        console.error('[App] Error checking login status:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogin = async (loginData: LoginData) => {
    log('handleLogin called with:', loginData);
    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(loginData));
      setIsLoggedIn(true);
      log('Login data saved, user logged in');
    } catch (error) {
      console.error('[App] Error handling login:', error);
    }
  };

  if (loading) {
    log('Showing loading indicator while checking login');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#333' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <MainStack onLogin={handleLogin} isLoggedIn={isLoggedIn} />
    </NavigationContainer>
  );
};

export default App;

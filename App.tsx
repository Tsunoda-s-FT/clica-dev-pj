import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { WebView } from 'react-native-webview';

import LoginScreen from './screens/LoginScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoadingIndicator from './components/LoadingIndicator';
import { AuthTabsProps, MainStackProps, LoginData, LoginScreenProps, AuthTabsParamList } from './types'; // AuthTabsParamListをインポート

const Tab = createBottomTabNavigator<AuthTabsParamList>();
const Stack = createStackNavigator();

const AuthTabs: React.FC<AuthTabsProps> = ({ onLogin }) => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = focused
          ? route.name === 'Home'
            ? 'home'
            : 'settings'
          : route.name === 'Home'
          ? 'home-outline'
          : 'settings-outline';

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#87CEFA',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen
      name="Home"
      component={(props: LoginScreenProps) => (
        <LoginScreen {...props} onLogin={onLogin} />
      )}
      options={{ tabBarLabel: 'Home' }}
    />
    <Tab.Screen
      name="Settings"
      children={() => <SettingsScreen onSettingsSubmit={onLogin} />}
    />
  </Tab.Navigator>
);

const MainStack: React.FC<MainStackProps> = ({ onLogin, isLoggedIn }) => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AuthTabs">
      {(props) => <AuthTabs {...props} onLogin={onLogin} />}
    </Stack.Screen>
    <Stack.Screen name="Main" component={WebView} />
  </Stack.Navigator>
);

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkLoginStatus = async () => {
      try {
        const loginData = await AsyncStorage.getItem('loginData');
        setIsLoggedIn(!!loginData);
      } catch (error) {
        console.error('Error checking login status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogin = async (loginData: LoginData) => {
    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(loginData));
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Error handling login:', error);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <NavigationContainer>
      <MainStack onLogin={handleLogin} isLoggedIn={isLoggedIn} />
    </NavigationContainer>
  );
};

export default App;

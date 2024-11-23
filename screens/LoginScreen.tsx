import React, { useEffect, useState } from 'react';
import { SafeAreaView, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData, NavigationProps, LoginScreenProps } from '../types';

const MAX_LOGIN_ATTEMPTS = 10;

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [loginData, setLoginData] = useState<LoginData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [webViewKey, setWebViewKey] = useState<number>(0);
  const [currentUrl, setCurrentUrl] = useState<string>('https://clica.jp/app/');
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const fetchLoginData = async () => {
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        setLoginData(parsedData);
        console.log('Login data fetched:', parsedData);
      }
    } catch (error) {
      console.error('Error fetching login data:', error);
      Alert.alert('Error', 'Failed to fetch login data');
    }
  };

  useEffect(() => {
    fetchLoginData().finally(() => setIsLoading(false));
  }, [navigation]);

  useEffect(() => {
    if (isFocused) {
      fetchLoginData();
      console.log('LoginScreen focused, reloading WebView...');
      setWebViewKey(prevKey => prevKey + 1);
    }
  }, [isFocused]);

  useEffect(() => {
    if (isLoggedIn) {
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    }
  }, [isLoggedIn, navigation]);

  const injectJavaScriptToFillForm = (): string => {
    if (!loginData?.autoLoginEnabled) {
      console.log('Auto-login disabled or login data missing');
      return '';
    }

    console.log('Injecting JavaScript with:', loginData);
    return `
      (function() {
        console.log('Starting form fill...');
        var userInput = document.getElementById('ctl00_cplPageContent_txtUserID');
        var passwordInput = document.getElementById('ctl00_cplPageContent_txtPassword');

        if (userInput && passwordInput) {
          userInput.value = '${loginData.userID}';
          passwordInput.value = '${loginData.password}';
          console.log('Form filled');
          setTimeout(() => {
            __doPostBack('ctl00$cplPageContent$LinkButton1', '');
            console.log('Form submitted');
          }, 1000);
        }

        var logoutButton = document.querySelector('a[href="https://clica.jp/app/logout.aspx"]');
        if (logoutButton) {
          console.log('Logout button found');
          logoutButton.addEventListener('click', function() {
            window.ReactNativeWebView.postMessage('logout');
            console.log('Logout message sent');
          });
        }
      })();
    `;
  };

  const handleNavigationStateChange = async (event: WebViewNavigation) => {
    console.log('Navigating to:', event.url);

    const isLoginSuccess = event.url.includes('home/default.aspx');
    setIsLoggedIn(isLoginSuccess);

    if (event.url.includes('default.aspx') && loginData?.autoLoginEnabled) {
      setLoginAttempts(prevAttempts => {
        const newAttempts = prevAttempts + 1;
        console.log(`Login attempt: ${newAttempts}`);

        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          handleMaxAttemptsReached();
        }

        return newAttempts;
      });
    }

    if (event.url.includes('logout.aspx')) {
      await handleLogout();
    }
  };

  const handleMaxAttemptsReached = async () => {
    console.log('Max login attempts reached');
    setLoginData(null);
    setLoginAttempts(0);
    await AsyncStorage.removeItem('loginData');
    Alert.alert('Login Error', 'Too many login attempts. Please re-enter your credentials.', [
      { 
        text: 'OK',
        onPress: () => navigation.navigate('Settings' as never)
      }
    ]);
  };

  const handleLogout = async () => {
    console.log('Handling logout');
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        await AsyncStorage.setItem('loginData', JSON.stringify({
          ...parsedData,
          autoLoginEnabled: false
        }));
      }
      setIsLoggedIn(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthTabs' as never }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    if (request.url.startsWith('http://clica.jp')) {
      const secureUrl = request.url.replace('http://', 'https://');
      setCurrentUrl(secureUrl);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    if (request.navigationType === 'click' && request.url !== currentUrl) {
      setCurrentUrl(request.url);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    return true;
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        key={webViewKey}
        source={{ uri: currentUrl }}
        injectedJavaScript={injectJavaScriptToFillForm()}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={event => {
          if (event.nativeEvent.data === 'logout') {
            handleLogout();
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        mixedContentMode="compatibility"
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

export default LoginScreen;
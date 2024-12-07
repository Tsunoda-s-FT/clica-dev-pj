// screens/HomeScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { Alert, StatusBar, ActivityIndicator, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LoginData, HomeScreenProps } from '../types';

const MAX_LOGIN_ATTEMPTS = 3;
const INITIAL_URL = 'https://clica.jp/app/';

const log = (...args: any[]) => console.log('[HomeScreen]', ...args);

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin }) => {
  log('Render start');

  const [loginData, setLoginData] = useState<LoginData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [webViewKey, setWebViewKey] = useState<number>(0);
  const [currentUrl, setCurrentUrl] = useState<string>(INITIAL_URL);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  const [isProcessingLogout, setIsProcessingLogout] = useState<boolean>(false);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const webViewRef = useRef<WebView>(null);

  useEffect(() => {
    log('Checking focus. isFocused:', isFocused);
    if (isFocused && !isLoggedIn && !isProcessingLogout) {
      log('Screen is focused, fetching login data and reloading WebView');
      fetchLoginData().finally(() => {
        log('Done fetching login data');
        setIsLoading(false);
        forceRefreshWebView();
      });
    }
  }, [isFocused, isLoggedIn, isProcessingLogout]);

  useEffect(() => {
    log('isLoggedIn changed:', isLoggedIn);
    navigation.setOptions({ tabBarStyle: { display: isLoggedIn ? 'none' : 'flex' } });
    log(isLoggedIn ? 'User logged in, hiding tab bar' : 'User logged out, showing tab bar');
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    if (isInitialLoad) {
      log('Initial load detected, force refresh WebView');
      forceRefreshWebView();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  const fetchLoginData = async () => {
    log('Fetching login data from AsyncStorage...');
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        setLoginData(parsedData);
        log('Login data found:', parsedData);
      } else {
        log('No login data found');
      }
    } catch (error) {
      console.error('[HomeScreen] Error fetching login data:', error);
      Alert.alert('Error', 'Failed to fetch login data');
    }
  };

  const forceRefreshWebView = () => {
    setWebViewKey(prevKey => prevKey + 1);
  };

  const handleMaxAttemptsReached = async () => {
    log('Max login attempts reached');
    try {
      setLoginAttempts(0);
      if (loginData) {
        const updatedData = { ...loginData, autoLoginEnabled: false };
        await AsyncStorage.setItem('loginData', JSON.stringify(updatedData));
        setLoginData(updatedData);
        log('Auto-login disabled after max attempts');
      }
      Alert.alert('ログインエラー', 'ログイン設定を確認してください。', [
        {
          text: 'OK',
          onPress: () => {
            log('Navigating to Settings due to max attempts');
            navigation.navigate('Settings' as never);
          }
        }
      ]);
    } catch (error) {
      console.error('[HomeScreen] Error handling max attempts:', error);
    }
  };

  // Refactoring point:
  // Remove redundant retry logic inside fillForm and rely solely on waitForElement.
  const injectJavaScriptToFillForm = (): string => {
    if (!loginData?.autoLoginEnabled || isLoggedIn || loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      log('Not injecting JS (autoLogin disabled or already logged in or max attempts reached)');
      return '';
    }

    log('Preparing JS injection for auto-login');
    return `
      (function() {
        console.log('Injected JS: Attempting form fill');

        function waitForElement(selector, callback, maxTries = 10) {
          let tries = 0;
          function check() {
            const element = document.querySelector(selector);
            if (element && document.readyState === 'complete') {
              callback();
            } else {
              tries++;
              if (tries < maxTries) {
                setTimeout(check, 500);
              } else {
                console.log('Injected JS: Element not found after max attempts');
              }
            }
          }
          check();
        }

        function fillForm() {
          console.log('Injected JS: Filling form...');
          const userInput = document.getElementById('ctl00_cplPageContent_txtUserID');
          const passwordInput = document.getElementById('ctl00_cplPageContent_txtPassword');

          if (!userInput || !passwordInput) {
            console.log('Injected JS: Form elements not found after wait - cannot fill');
            return;
          }

          userInput.value = '${loginData?.userID || ''}';
          passwordInput.value = '${loginData?.password || ''}';
          setTimeout(() => {
            console.log('Injected JS: Submitting form now');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'formSubmitted' }));
            __doPostBack('ctl00$cplPageContent$LinkButton1', '');
          }, 500);
        }

        // Wait for the user ID field to appear, then fill the form.
        waitForElement('#ctl00_cplPageContent_txtUserID', fillForm);
      })();
    `;
  };

  const handleLogout = async () => {
    log('Processing logout...');
    if (isProcessingLogout) {
      log('Logout already in progress, aborting');
      return;
    }

    setIsProcessingLogout(true);
    try {
      setIsLoggedIn(false);
      setLoginAttempts(0);
      setCurrentUrl(INITIAL_URL);

      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        await AsyncStorage.setItem('loginData', JSON.stringify({
          ...parsedData,
          autoLoginEnabled: false
        }));
        log('Auto-login disabled in storage');
      }

      await Promise.all([
        new Promise(resolve => {
          setWebViewKey(prev => {
            const newKey = prev + 1;
            resolve(newKey);
            return newKey;
          });
        }),
        navigation.reset({
          index: 0,
          routes: [{ name: 'AuthTabs' as never }],
        })
      ]);
      log('Logout completed successfully');
    } catch (error) {
      console.error('[HomeScreen] Logout error:', error);
    } finally {
      setIsProcessingLogout(false);
    }
  };

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    log('Navigating to:', navState.url);

    if (isLoggedIn && navState.url === INITIAL_URL) {
      log('Detected return to INITIAL_URL while logged in -> logout');
      handleLogout();
      return;
    }

    if (!isLoggedIn && navState.url.includes('/home/default.aspx')) {
      log('Login successful');
      setIsLoggedIn(true);
      setLoginAttempts(0);
      if (loginData) {
        onLogin?.(loginData);
      }
      return;
    }

    if (!isLoggedIn && isFormSubmitted && navState.url.includes('default.aspx')) {
      log('Form submitted, counting login attempt');
      setIsFormSubmitted(false);
      setLoginAttempts(prevAttempts => {
        const newAttempts = prevAttempts + 1;
        log(`Login attempt ${newAttempts}/${MAX_LOGIN_ATTEMPTS}`);
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          handleMaxAttemptsReached();
        }
        return newAttempts;
      });
    }
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    log('Should load URL:', request.url);

    if (!isLoggedIn && request.url === 'about:blank') {
      log('Redirecting from about:blank to main URL');
      setCurrentUrl(INITIAL_URL);
      forceRefreshWebView();
      return false;
    }

    if (request.url.startsWith('http://clica.jp')) {
      log('Convert HTTP to HTTPS');
      const secureUrl = request.url.replace('http://', 'https://');
      setCurrentUrl(secureUrl);
      forceRefreshWebView();
      return false;
    }

    if (request.navigationType === 'click' && request.url !== currentUrl) {
      log('User clicked a link, updating URL');
      setCurrentUrl(request.url);
      forceRefreshWebView();
      return false;
    }

    return true;
  };

  const injectJS = () => {
    const jsCode = injectJavaScriptToFillForm();
    if (jsCode && webViewRef.current) {
      log('Injecting JS for auto-login');
      webViewRef.current.injectJavaScript(jsCode);
    }
  };

  const handleLoadEnd = () => {
    log('WebView load ended');
    setTimeout(injectJS, 500);
  };

  if (isLoading) {
    log('Loading indicator displayed');
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#333' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <WebView
        ref={webViewRef}
        key={webViewKey}
        source={{
          uri: currentUrl,
          headers: { 'Cache-Control': 'no-cache' },
        }}
        incognito={false}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        domStorageEnabled={true}
        pullToRefreshEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'formSubmitted') {
              log('WebView message: Form submitted');
              setIsFormSubmitted(true);
            }
          } catch {
            if (event.nativeEvent.data === 'logout') {
              log('WebView message: logout');
              handleLogout();
            } else {
              log('WebView message:', event.nativeEvent.data);
            }
          }
        }}
        onLoadStart={() => log('WebView load start')}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          console.error('[HomeScreen] WebView error:', syntheticEvent.nativeEvent);
        }}
        javaScriptEnabled={true}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

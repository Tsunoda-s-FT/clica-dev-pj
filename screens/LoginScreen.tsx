import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData, NavigationProps, LoginScreenProps } from '../types';

const MAX_LOGIN_ATTEMPTS = 10;
const INITIAL_URL = 'https://clica.jp/app/';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [loginData, setLoginData] = useState<LoginData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [webViewKey, setWebViewKey] = useState<number>(0);
  const [currentUrl, setCurrentUrl] = useState<string>(INITIAL_URL);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const webViewRef = useRef<WebView>(null);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  const fetchLoginData = async () => {
    try {
      console.log('🔍 Fetching login data from AsyncStorage...');
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        setLoginData(parsedData);
        console.log('✅ Login data fetched successfully:', parsedData);
      } else {
        console.log('⚠️ No login data found in AsyncStorage');
      }
    } catch (error) {
      console.error('❌ Error fetching login data:', error);
      Alert.alert('Error', 'Failed to fetch login data');
    }
  };

  useEffect(() => {
    console.log('🔄 Screen focus state changed. isFocused:', isFocused);
    if (isFocused && !isLoggedIn) {
      console.log('📱 Screen is focused, initiating data fetch and WebView reload');
      fetchLoginData().finally(() => {
        setIsLoading(false);
        setWebViewKey(prevKey => {
          console.log('🔑 Updating WebView key from', prevKey, 'to', prevKey + 1);
          return prevKey + 1;
        });
      });
    }
  }, [isFocused, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      console.log('👤 User logged in, hiding tab bar');
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    }
  }, [isLoggedIn, navigation]);

  useEffect(() => {
    if (isInitialLoad) {
      console.log('🔄 Initial load detected, forcing refresh');
      setWebViewKey(prevKey => prevKey + 1);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('🌐 Navigating to:', navState.url);
    
    if (navState.url.includes('/home/default.aspx') && !isLoggedIn) {
      console.log('✅ Login successful');
      setIsLoggedIn(true);
      setLoginAttempts(0);
      
      try {
        if (loginData) {
          onLogin?.(loginData);
        }
      } catch (error) {
        console.error('❌ Error handling login success:', error);
      }
      return;
    }

    if (!isLoggedIn && !navState.url.includes('/home/default.aspx')) {
      if (navState.url === 'about:blank') {
        return;
      }
      
      setLoginAttempts(prevAttempts => {
        const newAttempts = prevAttempts + 1;
        console.log('🔄 Login attempt', newAttempts + '/' + MAX_LOGIN_ATTEMPTS);
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          handleMaxAttemptsReached();
        }
        return newAttempts;
      });
    }
  };

  const handleMaxAttemptsReached = async () => {
    console.log('⚠️ Max login attempts reached');
    try {
      setLoginAttempts(0);
      if (loginData) {
        const updatedData = {
          ...loginData,
          autoLoginEnabled: false
        };
        await AsyncStorage.setItem('loginData', JSON.stringify(updatedData));
        setLoginData(updatedData);
        console.log('✅ Auto-login disabled after max attempts');
      }
      Alert.alert('Login Error', 'Too many login attempts. Please re-enter your credentials.', [
        { 
          text: 'OK',
          onPress: () => navigation.navigate('Settings' as never)
        }
      ]);
    } catch (error) {
      console.error('❌ Error handling max attempts:', error);
    }
  };

  const injectJavaScriptToFillForm = (): string => {
    if (!loginData?.autoLoginEnabled || isLoggedIn) {
      console.log('⚠️ Auto-login disabled or already logged in');
      return '';
    }

    return `
      (function() {
        console.log('📝 DOM ready, executing fillForm immediately');
        
        function waitForElement(selector, callback, maxTries = 10) {
          let tries = 0;
          
          function check() {
            const element = document.querySelector(selector);
            if (element) {
              if (document.readyState === 'complete') {
                callback(element);
                return;
              }
            }
            
            tries++;
            if (tries < maxTries) {
              setTimeout(check, 500);
            } else {
              console.log('⚠️ Element not found after maximum attempts');
            }
          }
          
          check();
        }

        function fillForm() {
          console.log('🔄 Starting form fill attempt...');
          
          console.log('🔍 Form Status Check:');
          console.log('📄 DOM State:', document.readyState);
          console.log('📄 Current URL:', window.location.href);
          
          const userInput = document.getElementById('ctl00_cplPageContent_txtUserID');
          const passwordInput = document.getElementById('ctl00_cplPageContent_txtPassword');
          
          console.log('👤 User Input Field:', !!userInput);
          console.log('🔑 Password Field:', !!passwordInput);
          
          if (userInput) {
            console.log('📝 User Input Value:', userInput.value);
            console.log('📝 User Input Visible:', userInput.offsetParent !== null);
          }

          if (userInput && passwordInput) {
            console.log('✅ Form elements found, filling data...');
            
            userInput.value = '${loginData.userID}';
            passwordInput.value = '${loginData.password}';
            
            console.log('⏰ Setting submit timeout...');
            setTimeout(() => {
              try {
                console.log('⏰ Submit timeout triggered');
                console.log('📤 Attempting form submission...');
                __doPostBack('ctl00$cplPageContent$LinkButton1', '');
                console.log('✅ Form submitted successfully');
              } catch (error) {
                console.error('❌ Form submission error:', error);
              }
            }, 1500);
            console.log('⏰ Submit timeout set: 1.5s');
          } else {
            let retryCount = 0;
            const maxRetries = 10;
            
            function retryFill() {
              retryCount++;
              console.log('⏳ Form elements not found, retry attempt ' + retryCount + '/' + maxRetries);
              
              if (retryCount < maxRetries) {
                console.log('⏰ Retry timeout set: 1.5s');
                setTimeout(fillForm, 1500);
              } else {
                console.log('❌ Max retries reached, form fill failed');
              }
            }
            
            retryFill();
          }
        }

        waitForElement('#ctl00_cplPageContent_txtUserID', () => {
          fillForm();
        });
      })();
    `;
  };

  const handleLogout = async (logoutData: LoginData | null | undefined = null) => {
    console.log('🔄 Processing logout...');
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        await AsyncStorage.setItem('loginData', JSON.stringify({
          ...parsedData,
          autoLoginEnabled: false
        }));
        console.log('✅ Auto-login disabled in storage');
      }
      setIsLoggedIn(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthTabs' as never }],
      });
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    console.log('🔍 Load request for URL:', request.url);
    
    if (request.url === 'about:blank') {
      console.log('⚡ Redirecting from about:blank to main URL');
      setCurrentUrl(INITIAL_URL);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    if (request.url.startsWith('http://clica.jp')) {
      console.log('🔒 Converting HTTP to HTTPS');
      const secureUrl = request.url.replace('http://', 'https://');
      setCurrentUrl(secureUrl);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    if (request.navigationType === 'click' && request.url !== currentUrl) {
      console.log('👆 User click detected, updating URL');
      setCurrentUrl(request.url);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    return true;
  };

  const injectJS = () => {
    if (webViewRef.current) {
      const jsCode = injectJavaScriptToFillForm();
      if (jsCode) {
        console.log('💉 Preparing to inject JavaScript with login data');
        webViewRef.current.injectJavaScript(jsCode);
      }
    }
  };

  const handleLoadEnd = () => {
    console.log('✅ WebView load completed');
    setTimeout(injectJS, 1000);
  };

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
        key={webViewKey}
        source={{ 
          uri: currentUrl,
          headers: {
            'Cache-Control': 'no-cache'
          }
        }}
        cacheEnabled={false}
        pullToRefreshEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'console.log') {
              console.log('🌐 WebView:', ...message.data);
            } else if (message.type === 'console.error') {
              console.error('🌐 WebView Error:', ...message.data);
            } else if (message.type === 'console.warn') {
              console.warn('🌐 WebView Warning:', ...message.data);
            } else if (message.type === 'maxRetries') {
              handleMaxAttemptsReached();
            } else if (message.type === 'error') {
              console.error('🌐 WebView Error:', message.data.error);
            }
          } catch (e) {
            if (event.nativeEvent.data === 'logout') {
              console.log('📨 Received logout message from WebView');
              handleLogout(loginData);
            } else {
              console.log('📨 WebView message:', event.nativeEvent.data);
            }
          }
        }}
        onLoadStart={() => console.log('🔄 WebView load starting...')}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          console.error('❌ WebView error:', syntheticEvent.nativeEvent);
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
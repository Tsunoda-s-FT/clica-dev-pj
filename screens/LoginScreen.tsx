import React, { useEffect, useState, useRef } from 'react';
import { SafeAreaView, Alert } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData, NavigationProps, LoginScreenProps } from '../types';

const MAX_LOGIN_ATTEMPTS = 3;
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
  const [isProcessingLogout, setIsProcessingLogout] = useState<boolean>(false);

  /**
   * ログインデータをAsyncStorageから取得します。
   */
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

  /**
   * 画面がフォーカスされた際にログインデータの取得とWebViewのリロードを行います。
   */
  useEffect(() => {
    console.log('🔄 Screen focus state changed. isFocused:', isFocused);
    if (isFocused && !isLoggedIn && !isProcessingLogout) {
      console.log('📱 Screen is focused, initiating data fetch and WebView reload');
      fetchLoginData().finally(() => {
        setIsLoading(false);
        setWebViewKey(prevKey => prevKey + 1);
      });
    }
  }, [isFocused, isLoggedIn]);

  /**
   * ログイン状態に応じてタブバーの表示を制御します。
   */
  useEffect(() => {
    if (isLoggedIn) {
      console.log('👤 User logged in, hiding tab bar');
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    }
  }, [isLoggedIn, navigation]);

  /**
   * 初期ロード時にWebViewを強制的にリフレッシュします。
   */
  useEffect(() => {
    if (isInitialLoad) {
      console.log('🔄 Initial load detected, forcing refresh');
      setWebViewKey(prevKey => prevKey + 1);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  /**
   * WebViewのナビゲーション状態が変化した際のハンドラ。
   * ログイン成功やログイン試行回数の管理を行います。
   */
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('🌐 Navigating to:', navState.url);
    
    if (navState.url.includes('/logout.aspx') || 
        (isLoggedIn && navState.url === INITIAL_URL)) {
      console.log('👋 Logout detected');
      handleLogout(loginData);
      return;
    }

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

    if (!isLoggedIn && navState.url.includes('default.aspx?k=')) {
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

  /**
   * ログイン試行が最大に達した際の処理。
   * 自動ログインを無効化し、ユーザーに再認証を促します。
   */
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

  /**
   * フォーム入力を自動で埋めるためのJavaScriptコードを生成します。
   * ログイン前のみ実行され、ログイン後は空文字を返します。
   */
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

  /**
   * ログアウト処理を行います。
   * 自動ログインを無効化し、アプリのナビゲーションをリセットします。
   */
  const handleLogout = async (logoutData: LoginData | null | undefined = null) => {
    if (isProcessingLogout) {
      console.log('⚠️ Logout already in progress');
      return;
    }

    console.log('🔄 Processing logout...');
    try {
      setIsProcessingLogout(true);
      
      setIsLoggedIn(false);
      setLoginAttempts(0);
      setCurrentUrl(INITIAL_URL);

      navigation.setOptions({ tabBarStyle: { display: 'flex' } });

      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        await AsyncStorage.setItem('loginData', JSON.stringify({
          ...parsedData,
          autoLoginEnabled: false
        }));
        console.log('✅ Auto-login disabled in storage');
      }

      await Promise.all([
        new Promise(resolve => {
          setWebViewKey(prev => {
            resolve(prev + 1);
            return prev + 1;
          });
        }),
        navigation.reset({
          index: 0,
          routes: [{ name: 'AuthTabs' as never }],
        })
      ]);

      console.log('✅ Logout completed successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setIsProcessingLogout(false);
    }
  };

  /**
   * WebViewが新しいリクエストを開始する際のハンドラ。
   * ログイン前のみ`about:blank`のリダイレクト処理を実施します。
   */
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    console.log('🔍 Load request for URL:', request.url);
    
    if (!isLoggedIn) {
      // ログイン前のみ、about:blankの処理を行う
      if (request.url === 'about:blank') {
        console.log('⚡ Redirecting from about:blank to main URL');
        setCurrentUrl(INITIAL_URL);
        setWebViewKey(prevKey => prevKey + 1);
        return false;
      }
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

  /**
   * JavaScriptコードをWebViewに注入します。
   */
  const injectJS = () => {
    if (webViewRef.current) {
      const jsCode = injectJavaScriptToFillForm();
      if (jsCode) {
        console.log('💉 Preparing to inject JavaScript with login data');
        webViewRef.current.injectJavaScript(jsCode);
      }
    }
  };

  /**
   * WebViewのロード完了時にJavaScriptを注入します。
   */
  const handleLoadEnd = () => {
    console.log('✅ WebView load completed');
    setTimeout(injectJS, 500);
  };

  /**
   * ローディングインジケータを表示中の場合のレンダリング。
   */
  if (isLoading) {
    return <LoadingIndicator />;
  }

  /**
   * メインのレンダリング。WebViewを表示します。
   */
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
        originWhitelist={['https://*', 'http://*', 'about:blank']}
        setSupportMultipleWindows={false}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

export default LoginScreen;
import React, { useEffect, useState, useRef } from 'react';
import { Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData, LoginScreenProps } from '../types';

// 最大ログイン試行回数の定義
const MAX_LOGIN_ATTEMPTS = 3;
// 初期表示URLの定義
const INITIAL_URL = 'https://clica.jp/app/';

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  // ログインデータの状態管理
  const [loginData, setLoginData] = useState<LoginData | null>(null);
  // ローディング状態の管理
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // WebViewの再レンダーを促すキーの管理
  const [webViewKey, setWebViewKey] = useState<number>(0);
  // 現在のURLの状態管理
  const [currentUrl, setCurrentUrl] = useState<string>(INITIAL_URL);
  // ログイン試行回数の管理
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  // ログイン状態の管理
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // ナォーム送信状態の管理
  const [isFormSubmitted, setIsFormSubmitted] = useState<boolean>(false);
  // ログアウト処理中の状態管理
  const [isProcessingLogout, setIsProcessingLogout] = useState<boolean>(false);

  // ナビゲーションオブジェクトの取得
  const navigation = useNavigation();
  // 画面のフォーカス状態の取得
  const isFocused = useIsFocused();
  // WebViewの参照を保持
  const webViewRef = useRef<WebView>(null);
  // 初回ロードの管理
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);

  /**
   * ログインデータをAsyncStorageから取得します。
   */
  const fetchLoginData = async () => {
    try {
      console.log('Fetching login data from AsyncStorage...');
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        setLoginData(parsedData);
        console.log('Login data fetched successfully:', parsedData);
      } else {
        console.log('No login data found in AsyncStorage');
      }
    } catch (error) {
      console.error('Error fetching login data:', error);
      Alert.alert('Error', 'Failed to fetch login data');
    }
  };

  /**
   * 画面がフォーカスされた際にログインデータの取得とWebViewのリロードを行います。
   */
  useEffect(() => {
    console.log('Screen focus state changed. isFocused:', isFocused);
    if (isFocused && !isLoggedIn && !isProcessingLogout) {
      console.log('Screen is focused, initiating data fetch and WebView reload');
      fetchLoginData().finally(() => {
        setIsLoading(false);
        setWebViewKey(prevKey => prevKey + 1);
      });
    }
  }, [isFocused, isLoggedIn, isProcessingLogout]);

  /**
   * ログイン状態に応じてタブバーの表示を制御します。
   */
  useEffect(() => {
    if (isLoggedIn) {
      console.log('User logged in, hiding tab bar');
      navigation.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      console.log('User logged out, showing tab bar');
      navigation.setOptions({ tabBarStyle: { display: 'flex' } });
    }
  }, [isLoggedIn, navigation]);

  /**
   * 初期ロード時にWebViewを強制的にリフレッシュします。
   */
  useEffect(() => {
    if (isInitialLoad) {
      console.log('Initial load detected, forcing refresh');
      setWebViewKey(prevKey => prevKey + 1);
      setIsInitialLoad(false);
    }
  }, [isInitialLoad]);

  /**
   * WebViewのナビゲーション状態が変化した際のハンドラ。
   * ログイン成功やログイン試行回数の管理を行います。
   */
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    console.log('Navigating to:', navState.url);
    
    // ログアウトURLに遷移した場合の処理
    if (navState.url.includes('/logout.aspx')) {
      console.log('Logout page detected');
      // ログアウト処理が完了するまで待機
      setTimeout(() => {
        handleLogout(loginData);
        setCurrentUrl(INITIAL_URL);
      }, 300);
      return;
    }

    // ログイン成功と判断できるURLに移動した場合の処理
    if (navState.url.includes('/home/default.aspx') && !isLoggedIn) {
      console.log('Login successful');
      setIsLoggedIn(true);
      setLoginAttempts(0);
      
      try {
        if (loginData) {
          onLogin?.(loginData);
        }
      } catch (error) {
        console.error('Error handling login success:', error);
      }
      return;
    }

    // ログイン試行中のURLパターンに一致した場合の処理
    if (!isLoggedIn && isFormSubmitted && navState.url.includes('default.aspx')) {
      console.log('Form submitted, tracking login attempts');
      setIsFormSubmitted(false);
      setLoginAttempts(prevAttempts => {
        const newAttempts = prevAttempts + 1;
        console.log('Login attempt', newAttempts + '/' + MAX_LOGIN_ATTEMPTS);
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
    console.log('Max login attempts reached');
    try {
      setLoginAttempts(0);
      if (loginData) {
        const updatedData = {
          ...loginData,
          autoLoginEnabled: false
        };
        await AsyncStorage.setItem('loginData', JSON.stringify(updatedData));
        setLoginData(updatedData);
        console.log('Auto-login disabled after max attempts');
      }
      Alert.alert('ログインエラー', 'ログイン設定を確認してください。', [
        { 
          text: 'OK',
          onPress: () => {
            console.log('Navigating to Settings screen due to max attempts');
            navigation.navigate('Settings' as never);
          }
        }
      ]);
    } catch (error) {
      console.error('Error handling max attempts:', error);
    }
  };

  /**
   * フォーム入力を自動で埋めるためのJavaScriptコードを生成します。
   * ログイン前のみ実行され、ログイン後は空文字を返します。
   */
  const injectJavaScriptToFillForm = (): string => {
    if (!loginData?.autoLoginEnabled || isLoggedIn || loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      console.log('Auto-login disabled, already logged in, or max login attempts reached');
      return '';
    }

    return `
      (function() {
        console.log('DOM ready, executing fillForm immediately');
        
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
              console.log('Element not found after maximum attempts');
            }
          }
          
          check();
        }

        function fillForm() {
          console.log('Starting form fill attempt...');
          
          console.log('Form Status Check:');
          console.log('DOM State:', document.readyState);
          console.log('Current URL:', window.location.href);
          
          const userInput = document.getElementById('ctl00_cplPageContent_txtUserID');
          const passwordInput = document.getElementById('ctl00_cplPageContent_txtPassword');
          
          console.log('User Input Field:', !!userInput);
          console.log('Password Field:', !!passwordInput);
          
          if (userInput) {
            console.log('User Input Value:', userInput.value);
            console.log('User Input Visible:', userInput.offsetParent !== null);
          }

          if (userInput && passwordInput) {
            console.log('Form elements found, filling data...');
            
            userInput.value = '${loginData.userID}';
            passwordInput.value = '${loginData.password}';
           
            console.log('Setting submit timeout...');
            setTimeout(() => {
              try {
                console.log('Submit timeout triggered');
                console.log('Attempting form submission...');
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'formSubmitted' }));
                __doPostBack('ctl00$cplPageContent$LinkButton1', '');
                console.log('Form submitted successfully');
              } catch (error) {
                console.error('Form submission error:', error);
              }
            }, 500);
            console.log('Submit timeout set: 1.5s');
          } else {
            let retryCount = 0;
            const maxRetries = 10;
            
            function retryFill() {
              retryCount++;
              console.log('Form elements not found, retry attempt ' + retryCount + '/' + maxRetries);
              
              if (retryCount < maxRetries) {
                console.log('Retry timeout set: 1.5s');
                setTimeout(fillForm, 500);
              } else {
                console.log('Max retries reached, form fill failed');
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
      console.log('Logout already in progress');
      return;
    }

    console.log('Processing logout...');
    try {
      setIsProcessingLogout(true);
      
      setIsLoggedIn(false);
      setLoginAttempts(0);
      setCurrentUrl(INITIAL_URL);

      // タブバーの表示を復元
      navigation.setOptions({ tabBarStyle: { display: 'flex' } });

      // ログインデータを取得し、自動ログインを無効化
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        await AsyncStorage.setItem('loginData', JSON.stringify({
          ...parsedData,
          autoLoginEnabled: false
        }));
        console.log('Auto-login disabled in storage');
      }

      // WebViewのリロードとナビゲーションのリセットを同時に実行
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

      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsProcessingLogout(false);
    }
  };

  /**
   * WebViewが新しいリクエストを開始する際のハンドラ。
   * ログイン前のみ`about:blank`のリダイレクト処理を実施します。
   */
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    console.log('Load request for URL:', request.url);
    
    if (!isLoggedIn && request.url === 'about:blank') {
      console.log('Redirecting from about:blank to main URL');
      setCurrentUrl(INITIAL_URL);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    if (request.url.startsWith('http://clica.jp')) {
      console.log('Converting HTTP to HTTPS');
      const secureUrl = request.url.replace('http://', 'https://');
      setCurrentUrl(secureUrl);
      setWebViewKey(prevKey => prevKey + 1);
      return false;
    }

    if (request.navigationType === 'click' && request.url !== currentUrl) {
      console.log('User click detected, updating URL');
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
        console.log('Preparing to inject JavaScript with login data');
        webViewRef.current.injectJavaScript(jsCode);
      }
    }
  };

  /**
   * WebViewのロード完了時にJavaScriptを注入します。
   */
  const handleLoadEnd = () => {
    console.log('WebView load completed');
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
            'Cache-Control': 'no-cache',
          },
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
            if (message.type === 'console.log') {
              console.log('WebView:', ...message.data);
            } else if (message.type === 'console.error') {
              console.error('WebView Error:', ...message.data);
            } else if (message.type === 'console.warn') {
              console.warn('WebView Warning:', ...message.data);
            } else if (message.type === 'maxRetries') {
              handleMaxAttemptsReached();
            } else if (message.type === 'formSubmitted') {
              console.log('Form submission detected from WebView');
              setIsFormSubmitted(true);
            } else if (message.type === 'error') {
              console.error('WebView Error:', message.data.error);
            }
          } catch (e) {
            if (event.nativeEvent.data === 'logout') {
              console.log('Received logout message from WebView');
              handleLogout(loginData);
            } else {
              console.log('WebView message:', event.nativeEvent.data);
            }
          }
        }}
        onLoadStart={() => console.log('WebView load starting...')}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          console.error('WebView error:', syntheticEvent.nativeEvent);
        }}
        javaScriptEnabled={true}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

export default LoginScreen;
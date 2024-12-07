// HomeScreen.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, StatusBar, ActivityIndicator, View, Text, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewNavigation } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LoginData, HomeScreenProps } from '../types';

// ====================== 定数定義部分 ======================
// アプリ内で使用するURLやパラメータを定数化しておくことで、後から変更が容易になる
const INITIAL_URL = 'https://clica.jp/app/';
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_SUCCESS_PATH = '/home/default.aspx'; // ログイン成功と判断するパス
const DEFAULT_PAGE_PATH = 'default.aspx'; // ログイン失敗時などに戻されるページ

// clicaアプリのベースURL
// ここでは clica.jp ドメインが正規のWebアプリURLと想定
const CLICA_BASE_URL = 'https://clica.jp';

// フォーム要素ID（clicaのログインフォームに依存）
const FORM_USER_ID_SELECTOR = '#ctl00_cplPageContent_txtUserID';
const FORM_PASSWORD_ID_SELECTOR = '#ctl00_cplPageContent_txtPassword';

// 各種待機・インターバル定数
const ELEMENT_WAIT_MAX_TRIES = 10; // 要素出現待ちの最大試行回数
const ELEMENT_WAIT_INTERVAL_MS = 500; // 要素出現待ちのインターバル(ms)
const FORM_SUBMIT_DELAY_MS = 500; // フォーム送信前のディレイ(ms)
const JS_INJECTION_DELAY_MS = 500; // ページロード完了後にJSを注入するまでのディレイ(ms)

// デバッグログ用関数（後からログ出力手段変更が容易）
function debugLog(...args: any[]) {
  console.log('[HomeScreen]', ...args);
}
// =========================================================

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogin }) => {
  // ==== 状態管理フック ====
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

  // ==== 関数群 ====

  /**
   * ログイン情報をAsyncStorageから取得する
   */
  const fetchLoginData = useCallback(async () => {
    debugLog('AsyncStorageからログイン情報を取得します');
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const parsedData: LoginData = JSON.parse(storedData);
        setLoginData(parsedData);
        debugLog('取得したログイン情報:', parsedData);
      } else {
        debugLog('ログイン情報は保存されていません');
      }
    } catch (error) {
      console.error('[HomeScreen] ログイン情報取得中にエラー:', error);
      Alert.alert('エラー', 'ログイン情報の取得に失敗しました');
    }
  }, []);

  /**
   * WebViewを強制的に再読み込みする
   */
  const forceRefreshWebView = useCallback(() => {
    debugLog('WebViewを強制リロードします');
    setWebViewKey(prevKey => prevKey + 1);
  }, []);

  /**
   * 最大ログイン試行回数に達した場合の処理
   * 自動ログインを無効化し、設定画面へ誘導する
   */
  const handleMaxAttemptsReached = useCallback(async () => {
    debugLog('最大ログイン試行回数に達しました。自動ログインを無効化し、設定画面へ遷移します。');
    try {
      setLoginAttempts(0);
      if (loginData) {
        const updatedData = { ...loginData, autoLoginEnabled: false };
        await AsyncStorage.setItem('loginData', JSON.stringify(updatedData));
        setLoginData(updatedData);
        debugLog('自動ログインを無効化しました');
      }

      Alert.alert('ログインエラー', 'ログイン設定を確認してください。', [
        {
          text: 'OK',
          onPress: () => {
            debugLog('最大試行失敗のためSettingsへ遷移');
            navigation.navigate('Settings' as never);
          },
        },
      ]);
    } catch (error) {
      console.error('[HomeScreen] 最大試行エラー処理中にエラー:', error);
    }
  }, [loginData, navigation]);

  /**
   * ログアウト処理
   * ログイン状態や自動ログインフラグを初期化し、Tabナビゲーションもリセット
   */
  const handleLogout = useCallback(async () => {
    debugLog('ログアウト処理を開始します...');
    if (isProcessingLogout) {
      debugLog('既にログアウト処理中のため、中断します');
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
        await AsyncStorage.setItem('loginData', JSON.stringify({ ...parsedData, autoLoginEnabled: false }));
        debugLog('ログアウト時に自動ログインを無効化しました');
      }

      await new Promise<void>(resolve => {
        setWebViewKey(prev => {
          const newKey = prev + 1;
          resolve();
          return newKey;
        });
      });

      navigation.reset({
        index: 0,
        routes: [{ name: 'AuthTabs' as never }],
      });
      debugLog('ログアウト処理が完了しました');
    } catch (error) {
      console.error('[HomeScreen] ログアウト処理中にエラー:', error);
    } finally {
      setIsProcessingLogout(false);
    }
  }, [isProcessingLogout, navigation]);

  /**
   * 現在のURLがログイン成功画面かどうか判定する
   */
  const checkIfLoggedInPage = (url: string): boolean => {
    return url.includes(LOGIN_SUCCESS_PATH);
  };

  /**
   * フォーム送信が検出された場合の処理
   * WebViewからのメッセージでフォーム送信を把握
   */
  const handleFormSubmitDetected = () => {
    debugLog('WebView内でフォーム送信が検知されました');
    setIsFormSubmitted(true);
  };

  /**
   * ログイン試行回数をカウントアップ
   * 最大回数に達した場合は自動ログインオフ、設定画面誘導
   */
  const incrementLoginAttempt = useCallback(() => {
    setIsFormSubmitted(false);
    setLoginAttempts(prev => {
      const newCount = prev + 1;
      debugLog(`ログイン試行回数: ${newCount}/${MAX_LOGIN_ATTEMPTS}`);
      if (newCount >= MAX_LOGIN_ATTEMPTS) {
        handleMaxAttemptsReached();
      }
      return newCount;
    });
  }, [handleMaxAttemptsReached]);

  /**
   * 自動ログイン用のJSコードを生成する
   * ログイン情報が有効で未ログイン、かつ試行回数上限未満の場合のみ注入
   */
  const generateAutoLoginJS = (): string => {
    if (!loginData?.autoLoginEnabled || isLoggedIn || loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      debugLog('自動ログインJSは注入しません(条件未達)');
      return '';
    }

    debugLog('自動ログインJSを準備します');
    const userID = loginData.userID || '';
    const password = loginData.password || '';

    return `
      (function() {
        console.log('Injected JS: 自動ログイン試行開始');
        
        function waitForElement(selector, callback, maxTries = ${ELEMENT_WAIT_MAX_TRIES}) {
          let tries = 0;
          function check() {
            const element = document.querySelector(selector);
            if (element && document.readyState === 'complete') {
              callback();
            } else {
              tries++;
              if (tries < maxTries) {
                setTimeout(check, ${ELEMENT_WAIT_INTERVAL_MS});
              } else {
                console.log('Injected JS: 指定要素が見つかりませんでした');
              }
            }
          }
          check();
        }

        function fillFormAndSubmit() {
          console.log('Injected JS: フォームにID/パスワードを入力します');
          const userInput = document.getElementById('${FORM_USER_ID_SELECTOR.replace('#', '')}');
          const passwordInput = document.getElementById('${FORM_PASSWORD_ID_SELECTOR.replace('#', '')}');

          if (!userInput || !passwordInput) {
            console.log('Injected JS: フォーム要素が見つかりません');
            return;
          }

          userInput.value = '${userID}';
          passwordInput.value = '${password}';
          setTimeout(() => {
            console.log('Injected JS: フォームを送信します');
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'formSubmitted' }));
            __doPostBack('ctl00$cplPageContent$LinkButton1', '');
          }, ${FORM_SUBMIT_DELAY_MS});
        }

        waitForElement('${FORM_USER_ID_SELECTOR}', fillFormAndSubmit);
      })();
    `;
  };

  /**
   * WebViewにJSを注入する
   */
  const injectJS = useCallback(() => {
    const jsCode = generateAutoLoginJS();
    if (jsCode && webViewRef.current) {
      debugLog('WebViewへ自動ログインJSを注入します');
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [generateAutoLoginJS]);

  /**
   * ページ遷移時のコールバック
   * - ログイン中、初期URLへ戻ったらログアウトと判断
   * - 未ログイン時、ログイン成功画面パスに入ったらログイン成功と判断
   * - ログイン失敗時には試行回数カウント
   */
  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    debugLog('ページ遷移:', navState.url);

    // ログイン中に初期URLへ戻った場合はログアウト扱い
    if (isLoggedIn && navState.url === INITIAL_URL) {
      debugLog('ログイン中に初期URLへ戻ったためログアウトします');
      handleLogout();
      return;
    }

    // 未ログインでログイン成功URLへ遷移したらログイン成功と判断
    if (!isLoggedIn && checkIfLoggedInPage(navState.url)) {
      debugLog('ログイン成功を検知しました');
      setIsLoggedIn(true);
      setLoginAttempts(0);
      if (loginData) {
        onLogin?.(loginData);
      }
      return;
    }

    // フォーム送信後にdefault.aspxに留まる場合はログイン失敗と判断
    if (!isLoggedIn && isFormSubmitted && navState.url.includes(DEFAULT_PAGE_PATH)) {
      debugLog('ログイン失敗と判断し、試行回数を増やします');
      incrementLoginAttempt();
    }
  };

  /**
   * ページ読み込み前に実行されるコールバック
   * - ここでclica以外のドメインの場合は外部ブラウザで開く
   * - http→httpsリダイレクトは不要（clica側で処理済）
   * - ユーザー操作によるリンククリック時にURL更新を行う
   */
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    debugLog('リクエストURL:', request.url);

    // clica.jp ドメイン以外は外部ブラウザで開く
    // startsWithで判定。clicaドメインでない場合は即ブラウザへ
    if (!request.url.startsWith(CLICA_BASE_URL)) {
      debugLog('clica以外のドメインが要求されたため、外部ブラウザで開きます:', request.url);
      Linking.openURL(request.url);
      return false;
    }

    // ユーザーがWebView内リンクをクリックした場合
    // 別URLへ遷移する際にはcurrentUrlを更新して再描画
    if (request.navigationType === 'click' && request.url !== currentUrl) {
      debugLog('ユーザークリックによるURL変更を検知:', request.url);
      setCurrentUrl(request.url);
      forceRefreshWebView();
      return false;
    }

    return true;
  };

  /**
   * ページロード完了時にJS注入を行う
   */
  const handleLoadEnd = () => {
    debugLog('WebViewのロードが完了しました。必要ならJSを注入します');
    setTimeout(injectJS, JS_INJECTION_DELAY_MS);
  };

  // ==== useEffect群 ====

  /**
   * 画面フォーカス時の処理
   * - フォーカス時かつ未ログイン・ログアウト処理中でない場合、ログイン情報再取得 & WebViewリロード
   */
  useEffect(() => {
    debugLog(`画面フォーカス変更: ${isFocused}`);
    if (isFocused && !isLoggedIn && !isProcessingLogout) {
      (async () => {
        await fetchLoginData();
        setIsLoading(false);
        forceRefreshWebView();
      })();
    }
  }, [isFocused, isLoggedIn, isProcessingLogout, fetchLoginData, forceRefreshWebView]);

  /**
   * ログイン状態変更時のタブバー表示・非表示制御
   */
  useEffect(() => {
    debugLog('isLoggedIn変更:', isLoggedIn);
    navigation.setOptions({ tabBarStyle: { display: isLoggedIn ? 'none' : 'flex' } });
  }, [isLoggedIn, navigation]);

  /**
   * 初回ロード時にWebViewリフレッシュ
   */
  useEffect(() => {
    if (isInitialLoad) {
      debugLog('初回ロード検知、WebViewを強制リフレッシュします');
      forceRefreshWebView();
      setIsInitialLoad(false);
    }
  }, [isInitialLoad, forceRefreshWebView]);

  // ==== レンダリング ====
  
  // ローディング中はスピナーを表示
  if (isLoading) {
    debugLog('ローディング中画面を表示します');
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 10, color: '#333' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  // メインのWebView表示
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <WebView
        ref={webViewRef}
        key={webViewKey}
        source={{ uri: currentUrl, headers: { 'Cache-Control': 'no-cache' } }}
        incognito={false}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        domStorageEnabled={true}
        pullToRefreshEnabled={true}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={(event) => {
          // WebViewからのメッセージを処理
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'formSubmitted') {
              handleFormSubmitDetected();
            }
          } catch {
            const data = event.nativeEvent.data;
            if (data === 'logout') {
              debugLog('WebViewから"logout"メッセージ受信');
              handleLogout();
            } else {
              debugLog('WebViewからのメッセージ:', data);
            }
          }
        }}
        onLoadStart={() => debugLog('WebView読み込み開始')}
        onLoadEnd={handleLoadEnd}
        onError={(syntheticEvent) => {
          console.error('[HomeScreen] WebViewエラー:', syntheticEvent.nativeEvent);
        }}
        javaScriptEnabled={true}
        style={{ flex: 1 }}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;

// screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TouchableOpacity,
  Text,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Switch,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import { LoginData } from '../types';
import Ionicons from 'react-native-vector-icons/Ionicons';

const log = (...args: any[]) => console.log('[SettingsScreen]', ...args);

interface SettingsScreenProps {
  onSettingsSubmit?: (data: LoginData) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSettingsSubmit }) => {
  log('Render start');

  const [userID, setUserID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState<boolean>(false);
  const [isDataSaved, setIsDataSaved] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    log('Fetching stored login data...');
    (async () => {
      try {
        const storedData = await AsyncStorage.getItem('loginData');
        if (storedData) {
          const parsedData: LoginData = JSON.parse(storedData);
          setUserID(parsedData.userID);
          setPassword(parsedData.password);
          setAutoLoginEnabled(parsedData.autoLoginEnabled);
          setIsDataSaved(true);
          log('Loaded login data:', parsedData);
        } else {
          log('No stored login data');
        }
      } catch (error) {
        console.error('[SettingsScreen] Error loading settings:', error);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!userID || !password || !isDataSaved) {
      if (autoLoginEnabled) {
        log('Disabling auto-login because of incomplete data');
      }
      setAutoLoginEnabled(false);
    }
  }, [userID, password, isDataSaved, autoLoginEnabled]);

  const handleAutoLoginToggle = async (newValue: boolean) => {
    log('Auto-login toggle:', newValue);
    setAutoLoginEnabled(newValue);

    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const currentData: LoginData = JSON.parse(storedData);
        const newLoginData: LoginData = {
          ...currentData,
          autoLoginEnabled: newValue,
        };
        await AsyncStorage.setItem('loginData', JSON.stringify(newLoginData));
        log('Auto-login updated in storage:', newLoginData);
      }
    } catch (error) {
      console.error('[SettingsScreen] Error saving auto-login state:', error);
    }
  };

  const saveLoginDataAndLogin = async () => {
    log('Save login data request');
    if (!userID || !password) {
      Alert.alert('入力エラー', 'IDとパスワードを入力してください');
      return;
    }

    const loginData: LoginData = { userID, password, autoLoginEnabled };

    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(loginData));
      setIsDataSaved(true);
      log('Login data saved:', loginData);
      onSettingsSubmit?.(loginData);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[SettingsScreen] Error saving login data:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const handleClear = () => {
    log('Clear login data request');
    Alert.alert('確認', 'ログイン情報を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            setUserID('');
            setPassword('');
            setAutoLoginEnabled(false);
            setIsDataSaved(false);
            await AsyncStorage.removeItem('loginData');
            log('Login data cleared');
          } catch (error) {
            console.error('[SettingsScreen] Error clearing login data:', error);
            Alert.alert('エラー', 'クリアに失敗しました');
          }
        },
      },
    ]);
  };

  const handleWebViewNavigationStateChange = (newNavState: any) => {
    log('WebView navigation change:', newNavState.url);
    if (newNavState.url === 'https://clica.jp/app/') {
      setWebviewUrl(null);
    }
  };

  if (isLoadingData) {
    log('Loading indicator displayed (fetching data)');
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, color: '#333' }}>読み込み中</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (webviewUrl) {
    log('Displaying WebView for:', webviewUrl);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webviewContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              log('Closing embedded WebView');
              setWebviewUrl(null);
            }}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <WebView
            source={{ uri: webviewUrl }}
            style={styles.webview}
            onNavigationStateChange={handleWebViewNavigationStateChange}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canEnableAutoLogin = !!userID && !!password && isDataSaved;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.headerTitle}>設定</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.mainSection}>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Clica ログイン設定</Text>
                  <TextInput
                    placeholder="ID"
                    value={userID}
                    onChangeText={text => {
                      log('userID changed:', text);
                      setUserID(text);
                    }}
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                  <View style={styles.passwordContainer}>
                    <TextInput
                      placeholder="パスワード"
                      value={password}
                      onChangeText={text => {
                        log('password changed:', text ? '***' : '');
                        setPassword(text);
                      }}
                      secureTextEntry={!showPassword}
                      style={[styles.input, styles.passwordInput]}
                      placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => {
                        log('Toggle password visibility');
                        setShowPassword(!showPassword);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.saveButton} onPress={saveLoginDataAndLogin}>
                      <Text style={styles.saveButtonText}>保存</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                      <Text style={styles.clearButtonText}>クリア</Text>
                    </TouchableOpacity>
                  </View>

                  {saveSuccess && (
                    <Text style={styles.successMessage}>
                      保存しました
                    </Text>
                  )}
                </View>

                <View style={styles.autoLoginSection}>
                  <View style={styles.switchContainer}>
                    <View>
                      <Text style={styles.switchLabel}>自動ログイン</Text>
                      {!canEnableAutoLogin && (
                        <Text style={styles.switchDescription}>
                          IDとパスワードを保存後に設定できます
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={autoLoginEnabled}
                      onValueChange={handleAutoLoginToggle}
                      disabled={!canEnableAutoLogin}
                      ios_backgroundColor="#E5E5E5"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.linkSection}>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    log('Open signup WebView');
                    setWebviewUrl('https://clica.jp/app/signup/user_entry.aspx');
                  }}
                >
                  <Text style={styles.linkText}>新規登録</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => {
                    log('Open forgot password WebView');
                    setWebviewUrl('https://clica.jp/app/remind/_sub/remind.aspx');
                  }}
                >
                  <Text style={styles.linkText}>パスワードを忘れた場合</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  webviewContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: { flex: 1 },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyboardAvoidingView: { flex: 1 },
  scrollContainer: { flexGrow: 1 },
  formContainer: { flex: 1, padding: 24, paddingBottom: 100 },
  mainSection: { flex: 1 },
  section: { marginBottom: 24 },
  autoLoginSection: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  linkSection: {
    marginTop: 'auto',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, color: '#333' },
  input: {
    height: 48,
    borderWidth: 1,
    padding: 12,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 48, marginBottom: 0 },
  eyeButton: { position: 'absolute', right: 12, top: 14, padding: 4 },
  buttonContainer: { flexDirection: 'row', marginTop: 20, gap: 12 },
  saveButton: {
    flex: 2,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#E5E5E5',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  clearButtonText: { color: '#666', fontSize: 15, fontWeight: '500' },
  successMessage: { color: '#666', textAlign: 'center', marginTop: 12, fontSize: 14 },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 16, color: '#333', fontWeight: '500' },
  switchDescription: { fontSize: 12, color: '#666', marginTop: 4 },
  linkButton: { paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  linkText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
});

export default SettingsScreen;

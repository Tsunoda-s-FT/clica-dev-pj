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
  ActivityIndicator,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LoginData } from '../types';

// 後で変更しやすいよう定数化
const SIGNUP_URL = 'https://clica.jp/app/signup/user_entry.aspx';
const FORGOT_PASSWORD_URL = 'https://clica.jp/app/remind/_sub/remind.aspx';

const SettingsScreen: React.FC<{ onSettingsSubmit?: (data: LoginData) => void }> = ({ onSettingsSubmit }) => {
  // ユーザー入力用ステート
  const [userID, setUserID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [autoLoginEnabled, setAutoLoginEnabled] = useState<boolean>(false);

  // UI用ステート
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 初回表示時にAsyncStorageから設定を読み込む
  useEffect(() => {
    (async () => {
      try {
        const storedData = await AsyncStorage.getItem('loginData');
        if (storedData) {
          const parsed: LoginData = JSON.parse(storedData);
          setUserID(parsed.userID);
          setPassword(parsed.password);
          setAutoLoginEnabled(parsed.autoLoginEnabled);
        }
      } catch (error) {
        console.error('[SettingsScreen] Error loading settings:', error);
      } finally {
        setIsLoadingData(false);
      }
    })();
  }, []);

  /**
   * ログインデータ保存処理
   */
  const saveLoginData = async () => {
    if (!userID || !password) {
      Alert.alert('入力エラー', 'IDとパスワードを入力してください');
      return;
    }

    const newData: LoginData = { userID, password, autoLoginEnabled };
    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(newData));
      onSettingsSubmit?.(newData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('[SettingsScreen] Error saving login data:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  /**
   * ログインデータクリア処理
   */
  const clearLoginData = async () => {
    Alert.alert('確認', 'ログイン情報を削除しますか？', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('loginData');
            setUserID('');
            setPassword('');
            setAutoLoginEnabled(false);
          } catch (error) {
            console.error('[SettingsScreen] Error clearing login data:', error);
            Alert.alert('エラー', 'クリアに失敗しました');
          }
        },
      },
    ]);
  };

  /**
   * 自動ログイントグル処理
   */
  const toggleAutoLogin = async (newVal: boolean) => {
    setAutoLoginEnabled(newVal);
    // 既に保存済みのデータがある場合は同時に更新
    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const currentData: LoginData = JSON.parse(storedData);
        const updatedData = { ...currentData, autoLoginEnabled: newVal };
        await AsyncStorage.setItem('loginData', JSON.stringify(updatedData));
      }
    } catch (error) {
      console.error('[SettingsScreen] Error saving auto-login state:', error);
    }
  };

  // データ読み込み中はローディング表示
  if (isLoadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>読み込み中</Text>
        </View>
      </SafeAreaView>
    );
  }

  // IDとパスワードが両方あるかつ保存済みの場合のみ自動ログイン有効化可能
  const canEnableAutoLogin = !!userID && !!password;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Text style={styles.headerTitle}>設定</Text>
            </View>

            {/* ログイン設定フォーム */}
            <View style={styles.formContainer}>
              <Text style={styles.sectionTitle}>Clica ログイン設定</Text>

              {/* ユーザーID入力欄 */}
              <TextInput
                placeholder="ID"
                value={userID}
                onChangeText={setUserID}
                style={styles.input}
                placeholderTextColor="#999"
              />

              {/* パスワード入力欄 */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="パスワード"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  style={[styles.input, styles.passwordInput]}
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>

              {/* 保存/クリアボタン */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.saveButton} onPress={saveLoginData}>
                  <Text style={styles.saveButtonText}>保存</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.clearButton} onPress={clearLoginData}>
                  <Text style={styles.clearButtonText}>クリア</Text>
                </TouchableOpacity>
              </View>

              {/* 保存成功メッセージ */}
              {saveSuccess && <Text style={styles.successMessage}>保存しました</Text>}

              {/* 自動ログイントグル */}
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
                    onValueChange={toggleAutoLogin}
                    disabled={!canEnableAutoLogin}
                    ios_backgroundColor="#E5E5E5"
                  />
                </View>
              </View>

              {/* ヘルプリンク */}
              <View style={styles.linkSection}>
                <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(SIGNUP_URL)}>
                  <Text style={styles.linkText}>新規登録</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkButton} onPress={() => Linking.openURL(FORGOT_PASSWORD_URL)}>
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

// スタイルは元のデザインを踏襲しつつ簡略化
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#333' },
  keyboardAvoid: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 24 },
  header: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 24,
    alignItems: 'center'
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  formContainer: { flex: 1 },
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
  autoLoginSection: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  switchContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontSize: 16, color: '#333', fontWeight: '500' },
  switchDescription: { fontSize: 12, color: '#666', marginTop: 4 },
  linkSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  linkButton: { paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  linkText: { color: '#007AFF', fontSize: 16, fontWeight: '500' },
});

export default SettingsScreen;

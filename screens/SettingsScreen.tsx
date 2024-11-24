import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData } from '../types';
import LoginSettingsForm from '../components/LoginSettingsForm';
import Icon from 'react-native-vector-icons/Ionicons';

interface SettingsScreenProps {
  onSettingsSubmit?: (data: LoginData) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSettingsSubmit }) => {
  const [userID, setUserID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState<boolean>(false);

  useEffect(() => {
    const fetchLoginData = async () => {
      try {
        const storedData = await AsyncStorage.getItem('loginData');
        if (storedData) {
          const parsedData: LoginData = JSON.parse(storedData);
          setUserID(parsedData.userID);
          setPassword(parsedData.password);
          setAutoLoginEnabled(parsedData.autoLoginEnabled);
          console.log('Settings loaded:', parsedData);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchLoginData();
  }, []);

  const handleAutoLoginToggle = async (newValue: boolean) => {
    setAutoLoginEnabled(newValue);

    try {
      const storedData = await AsyncStorage.getItem('loginData');
      if (storedData) {
        const currentData = JSON.parse(storedData);
        const newLoginData: LoginData = {
          ...currentData,
          autoLoginEnabled: newValue,
        };
        await AsyncStorage.setItem('loginData', JSON.stringify(newLoginData));
        console.log('Auto-login updated:', newLoginData);
      }
    } catch (error) {
      console.error('Error saving auto-login state:', error);
    }
  };

  const saveLoginDataAndLogin = async () => {
    if (!userID || !password) {
      Alert.alert('入力エラー', 'IDとパスワードを入力してください');
      return;
    }

    const loginData: LoginData = {
      userID,
      password,
      autoLoginEnabled,
    };

    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(loginData));
      console.log('Login data saved:', loginData);
      
      if (onSettingsSubmit) {
        onSettingsSubmit(loginData);
      }
    } catch (error) {
      console.error('Error saving login data:', error);
      Alert.alert('エラー', '保存に失敗しました');
    }
  };

  const handleClear = async () => {
    try {
      setUserID('');
      setPassword('');
      setAutoLoginEnabled(false);
      await AsyncStorage.removeItem('loginData');
      console.log('Login data cleared');
    } catch (error) {
      console.error('Error clearing login data:', error);
      Alert.alert('エラー', 'クリアに失敗しました');
    }
  };

  const handleWebViewNavigationStateChange = (newNavState: any) => {
    const { url } = newNavState;
    if (url === 'https://clica.jp/app/') {
      setWebviewUrl(null);  // WebViewを閉じる
    }
  };

  if (isLoadingData) {
    return <LoadingIndicator message="読み込み中" />;
  }

  if (webviewUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webviewContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setWebviewUrl(null)}
          >
            <Icon 
              name="close" 
              size={24} 
              color="#333"
            />
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>設定</Text>
      </View>
      <LoginSettingsForm
        userID={userID}
        password={password}
        autoLoginEnabled={autoLoginEnabled}
        onUserIDChange={setUserID}
        onPasswordChange={setPassword}
        onAutoLoginToggle={handleAutoLoginToggle}
        onSave={saveLoginDataAndLogin}
        onClear={handleClear}
        onSignupPress={() => setWebviewUrl('https://clica.jp/app/signup/user_entry.aspx')}
        onForgotPasswordPress={() => setWebviewUrl('https://clica.jp/app/remind/_sub/remind.aspx')}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  webview: {
    flex: 1,
  },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default SettingsScreen;
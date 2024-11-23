import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Alert,
  TouchableOpacity,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { WebView } from 'react-native-webview';
import LoadingIndicator from '../components/LoadingIndicator';
import { LoginData } from '../types';

interface SettingsScreenProps {
  onSettingsSubmit?: (data: LoginData) => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onSettingsSubmit }) => {
  const [userID, setUserID] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [webviewUrl, setWebviewUrl] = useState<string | null>(null);
  const [autoLoginEnabled, setAutoLoginEnabled] = useState<boolean>(false);
  const navigation = useNavigation();

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
      const newLoginData: LoginData = storedData
        ? { ...JSON.parse(storedData), autoLoginEnabled: newValue }
        : { userID, password, autoLoginEnabled: newValue };

      await AsyncStorage.setItem('loginData', JSON.stringify(newLoginData));
      console.log('Auto-login updated:', newLoginData);
    } catch (error) {
      console.error('Error saving auto-login state:', error);
    }
  };

  const saveLoginDataAndLogin = async () => {
    if (!userID || !password) {
      Alert.alert('Error', 'Please fill out both fields');
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
      
      Alert.alert('Success', 'Login data saved.', [
        {
          text: 'OK',
          onPress: () => {
            if (onSettingsSubmit) {
              onSettingsSubmit(loginData);
            }
            setTimeout(() => {
              navigation.navigate('Login' as never);
            }, 500);
          },
        },
      ]);
    } catch (error) {
      console.error('Error saving login data:', error);
      Alert.alert('Error', 'Failed to save login data');
    }
  };

  if (isLoadingData) {
    return <LoadingIndicator message="Loading..." />;
  }

  if (webviewUrl) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <WebView source={{ uri: webviewUrl }} style={{ flex: 1 }} />
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setWebviewUrl(null)}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <View style={{ flex: 1 }}>
        <View style={styles.formContainer}>
          <TextInput
            placeholder="ログインIDを入力"
            value={userID}
            onChangeText={setUserID}
            style={styles.input}
          />
          <TextInput
            placeholder="パスワードを入力"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          <View style={styles.switchContainer}>
            <Text>自動ログイン</Text>
            <Switch
              value={autoLoginEnabled}
              onValueChange={handleAutoLoginToggle}
            />
          </View>

          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={saveLoginDataAndLogin}
          >
            <Text style={styles.saveButtonText}>保存</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setWebviewUrl('https://clica.jp/app/signup/user_entry.aspx')}
          >
            <Text style={styles.linkText}>受講者アカウント登録</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => setWebviewUrl('https://clica.jp/app/remind/_sub/remind.aspx')}
          >
            <Text style={styles.linkText}>パスワードを忘れた方</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    padding: 20,
    flexGrow: 1,
  },
  input: {
    marginBottom: 10,
    borderWidth: 1,
    padding: 10,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  linkButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
  },
  backButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SettingsScreen;
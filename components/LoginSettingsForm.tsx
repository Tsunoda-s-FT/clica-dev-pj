import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Switch,
  Alert,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

interface LoginSettingsFormProps {
  userID: string;
  password: string;
  autoLoginEnabled: boolean;
  isDataSaved: boolean;
  onUserIDChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAutoLoginToggle: (value: boolean) => void;
  onSave: () => void;
  onClear: () => void;
  onSignupPress: () => void;
  onForgotPasswordPress: () => void;
}

const LoginSettingsForm: React.FC<LoginSettingsFormProps> = ({
  userID,
  password,
  autoLoginEnabled,
  isDataSaved,
  onUserIDChange,
  onPasswordChange,
  onAutoLoginToggle,
  onSave,
  onClear,
  onSignupPress,
  onForgotPasswordPress,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [canEnableAutoLogin, setCanEnableAutoLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setCanEnableAutoLogin(Boolean(userID && password && isDataSaved));
    if (!userID || !password || !isDataSaved) {
      onAutoLoginToggle(false);
    }
  }, [userID, password, isDataSaved]);

  const handleSave = () => {
    if (!userID || !password) {
      Alert.alert('入力エラー', 'ログインIDとパスワードを入力してください');
      return;
    }
    Keyboard.dismiss();
    onSave();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  const handleClear = () => {
    Alert.alert(
      '確認',
      'ログイン情報を削除しますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: onClear,
        },
      ]
    );
  };

  return (
    <View style={styles.formContainer}>
      <View style={styles.mainSection}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clica ログイン設定</Text>
          <TextInput
            placeholder="ID"
            value={userID}
            onChangeText={onUserIDChange}
            style={styles.input}
            placeholderTextColor="#999"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="パスワード"
              value={password}
              onChangeText={onPasswordChange}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor="#999"
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon 
                name={showPassword ? 'eye-outline' : 'eye-off-outline'} 
                size={20} 
                color="#999"
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.clearButton} 
              onPress={handleClear}
            >
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
              onValueChange={onAutoLoginToggle}
              disabled={!canEnableAutoLogin}
              ios_backgroundColor="#E5E5E5"
            />
          </View>
        </View>
      </View>

      <View style={styles.linkSection}>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={onSignupPress}
        >
          <Text style={styles.linkText}>新規登録</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkButton}
          onPress={onForgotPasswordPress}
        >
          <Text style={styles.linkText}>パスワードを忘れた場合</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
    padding: 24,
    paddingBottom: 100,
  },
  mainSection: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
    marginBottom: 0,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
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
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  successMessage: {
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  switchDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  linkButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default LoginSettingsForm;
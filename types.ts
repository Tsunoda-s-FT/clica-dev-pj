import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

// Define AuthTabsParamList
export type AuthTabsParamList = {
  Home: undefined;
  Settings: undefined;
};

// Define LoginData type
export interface LoginData {
  userID: string;
  password: string;
  autoLoginEnabled: boolean;
}

// Define AuthTabs Props
export interface AuthTabsProps {
  onLogin: (loginData: LoginData) => void;
}

// Define MainStack Props
export interface MainStackProps {
  onLogin: (loginData: LoginData) => void;
  isLoggedIn: boolean;
}

// Define LoginScreen Props
export interface LoginScreenProps extends BottomTabScreenProps<AuthTabsParamList, 'Home'> {
  onLogin?: (loginData: LoginData) => void;
}

// types.ts
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type AuthTabsParamList = {
  Home: undefined;
  Settings: undefined;
};

export interface LoginData {
  userID: string;
  password: string;
  autoLoginEnabled: boolean;
}

export interface AuthTabsProps {
  onLogin: (loginData: LoginData) => void;
}

export interface MainStackProps {
  onLogin: (loginData: LoginData) => void;
  isLoggedIn: boolean;
}

export interface HomeScreenProps extends BottomTabScreenProps<AuthTabsParamList, 'Home'> {
  onLogin?: (loginData: LoginData) => void;
}

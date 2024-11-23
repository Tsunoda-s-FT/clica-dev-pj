import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export interface LoginData {
    userID: string;
    password: string;
    autoLoginEnabled: boolean;
  }
  
  export interface NavigationProps {
    navigation: any;
    route: any;
  }
  
  export interface AuthTabsProps {
    onLogin: (loginData: LoginData) => void;
  }
  
  export interface MainStackProps {
    onLogin: (loginData: LoginData) => void;
    isLoggedIn: boolean;
  }
  
  export interface LoginScreenProps extends BottomTabScreenProps<any, 'Login'> {
    onLogin?: (loginData: LoginData) => void;
  }
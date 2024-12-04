# アプリケーションビルド手順書

## 前提条件

- **Expoアカウント**: Expoでのビルドにはアカウントが必要です。未作成の場合は[Expo公式サイト](https://expo.dev/)で登録してください。
- **EAS CLIのインストール**: Expoのアプリビルドサービス（EAS）を使用します。

  ```bash
  npm install -g eas-cli
  ```

- **Apple Developerアカウント**（iOSビルドの場合）
- **Google Play Developerアカウント**（Androidビルドの場合）

## 1. Expoプロジェクトの設定

### 1.1 `app.json` の確認

`app.json` ファイルには、アプリの基本情報が含まれています。必要に応じて以下の情報を確認・修正してください。

```json:app.json
{
  "expo": {
    "name": "Clica-dev-pj",
    "slug": "Clica-dev-pj",
    "version": "1.0.2",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "jp.co.digital-knowledge.clica-dev",
      "buildNumber": "1.0.2"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "jp.co.digital_knowledge.clica_dev"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "extra": {
      "eas": {
        "projectId": "21efb447-2d97-4624-b18e-9c9958d3ce79"
      }
    },
    "owner": "tsunoda_s",
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/21efb447-2d97-4624-b18e-9c9958d3ce79"
    }
  }
}
```

- **`name`**: アプリ名
- **`slug`**: プロジェクトのslug（URLやコマンドラインで使用）
- **`version`**: アプリのバージョン
- **`bundleIdentifier`**（iOS）: 一意のバンドルID
- **`package`**（Android）: 一意のパッケージ名

### 1.2 `package.json` の確認

依存関係とスクリプトの確認を行います。

```json:package.json
{
  "name": "clica-dev-pj",
  "version": "1.0.0",
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@expo/metro-runtime": "^4.0.0",
    "@react-native-async-storage/async-storage": "^1.23.1",
    "@react-navigation/bottom-tabs": "^7.0.7",
    "@react-navigation/native": "^7.0.4",
    "@react-navigation/stack": "^7.0.6",
    "expo": "~52.0.11",
    "expo-dev-client": "~5.0.4",
    "expo-status-bar": "~2.0.0",
    "expo-updates": "~0.26.9",
    "react": "18.3.1",
    "react-native": "0.76.3",
    "react-native-gesture-handler": "~2.20.2",
    "react-native-safe-area-context": "^4.14.0",
    "react-native-screens": "~4.1.0",
    "react-native-vector-icons": "^10.2.0",
    "react-native-webview": "^13.12.2"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@types/react": "~18.3.12",
    "@types/react-native": "^0.72.8",
    "@types/react-native-vector-icons": "^6.4.18",
    "babel-plugin-module-resolver": "^5.0.2",
    "typescript": "^5.7.2"
  },
  "private": true
}
```

必要に応じて依存関係のバージョンを確認してください。

## 2. EAS（Expo Application Services）の設定

### 2.1 EASプロジェクトの初期化

EASビルドを使用するためにプロジェクトを初期化します。

```bash
eas build:configure
```

- `eas.json` ファイルが生成されます。

### 2.2 `eas.json` の確認

ビルドプロファイルを設定します。

```json:eas.json
{
  "cli": {
    "version": ">= 13.2.3",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- **`development`**: 開発用ビルド設定
- **`preview`**: 内部テスト用ビルド設定
- **`production`**: 本番リリース用ビルド設定

## 3. アプリのビルド

### 3.1 iOSアプリのビルド

#### 3.1.1 Apple Developerアカウントの設定

初回ビルド時、Appleアカウント情報を求められます。

#### 3.1.2 ビルドコマンドの実行

開発ビルド（development プロファイル）を実行する場合：

```bash
eas build --platform ios --profile development
```

プロダクションビルド（production プロファイル）を実行する場合：

```bash
eas build --platform ios --profile production
```

#### 3.1.3 ビルドの確認

ビルドが開始されると、ビルド状況が表示されます。ビルド完了後、ダウンロード可能なIPAファイルのURLが提供されます。

### 3.2 Androidアプリのビルド

#### 3.2.1 Google Play Developerアカウントの設定

ストアに公開する場合、Google Playアカウントが必要です。

#### 3.2.2 ビルドコマンドの実行

開発ビルド（development プロファイル）を実行する場合：

```bash
eas build --platform android --profile development
```

プロダクションビルド（production プロファイル）を実行する場合：

```bash
eas build --platform android --profile production
```

#### 3.2.3 ビルドの確認

ビルド完了後、APKまたはAABファイルのダウンロードURLが提供されます。

## 4. ビルド成果物の取得

EASビルドの完了後、Expoのダッシュボードまたはビルドログに記載されたURLからビルド成果物をダウンロードできます。

- iOSの場合：IPAファイル
- Androidの場合：APKまたはAABファイル

## 5. アプリの配布

### 5.1 iOSアプリの配布

- **App Store Connect** を使用してアプリをアップロードし、審査後にApp Storeで公開します。
- **TestFlight** を使用して内部テストを行うことも可能です。

### 5.2 Androidアプリの配布

- **Google Play Console** を使用してアプリをアップロードし、審査後にGoogle Playストアで公開します。
- 内部テストやクローズドテスト、オープンテストも設定できます。

## 6. トラブルシューティング

- **ビルドエラーが発生した場合**：ビルドログを確認し、エラーメッセージに従って問題を解決します。
- **依存関係の問題**：`node_modules` を削除し、再度 `npm install` を実行します。

  ```bash
  rm -rf node_modules
  npm install
  ```

- **キャッシュのクリア**：

  ```bash
  expo start -c
  ```

## 7. 注意事項

- **バージョン管理**：ビルドごとにバージョン番号やビルド番号を適切に更新してください。
- **証明書の管理**：iOSおよびAndroidの証明書やプロビジョニングプロファイルを適切に管理してください。

## 8. 補足情報

- **Expo公式ドキュメント**：[https://docs.expo.dev/](https://docs.expo.dev/)
- **EAS Buildドキュメント**：[https://docs.expo.dev/build/introduction/](https://docs.expo.dev/build/introduction/)


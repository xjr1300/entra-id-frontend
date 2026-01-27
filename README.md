# Entra ID SSO フロントエンドサンプル

本ドキュメントでは、Web アプリケーションフレームワークとして Vite + React を使用し、Microsoft Entra ID による SSO を実装する方法を示します。
Entra ID との連携には、MSAL（Microsoft Authentication Library）for React を使用します。

すべてのコードは、<https://github.com/xjr1300/entra-id-frontend> で確認できます。

最終的には何らかのバックエンド API サービスと連携することを想定していますが、本サンプルではフロントエンド側の実装にフォーカスします。
なお、バックエンドではフロントエンドから `Authorization` ヘッダーに含まれる Bearer トークン（アクセストークン）を検証し、適切にレスポンスを返します。
バックエンド側で認証機能の提供や、アクセストークンの管理・生成を行うことは想定していません。

> OpenID Connect（OIDC）や OAuth 2.0 の文脈では、Entra ID は ID プロバイダー（IdP）として機能し、アクセストークンの発行を担当します。
> バックエンドは、アクセストークンを検証し、保護されたリソースを提供するリソースサーバーとして機能します。

## Entra ID の設定

Entra ID の設定は、Microsoft Entra 管理センターで行います。

### アプリケーションの登録

Microsoft Entra 管理センターのサイドバーから `[アプリの登録]` を選択し、`[新規登録]` を選択します。

表示された画面で、以下の情報を入力して `[登録]` を選択します。

- 名前: アプリケーションのユーザー向け表示名（後から変更可能）
- サポートされているアカウントの種類: `この組織ディレクトリのみに含まれるアカウント`
- リダイレクト URI:（後で設定するためブランクのままにしておきます）

### 登録したアプリケーションの設定

#### クライアント ID とテナント ID のメモ

登録が完了すると、アプリケーションの概要ページが表示されます。
この概要ページで、以下の情報をメモしておきます。

- アプリケーション（クライアント）ID
- ディレクトリ（テナント）ID

これらの情報は、後で SPA フロントエンドアプリケーションの設定で使用します。

#### リダイレクトURIの設定

リダイレクト URI とは、認証が成功した後にユーザーがリダイレクトされる URI のことです。

アプリケーションの管理ページのサイドバーで `[Authentication]` を選択します。
表示されたページで `[プラットフォームの追加]` を選択し、`[シングルページ アプリケーション (SPA)]` を選択します。

`[リダイレクト URI]` に以下の URI を入力し、`[構成]` を選択します。

- `http://localhost:5173`

> 本サンプルは Entra ID SSO の実装例であるため、ローカルホストの URI を使用しています。
> 本番環境では、適切なドメイン名を設定してください。
> また、本実装例では有効なリダイレクト URI は `http://localhost:5173` のみです。

#### API のアクセス許可の設定

アプリケーションの管理ページのサイドバーで `[API のアクセス許可]` を選択します。
表示されたページで `[アクセス許可の追加]` を選択します。

`Microsoft API` タブを選択し、`Microsoft Graph` を選択します。
`アプリケーションに必要なアクセス許可の種類` で `[委任されたアクセス許可]` を選択します。

`アクセス許可を選択する` に `User.Read` を入力し、表示された候補から `User > User.Read` を選択します。
最後に `[アクセス許可の追加]` を選択して設定を保存します。

> `User.Read` は、認証済みユーザー自身の基本的なプロファイル情報を読み取るためのアクセス許可です。
> 一部の属性は、`$select` クエリパラメーターを使用して明示的に指定しないと取得できない場合があります。

## SPA フロントエンドアプリケーションの実装

### プロジェクトの作成と依存パッケージのインストール

```sh
npm create vite@latest
cd entra-id-frontend
npm install @azure/msal-browser @azure/msal-react
```

### `.env`ファイルの作成

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定します。

```env
VITE_CLIENT_ID=<上記でメモしたクライアントID>
VITE_TENANT_ID=<上記でメモしたテナントID>
VITE_LOGIN_REDIRECT_URI=<上記で設定したリダイレクトURI>
VITE_LOGOUT_REDIRECT_URI=<上記で設定したリダイレクトURI>

# Microsoft Graph APIのエンドポイント
VITE_GRAPH_ME_ENDPOINT="https://graph.microsoft.com/v1.0/me"
```

> 実装例のため、ログアウト時のリダイレクト URI にログイン時のリダイレクト URI をそのまま使用しています。
> 必要に応じて、専用のログアウトリダイレクトURIを設定してください。

### MSALの設定

`src/authConfig.ts`ファイルを作成して、MSALの設定を記述します。

```ts
import { type Configuration, type PopupRequest } from '@azure/msal-browser';

// MSALの設定
export const authConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_LOGIN_REDIRECT_URI,
    postLogoutRedirectUri: import.meta.env.VITE_LOGOUT_REDIRECT_URI,
  },
  cache: {
    cacheLocation: 'localStorage',
  },
};

// ログインリクエストのスコープ
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'],
};
```

`cache.cacheLocation` に `localStorage` を指定すると、複数タブやウィンドウ間でログイン状態を共有できます。
共有したくない場合は `sessionStorage` を指定します。

### MSALプロバイダーの追加

MSALプロバイダー（`MsalProvider`）をアプリケーションのルートコンポーネントに追加します。
これにより、アプリケーション全体で MSAL の機能を利用できるようになります。

- `src/main.tsx`

```ts
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { authConfig } from './authConfig.ts';
import App from './App.tsx';

const msalInstance = new PublicClientApplication(authConfig);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </StrictMode>,
);
```

### カスタムフック

SSO や Microsoft Graph API を呼び出す次のカスタムフックを作成します。

- `useAuthenticated`: `src/hooks/useAuthenticated.ts`
  - 認証状態と認証済みアカウント情報を提供します。
- `useAcquireToken`: `src/hooks/useAcquireToken.ts`
  - 認証済みアカウントを使用してアクセストークンを取得する関数を提供します。
- `useSSO`: `src/hooks/useSSO.ts`
  - SSO に関連する状態やハンドラを提供します。
    - アカウントが認証済みかを確認中であることを示すフラグ
    - アカウントが認証済みかを示すフラグ
    - SSO ログインハンドラ
    - アカウントを認証中であることを示すフラグ
    - SSO ログアウトハンドラ
    - エラー
- `useUserProfile`: `src/hooks/useUserProfile.ts`
  - Microsoft Graph API を呼び出して、ユーザープロファイル情報を提供します。

### Appコンポーネント

上記カスタムフックを使用して、SSO ログイン、SSO ログアウト、ユーザープロファイル情報の表示を行うコンポーネントです。

`AuthenticatedTemplate` コンポーネントは、アカウントが認証済みの場合に、子コンポーネントをレンダリングします。
`UnauthenticatedTemplate` コンポーネントは、アカウントが認証されていない場合に、子コンポーネントをレンダリングします。

```ts
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from '@azure/msal-react';
import { useSSO } from './hooks';
import { UserProfile } from './components/UserProfile';

interface ButtonProps {
  onClick: () => Promise<void>;
}
const LoginButton = ({ onClick }: ButtonProps) => {
  return <button onClick={onClick}>Login via Microsoft Entra ID</button>;
};

const LogoutButton = ({ onClick }: ButtonProps) => {
  return <button onClick={onClick}>Logout</button>;
};

const App = () => {
  const {
    isCheckingSSO,
    isLoginInProgress,
    isAuthenticated,
    login,
    logout,
    error,
  } = useSSO();

  return (
    <>
      <p>Entra ID SSO Sample</p>
      {isCheckingSSO && <p>Checking SSO status...</p>}
      {isLoginInProgress && <p>Login in progress...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {isAuthenticated ? (
        <AuthenticatedTemplate>
          <p>You are logged in!</p>
          <UserProfile />
          <LogoutButton onClick={logout} />
        </AuthenticatedTemplate>
      ) : (
        <UnauthenticatedTemplate>
          <p>You are not logged in.</p>
          <LoginButton onClick={login} />
        </UnauthenticatedTemplate>
      )}
    </>
  );
};

export default App;
```

## MSALのアクセストークンのキャッシュとリフレッシュ

MSALは、アクセストークンを自動でキャッシュし、その有効期限を管理します。

```ts
const [instance] = useMsal();

const request = {
  scopes: ['User.Read'],
  account: instance.getActiveAccount(),
};

// アクセストークンを取得
const tokenResponse = await instance.acquireTokenSilent(request);
const accessToken = tokenResponse.accessToken;

// Microsoft Graph APIを呼び出す
const graphResponse = await fetch(import.meta.env.VITE_GRAPH_ME_ENDPOINT, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
```

`acquireTokenSilent`は、キャッシュされたアクセストークンが有効な場合は、そのアクセストークンを返します。
一方、キャッシュされたアクセストークンが期限切れ、または無効な場合は、内部で再認証フローを実行し、新しいアクセストークンを取得（リフレッシュ）して返します。

このため、Microsoft Graph APIやバックエンドAPIを呼び出す際は、アクセストークンを保持し続けるのではなく、都度`acquireTokenSilent`を呼び出してアクセストークンを取得する実装としています。

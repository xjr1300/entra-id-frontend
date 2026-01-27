# Entra ID SSO フロントエンドサンプル

WebアプリケーションフレームワークとしてVite + Reactを使用し、Microsoft Entra ID SSOを実装する方法を示します。
Entra IDとの連携には、MSAL (Microsoft Authentication Library) for Reactを使用します。

最終的に何らかのバックエンドAPIサービスと連携することになると考えられますが、本サンプルではフロントエンド側の実装にフォーカスしています。
なお、バックエンドではフロントエンドから`Authorization`ヘッダーに含まれるBearerトークン（アクセストークン）を検証して、適切にレスポンスを返します。
バックエンドでは、認証機能の提供、アクセストークンの管理や生成を行うことはしません。

> OpenID Connect (OIDC) や OAuth 2.0 の文脈で、Entra ID は ID プロバイダー (IdP)として機能し、アクセストークンの発行を担当します。
> バックエンドは、アクセストークンを検証し、保護されたリソースを提供するリソースサーバーとして機能します。

## Entra IDの設定

Entra IDは、Microsoft Entra 管理センターで設定します。

### アプリケーションの登録

Microsoft Entra 管理センターのサイドバーの`[アプリの登録]`を選択して、`[新規登録]`を選択します。

表示されたページで、以下の情報を入力して`[登録]`を選択します。

- 名前: <アプリケーションのユーザー向け表示名（後で変更可能）>
- サポートされているアカウントの種類: `この組織ディレクトリのみに含まれるアカウント`
- リダイレクトURI: （後で設定します）

### 登録したアプリケーションの設定

#### クライアントIDとテナントIDのメモ

登録が完了したら、アプリケーションの概要ページが表示されます。
概要ページで、以下の情報をメモしておきます。

- アプリケーション (クライアント) ID
- ディレクトリ (テナント) ID

#### リダイレクトURIの設定

リダイレクトURIとは、認証が成功した後にユーザーがリダイレクトされるURIです。

アプリケーションの管理ページのサイドバーで、`[Authentication (Preview)]`を選択します。
表示されたページで、`[リダイレクト URI の追加]`を選択します。
表示された`[リダイレクト URI を追加するプラットフォームを選択する]パネルで、

`[プラットフォームの構成]`セクションで、`[プラットフォームの追加]`を選択し、`[Web アプリケーション] > [シングルページアプリケーション (SPA)]`を選択します。
`[リダイレクト URI]`に以下のURIを入力して、`[構成]`を選択します。

- `http://localhost:5173`

> Entra ID SSOの実装例であるため、ローカルホストのURIを使用しますが、本番環境では適切なドメイン名を使用してください。
> また、実装例は、上記理由で有効なURIは、`http://localhost:5173`のみです。

#### APIのアクセス許可の設定

アプリケーションの管理ページのサイドバーで、`[API のアクセス許可]`を選択します。
表示されたページで、`[アクセス許可の追加]`を選択します。
`Microsoft API`タブを選択して、`Microsoft Graph`を選択します。
`アプリケーションに必要なアクセス許可の種類`で`委任されたアクセス許可`を選択します。
`アクセス許可を選択する`に｀User.Read`を入力して、表示された候補から`User > User.Read`を選択します。
最後に、`[アクセス許可の追加]`を選択して設定を保存します。

## SPAフロントエンドアプリケーションの実装

## プロジェクトの作成と依存パッケージのインストール

```sh
npm create vite@latest
cd entra-id-frontend
npm install @azure/msal-browser @azure/msal-react
```

## `.env`ファイルの作成

プロジェクトルートに`.env`ファイルを作成して、以下の環境変数を設定します。

```env
VITE_CLIENT_ID=<上記でメモしたクライアントID>
VITE_TENANT_ID=<上記でメモしたテナントID>
VITE_LOGIN_REDIRECT_URI=<上記で設定したリダイレクトURI>
VITE_LOGOUT_REDIRECT_URI=<上記で設定したリダイレクトURI>

# Microsoft Graph APIのエンドポイント
VITE_GRAPH_ME_ENDPOINT="https://graph.microsoft.com/v1.0/me"
```

> 実装例であるため、ログアウトリダイレクトURIに（ログイン）リダイレクトURIをそのまま使用していますが、必要に応じて変更してください。

## MSALの設定ファイルの作成

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

`cache.cacheLocation`の値を`localStorage`に設定すると、別のタブやウィンドウでもログイン状態を共有できます。
別のタブやウィンドウでログイン状態を共有しない場合は、`sessionStorage`を設定します。

## MSALプロバイダーの追加

MSALプロバイダー（`MsalProvider`）をアプリケーションのルートコンポーネントに追加します。
`MsalProvider`をルートコンポーネントに追加することで、アプリケーション全体でMSALの機能を利用できるようになります。

- `src/main.tsx`

```tsx
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

## MSALのアクセストークンのキャッシュとリフレッシュ

MSALは、アクセストークンを自動でキャッシュします。
また、キャッシュしたアクセストークンの有効期限を自動的に管理します。

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
一方、キャッシュされたアクセストークンが期限切れ、または無効な場合は、内部で新しいアクセストークンを取得してキャッシュを更新します（アクセストークンのリフレッシュ）。

このため、Microsoft Graph APIを呼び出す際は、アクセストークンを保持し続けるのではなく、毎回`acquireTokenSilent`を呼び出してアクセストークンを取得する実装となっています。

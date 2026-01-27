# Entra ID frontend

```sh
npm create vite@latest
cd entra-id-frontend
npm install @azure/msal-browser @azure/msal-react
```

## Entra IDにリダイレクトURIを登録

- `http://localhost:5173`

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

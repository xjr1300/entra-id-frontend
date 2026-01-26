import { type Configuration, type PopupRequest } from '@azure/msal-browser';

export const authConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_LOGIN_REDIRECT_URI,
    postLogoutRedirectUri: import.meta.env.VITE_LOGIN_REDIRECT_URI,
    //postLogoutRedirectUri: import.meta.env.VITE_LOGOUT_REDIRECT_URI,
  },
  cache: {
    // 別のタブやウィンドウでもログイン状態を共有する場合はlocalStorageを使用
    // 別のタブやウィンドウでのログイン状態を共有しない場合はsessionStorageを使用
    cacheLocation: 'localStorage',
  },
};

// ログインリクエストのスコープ設定
export const loginRequest: PopupRequest = {
  scopes: ['User.Read'],
};

// Microsoft Graph APIのエンドポイント
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
};

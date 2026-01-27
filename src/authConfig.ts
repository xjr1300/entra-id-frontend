import { type Configuration, type SilentRequest } from '@azure/msal-browser';

export const authConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_LOGIN_REDIRECT_URI,
    postLogoutRedirectUri: import.meta.env.VITE_LOGOUT_REDIRECT_URI,
  },
  cache: {
    // 別のタブやウィンドウでもログイン状態を共有する場合はlocalStorageを使用
    // 別のタブやウィンドウでのログイン状態を共有しない場合はsessionStorageを使用
    cacheLocation: 'localStorage',
  },
};

// Microsoft Graph APIログインリクエストのスコープ設定
export const graphLoginRequest: SilentRequest = {
  scopes: ['User.Read'],
};

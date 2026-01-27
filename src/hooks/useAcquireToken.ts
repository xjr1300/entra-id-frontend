import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { type AccountInfo, type SilentRequest } from '@azure/msal-browser';
import { loginRequest } from '../authConfig';

export const useAcquireToken = () => {
  const { instance } = useMsal();

  const acquireToken = useCallback(
    async (account: AccountInfo): Promise<string> => {
      const request: SilentRequest = {
        account,
        ...loginRequest,
      };
      const result = await instance.acquireTokenSilent(request);
      return result.accessToken;
    },
    [instance],
  );

  return { acquireToken };
};

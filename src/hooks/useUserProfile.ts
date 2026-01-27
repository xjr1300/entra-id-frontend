import { useEffect, useState } from 'react';
import { useAcquireToken, useAuthenticated } from './index';

// ユーザープロファイル
export interface GraphUserProfile {
  id?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
  surname?: string | null;
  givenName?: string | null;
  jobTitle?: string | null;
  mail?: string | null;
  department?: string | null;
  officeLocation?: string | null;
  businessPhones?: string[] | null;
  mobilePhone?: string | null;
  preferredLanguage?: string | null;
}

// GraphUserProfile型ガード
export const isGraphUserProfile = (obj: unknown): obj is GraphUserProfile => {
  if (typeof obj != 'object' || obj === null) return false;
  const instance = obj as GraphUserProfile;
  if (instance.id != null && typeof instance.id !== 'string') return false;
  if (
    instance.userPrincipalName != null &&
    typeof instance.userPrincipalName !== 'string'
  )
    return false;
  if (instance.displayName != null && typeof instance.displayName !== 'string')
    return false;
  if (instance.surname != null && typeof instance.surname !== 'string')
    return false;
  if (instance.givenName != null && typeof instance.givenName !== 'string')
    return false;
  if (instance.jobTitle != null && typeof instance.jobTitle !== 'string')
    return false;
  if (instance.mail != null && typeof instance.mail !== 'string') return false;
  if (instance.department != null && typeof instance.department !== 'string')
    return false;
  if (instance.businessPhones != null) {
    if (!Array.isArray(instance.businessPhones)) return false;
    for (const phone of instance.businessPhones) {
      if (typeof phone !== 'string') return false;
    }
  }
  if (instance.mobilePhone != null && typeof instance.mobilePhone !== 'string')
    return false;
  if (
    instance.preferredLanguage != null &&
    typeof instance.preferredLanguage !== 'string'
  )
    return false;
  return true;
};

export const useUserProfile = () => {
  const { isAuthenticated, account } = useAuthenticated();
  const { acquireToken } = useAcquireToken();
  const [userProfile, setUserProfile] = useState<GraphUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !account) {
      setUserProfile(null);
      return;
    }

    let cancelled = false;
    const fetchUserProfile = async () => {
      setIsLoading(true);
      try {
        const accessToken = await acquireToken(account);
        const response = await fetch(import.meta.env.VITE_GRAPH_ME_ENDPOINT, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!response.ok) {
          const errorBody = await response.json();
          console.error('Failed to fetch user profile:', errorBody);
          if (!cancelled) {
            setError(
              'Microsoft Graph APIからのユーザープロファイルの取得に失敗しました。',
            );
          }
          return;
        }
        const data = await response.json();
        if (!isGraphUserProfile(data)) {
          if (!cancelled) {
            console.error('Unexpected user profile format:', data);
            setError(
              'Microsoft Graph APIから取得したユーザープロファイルの形式を予期できませんでした。',
            );
          }
          return;
        }
        setUserProfile(data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        if (!cancelled) {
          setError('ユーザープロファイルの取得中にエラーが発生しました。');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchUserProfile();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, account, acquireToken]);

  return { userProfile, isLoading, error };
};

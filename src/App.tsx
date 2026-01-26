import {
  useMsal,
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
} from '@azure/msal-react';
import { loginRequest } from './authConfig';

const LoginButton = () => {
  const { instance } = useMsal();
  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return <button onClick={handleLogin}>Login via Microsoft Entra ID</button>;
};

const LogoutButton = () => {
  const { instance } = useMsal();
  const handleLogout = () => {
    instance.logoutRedirect({
      account: instance.getActiveAccount(),
    });
  };

  return <button onClick={handleLogout}>Logout</button>;
};
const App = () => {
  return (
    <div className="App">
      <h1>MSAL App</h1>
      <AuthenticatedTemplate>
        <div>Login Succeeded</div>
        <LogoutButton />
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <LoginButton />
      </UnauthenticatedTemplate>
    </div>
  );
};

export default App;

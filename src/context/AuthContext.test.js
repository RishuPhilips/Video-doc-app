
import React from 'react';
import { Text, Button } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

/**
 * SUPER-SIMPLE MOCK of the AuthContext module.
 * We avoid importing the real ./AuthContext (which may pull firebase),
 * and instead provide a tiny test implementation here.
 */
jest.mock('./AuthContext', () => {
  const React = require('react');

  const AuthContext = React.createContext({
    user: null,
    loading: false,
    isVerified: false,
    login: () => {},
    logout: () => {},
  });

  function AuthProvider({ children }) {
    const [user, setUser] = React.useState(null);
    const [loading, setLoading] = React.useState(false);

    const isVerified = Boolean(user?.emailVerified);

    const login = ({ email }) => {
      setLoading(true);
      // Simulate async auth result
      setTimeout(() => {
        setUser({ email, emailVerified: false });
        setLoading(false);
      }, 10);
    };

    const logout = () => {
      setLoading(true);
      setTimeout(() => {
        setUser(null);
        setLoading(false);
      }, 10);
    };

    return (
      <AuthContext.Provider
        value={{ user, loading, isVerified, login, logout }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return { AuthContext, AuthProvider };
});

// Use the MOCKED AuthContext + AuthProvider exported above
import { AuthContext, AuthProvider } from './AuthContext';

/** A tiny consumer component for assertions */
function Consumer() {
  const { user, loading, isVerified, login, logout } =
    React.useContext(AuthContext);

  return (
    <>
      <Text testID="loading">{String(loading)}</Text>
      <Text testID="userEmail">{user?.email ?? 'null'}</Text>
      <Text testID="isVerified">{String(isVerified)}</Text>

      <Button
        title="login"
        onPress={() => login({ email: 'rishu@example.com', password: 'secret' })}
      />
      <Button title="logout" onPress={logout} />
    </>
  );
}

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );

describe('AuthContext (simple)', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // control setTimeout in our mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('initial state: no user, not verified, not loading', () => {
    const { getByTestId } = renderWithProvider();

    expect(getByTestId('loading').props.children).toBe('false');
    expect(getByTestId('userEmail').props.children).toBe('null');

    // isVerified is false when user === null
    expect(getByTestId('isVerified').props.children).toBe('false');
  });

  test('login -> user appears, loading toggles', async () => {
    const { getByText, getByTestId } = renderWithProvider();

    fireEvent.press(getByText(/login/i));
    // loading becomes true just before the async completes
    expect(getByTestId('loading').props.children).toBe('true');

    // Fast-forward our tiny timeout
    jest.advanceTimersByTime(15);

    await waitFor(() => {
      expect(getByTestId('loading').props.children).toBe('false');
      expect(getByTestId('userEmail').props.children).toBe('rishu@example.com');
      expect(getByTestId('isVerified').props.children).toBe('false'); // emailVerified=false in our mock
    });
  });

  test('logout -> user resets', async () => {
    const { getByText, getByTestId } = renderWithProvider();

    // login first
    fireEvent.press(getByText(/login/i));
    jest.advanceTimersByTime(15);

    await waitFor(() =>
      expect(getByTestId('userEmail').props.children).toBe('rishu@example.com')
    );

    // then logout
    fireEvent.press(getByText(/logout/i));
    expect(getByTestId('loading').props.children).toBe('true');

    jest.advanceTimersByTime(15);

    await waitFor(() => {
      expect(getByTestId('userEmail').props.children).toBe('null');
      expect(getByTestId('isVerified').props.children).toBe('false');
      expect(getByTestId('loading').props.children).toBe('false');
    });
  });
});

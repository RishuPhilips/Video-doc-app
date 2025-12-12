
import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider } from './../context/AuthContext';
import {DataProvider} from './../context/VideoDocContext';
import Registration from './../screens/auth/Registration';
import Login from './../screens/auth/Login';
import Home from './../screens/Home';
import Video from './../screens/Video';
import Document from './../screens/Document';

const Stack = createNativeStackNavigator();

export default function MainNavigation() {
  const isDark = useColorScheme() === 'dark';

  return (
    <AuthProvider>
      <DataProvider>
    <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShadowVisible: false,
          headerTitleAlign: 'center',
        }}
      >
        <Stack.Screen
          name="Login"
          component={Login}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Registration"
          component={Registration}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ title: '' }}
        />
         <Stack.Screen
          name="Video"
          component={Video}
          options={{ title: '' }}
        />
         <Stack.Screen
          name="Document"
          component={Document}
          options={{ title: '' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </DataProvider>
    </AuthProvider>
  );
}

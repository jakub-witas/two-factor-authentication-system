import React, { useContext, useState } from 'react';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';

const Router = () => {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  //const { token } = useContext(AuthContext);

  const navigate = (screen) => setCurrentScreen(screen);

  // // simple redirect after login if token exists
  // useEffect(() => {
  //   if (token && (currentScreen === 'login' || currentScreen === 'register' || currentScreen === 'welcome')) {
  //     setCurrentScreen('home');
  //   }
  // }, [currentScreen]);

  switch (currentScreen) {
    case 'welcome': return <WelcomeScreen navigate={navigate} />;
    case 'login': return <LoginScreen navigate={navigate} />;
    case 'register': return <RegisterScreen navigate={navigate} />;
    case 'home': return <HomeScreen navigate={navigate} />;
    case 'settings': return <SettingsScreen navigate={navigate} />;
    default: return <WelcomeScreen navigate={navigate} />;
  }
};

const App = () => (
    <Router />
);

export default App;

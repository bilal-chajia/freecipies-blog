import { useEffect } from 'react';
import { useUIStore } from '../store/useStore';

const ThemeProvider = ({ children }) => {
  const { theme } = useUIStore();

  useEffect(() => {
    // Appliquer ou retirer la classe 'dark' sur l'élément html
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;

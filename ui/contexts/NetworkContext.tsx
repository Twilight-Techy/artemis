import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

interface NetworkContextType {
  isOffline: boolean;
  toggleOfflineSimulation: () => void;
}

const NetworkContext = createContext<NetworkContextType>({
  isOffline: false,
  toggleOfflineSimulation: () => {},
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRealOffline, setIsRealOffline] = useState(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsRealOffline(state.isConnected === false);
    });
    return () => unsubscribe();
  }, []);

  const toggleOfflineSimulation = () => setIsSimulatedOffline(prev => !prev);
  const isOffline = isRealOffline || isSimulatedOffline;

  return (
    <NetworkContext.Provider value={{ isOffline, toggleOfflineSimulation }}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);

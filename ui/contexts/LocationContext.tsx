import React, { createContext, useContext, useState, useEffect } from 'react';
import { artemisApi } from '../api/artemisClient';

export interface Room {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

interface LocationContextData {
  currentRoomId: string | null;
  setCurrentRoomId: (id: string | null) => void;
  rooms: Room[];
  refreshRooms: () => Promise<void>;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextData>({
  currentRoomId: null,
  setCurrentRoomId: () => {},
  rooms: [],
  refreshRooms: async () => {},
  isLoading: true,
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshRooms = async () => {
    try {
      setIsLoading(true);
      const fetchedRooms = await artemisApi.getRooms();
      setRooms(fetchedRooms);
      
      // Auto-select the first room if nothing is selected and rooms exist
      if (fetchedRooms.length > 0 && !currentRoomId) {
        setCurrentRoomId(fetchedRooms[0].id);
      } else if (fetchedRooms.length === 0) {
        setCurrentRoomId(null);
      }
    } catch (error) {
      console.error('Failed to fetch rooms for location context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <LocationContext.Provider
      value={{
        currentRoomId,
        setCurrentRoomId,
        rooms,
        refreshRooms,
        isLoading,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}

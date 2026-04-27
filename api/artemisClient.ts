import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, localhost works
// For physical device, use your machine's local IP (e.g. 192.168.x.x)
export const BACKEND_URL = 'http://10.27.73.226:8000/api/v1';

export const artemisApi = {
    chat: async (message: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/mcp/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Auth token should be injected here if we were using real auth
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Chat API error:", error);
            throw error;
        }
    },

    approveAction: async (actionId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/mcp/approve/${actionId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            return await response.json();
        } catch (error) {
            console.error("Approve Action API error:", error);
            throw error;
        }
    },

    declineAction: async (actionId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/mcp/decline/${actionId}`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            return await response.json();
        } catch (error) {
            console.error("Decline Action API error:", error);
            throw error;
        }
    },

    getRooms: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/rooms/`, {
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            return await response.json();
        } catch (error) {
            console.error("Get Rooms API error:", error);
            throw error;
        }
    },

    getDevices: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/`, {
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            return await response.json();
        } catch (error) {
            console.error("Get Devices API error:", error);
            throw error;
        }
    },

    controlDevice: async (deviceId: string, action: string, value?: any) => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/${deviceId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify({ action, value })
            });
            return await response.json();
        } catch (error) {
            console.error("Control Device API error:", error);
            throw error;
        }
    },

    createDevice: async (payload: { name: string, device_type: string, room_id: string, protocol?: string, endpoint?: string }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to create device");
            return await response.json();
        } catch (error) {
            console.error("Create Device API error:", error);
            throw error;
        }
    },

    deleteDevice: async (deviceId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/${deviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            if (!response.ok) throw new Error("Failed to delete device");
            return true;
        } catch (error) {
            console.error("Delete Device API error:", error);
            throw error;
        }
    },

    updateDevice: async (deviceId: string, payload: { name: string, device_type: string, room_id: string, protocol?: string, endpoint?: string }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to update device");
            return await response.json();
        } catch (error) {
            console.error("Update Device API error:", error);
            throw error;
        }
    },

    discoverDevices: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/discover`, {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            if (!response.ok) throw new Error("Failed to discover devices");
            return await response.json();
        } catch (error) {
            console.error("Discover Devices API error:", error);
            throw error;
        }
    },

    // ──────────────────────────────
    // Rooms API
    // ──────────────────────────────
    createRoom: async (payload: { name: string, icon?: string, color?: string }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/rooms/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to create room");
            return await response.json();
        } catch (error) {
            console.error("Create Room API error:", error);
            throw error;
        }
    },

    updateRoom: async (roomId: string, payload: { name: string, icon?: string, color?: string }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/rooms/${roomId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to update room");
            return await response.json();
        } catch (error) {
            console.error("Update Room API error:", error);
            throw error;
        }
    },

    deleteRoom: async (roomId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/rooms/${roomId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                }
            });
            if (!response.ok) throw new Error("Failed to delete room");
            return true;
        } catch (error) {
            console.error("Delete Room API error:", error);
            throw error;
        }
    },

    // ──────────────────────────────
    // Functions API
    // ──────────────────────────────
    getFunctions: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/functions/`, {
                headers: { 'Authorization': 'Bearer placeholder-artemis-mcp-token' }
            });
            if (!response.ok) throw new Error("Failed to fetch functions");
            return await response.json();
        } catch (error) {
            console.error("Get Functions error:", error);
            throw error;
        }
    },

    createFunction: async (payload: { name: string, description?: string, function_type: string, method?: string, url?: string, headers?: object, body_template?: object, parameters?: string[] }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/functions/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to create function");
            return await response.json();
        } catch (error) {
            console.error("Create Function error:", error);
            throw error;
        }
    },

    updateFunction: async (id: string, payload: { name: string, description?: string, function_type: string, method?: string, url?: string, headers?: object, body_template?: object, parameters?: string[] }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/functions/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to update function");
            return await response.json();
        } catch (error) {
            console.error("Update Function error:", error);
            throw error;
        }
    },

    deleteFunction: async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/functions/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer placeholder-artemis-mcp-token' }
            });
            if (!response.ok) throw new Error("Failed to delete function");
            return true;
        } catch (error) {
            console.error("Delete Function error:", error);
            throw error;
        }
    },

    executeFunction: async (id: string, params: Record<string, string> = {}) => {
        try {
            const response = await fetch(`${BACKEND_URL}/functions/${id}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer placeholder-artemis-mcp-token',
                },
                body: JSON.stringify(params) // Send params if needed
            });
            if (!response.ok) throw new Error("Failed to execute function");
            return await response.json();
        } catch (error) {
            console.error("Execute Function error:", error);
            throw error;
        }
    }
};

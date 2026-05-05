import { Platform } from 'react-native';

// For Android emulator, use 10.0.2.2 instead of localhost
// For iOS simulator, localhost works
// For physical device, use your machine's local IP (e.g. 192.168.x.x)
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8000/api/v1';

export const artemisApi = {
    _token: null as string | null,
    _onUnauthorized: null as (() => void) | null,

    setToken: (token: string | null) => { artemisApi._token = token; },
    getAuthHeader: (): Record<string, string> => (artemisApi._token ? { Authorization: `Bearer ${artemisApi._token}` } : {}),

    /** Register a callback (e.g. logout) to fire on any 401 response */
    onUnauthorized: (cb: () => void) => { artemisApi._onUnauthorized = cb; },

    /** Check response for 401 and auto-logout if so */
    _handleResponse: async (res: Response) => {
        if (res.status === 401) {
            artemisApi._onUnauthorized?.();
            throw new Error('Session expired');
        }
        return res;
    },

    login: async (payload: any) => {
        const res = await fetch(`${BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Login failed');
        return await res.json();
    },

    register: async (payload: any) => {
        const res = await fetch(`${BACKEND_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Registration failed');
        return await res.json();
    },

    chat: async (message: string) => {
        try {
            const response = await artemisApi._handleResponse(await fetch(`${BACKEND_URL}/mcp/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify({ message })
            }));

            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Chat API error:", error);
            throw error;
        }
    },

    getChatHistory: async () => {
        try {
            const response = await artemisApi._handleResponse(await fetch(`${BACKEND_URL}/mcp/history`, {
                headers: artemisApi.getAuthHeader()
            }));
            if (!response.ok) throw new Error('Failed to fetch chat history');
            return await response.json();
        } catch (error) {
            console.error("Chat History error:", error);
            throw error;
        }
    },

    transcribeAudio: async (audioUri: string, mimeType: string = 'audio/m4a') => {
        try {
            const formData = new FormData();
            // In React Native, we can pass an object with uri, name, and type
            formData.append('audio', {
                uri: Platform.OS === 'ios' ? audioUri.replace('file://', '') : audioUri,
                name: 'recording.m4a',
                type: mimeType,
            } as any);

            const headers = artemisApi.getAuthHeader();
            // Do NOT set Content-Type to multipart/form-data manually, fetch will set it with the correct boundary
            
            const response = await fetch(`${BACKEND_URL}/mcp/transcribe`, {
                method: 'POST',
                headers,
                body: formData,
            });

            if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error("Transcription API error:", error);
            throw error;
        }
    },

    approveAction: async (actionId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/mcp/approve/${actionId}`, {
                method: 'POST',
                headers: {
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
            const response = await artemisApi._handleResponse(await fetch(`${BACKEND_URL}/rooms/`, {
                headers: {
                    ...artemisApi.getAuthHeader(),
                }
            }));
            return await response.json();
        } catch (error) {
            console.error("Get Rooms API error:", error);
            throw error;
        }
    },

    getDevices: async () => {
        try {
            const response = await artemisApi._handleResponse(await fetch(`${BACKEND_URL}/devices/`, {
                headers: {
                    ...artemisApi.getAuthHeader(),
                }
            }));
            return await response.json();
        } catch (error) {
            console.error("Get Devices API error:", error);
            throw error;
        }
    },

    controlDevice: async (deviceId: string, action: string, payload?: any) => {
        try {
            const response = await fetch(`${BACKEND_URL}/devices/${deviceId}/command`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify({ action, payload })
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                headers: { ...artemisApi.getAuthHeader() }
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
                    ...artemisApi.getAuthHeader(),
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
                    ...artemisApi.getAuthHeader(),
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
                headers: { ...artemisApi.getAuthHeader() }
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
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify(params) // Send params if needed
            });
            if (!response.ok) throw new Error("Failed to execute function");
            return await response.json();
        } catch (error) {
            console.error("Execute Function error:", error);
            throw error;
        }
    },

    // ──────────────────────────────
    // Automations API
    // ──────────────────────────────
    getAutomations: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/`, {
                headers: { ...artemisApi.getAuthHeader() }
            });
            if (!response.ok) throw new Error("Failed to fetch automations");
            return await response.json();
        } catch (error) {
            console.error("Get Automations error:", error);
            throw error;
        }
    },

    parseAALText: async (text: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/parse`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify({ text })
            });
            if (!response.ok) throw new Error("Failed to parse AAL text");
            return await response.json();
        } catch (error) {
            console.error("Parse AAL error:", error);
            throw error;
        }
    },

    // ──────────────────────────────
    // History API
    // ──────────────────────────────
    getHistory: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/logs/`, {
                headers: { ...artemisApi.getAuthHeader() }
            });
            if (!response.ok) throw new Error("Failed to fetch history logs");
            return await response.json();
        } catch (error) {
            console.error("Get History error:", error);
            throw error;
        }
    },

    createAutomation: async (payload: { name: string, automation_type: string, trigger: string, condition?: string, action: string, fallback?: string, is_enabled?: boolean }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to create automation");
            return await response.json();
        } catch (error) {
            console.error("Create Automation error:", error);
            throw error;
        }
    },

    updateAutomation: async (id: string, payload: { name: string, automation_type: string, trigger: string, condition?: string, action: string, fallback?: string, is_enabled?: boolean }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to update automation");
            return await response.json();
        } catch (error) {
            console.error("Update Automation error:", error);
            throw error;
        }
    },

    toggleAutomation: async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/${id}/toggle`, {
                method: 'PATCH',
                headers: { ...artemisApi.getAuthHeader() }
            });
            if (!response.ok) throw new Error("Failed to toggle automation");
            return await response.json();
        } catch (error) {
            console.error("Toggle Automation error:", error);
            throw error;
        }
    },

    deleteAutomation: async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/automations/${id}`, {
                method: 'DELETE',
                headers: { ...artemisApi.getAuthHeader() }
            });
            if (!response.ok) throw new Error("Failed to delete automation");
            return true;
        } catch (error) {
            console.error("Delete Automation error:", error);
            throw error;
        }
    },

    // ──────────────────────────────
    // Profile API
    // ──────────────────────────────
    getMe: async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/me`, {
                headers: { ...artemisApi.getAuthHeader() }
            });
            if (!response.ok) throw new Error("Failed to fetch profile");
            return await response.json();
        } catch (error) {
            console.error("Get Profile error:", error);
            throw error;
        }
    },
    updateMe: async (payload: { display_name?: string; email?: string; avatar_url?: string }) => {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...artemisApi.getAuthHeader(),
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error("Failed to update profile");
            return await response.json();
        } catch (error) {
            console.error("Update Profile error:", error);
            throw error;
        }
    }
};

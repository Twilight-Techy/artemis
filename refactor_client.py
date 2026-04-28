import sys

with open('api/artemisClient.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace hardcoded headers
content = content.replace("'Content-Type': 'application/json',\n                    'Authorization': 'Bearer placeholder-artemis-mcp-token',", "'Content-Type': 'application/json',\n                    ...artemisApi.getAuthHeader(),")
content = content.replace("'Content-Type': 'application/json',\n                    'Authorization': 'Bearer placeholder-artemis-mcp-token'", "'Content-Type': 'application/json',\n                    ...artemisApi.getAuthHeader()")
content = content.replace("'Authorization': 'Bearer placeholder-artemis-mcp-token',", "...artemisApi.getAuthHeader(),")
content = content.replace("'Authorization': 'Bearer placeholder-artemis-mcp-token'", "...artemisApi.getAuthHeader()")

auth_logic = """export const artemisApi = {
    _token: null as string | null,
    setToken: (token: string | null) => { artemisApi._token = token; },
    getAuthHeader: () => (artemisApi._token ? { Authorization: `Bearer ${artemisApi._token}` } : {}),

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
"""

content = content.replace('export const artemisApi = {', auth_logic)

with open('api/artemisClient.ts', 'w', encoding='utf-8') as f:
    f.write(content)

import React, { createContext, useContext, useState, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { artemisApi, BACKEND_URL } from '../api/artemisClient';
import MCPActionModal, { ProactiveAction } from '../components/MCPActionModal';
import { useProfile } from './ProfileContext';

type MCPContextType = {
  pendingAction: ProactiveAction | null;
  setPendingAction: (action: ProactiveAction | null) => void;
  showMCPModal: boolean;
  setShowMCPModal: (show: boolean) => void;
  approveAction: () => Promise<string | null>;
  declineAction: () => Promise<void>;
  /** Called by the notification listener to restore a pending action by ID. */
  showActionFromNotification: (actionId: string) => Promise<void>;
};

const MCPContext = createContext<MCPContextType | null>(null);

export const useMCP = () => {
  const ctx = useContext(MCPContext);
  if (!ctx) throw new Error('useMCP must be used within MCPProvider');
  return ctx;
};

export const MCPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pendingAction, setPendingAction] = useState<ProactiveAction | null>(null);
  const [showMCPModal, setShowMCPModal] = useState(false);
  const { userId } = useProfile();

  const approveAction = async () => {
    if (!pendingAction) return null;
    const actionId = pendingAction.action_id;
    setShowMCPModal(false);
    setPendingAction(null);
    try {
      const response = await artemisApi.approveAction(actionId);
      DeviceEventEmitter.emit('mcp_action_executed');
      return response?.confirmation ?? `Done! ${pendingAction.target_name} has been updated.`;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const declineAction = async () => {
    if (!pendingAction) return;
    const actionId = pendingAction.action_id;
    setShowMCPModal(false);
    setPendingAction(null);
    try {
      await artemisApi.declineAction(actionId);
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * Fetches a pending action by ID (from notification data) and shows the modal.
   * Used when the user taps a push notification while outside the app.
   */
  const showActionFromNotification = useCallback(async (actionId: string) => {
    try {
      const action = await artemisApi.getPendingAction(actionId);
      if (!action || action.status !== 'pending') return;

      setPendingAction({
        action_id: action.action_id,
        action_type: action.action_type,
        target_name: action.target_name,
        payload: action.payload,
        reasoning: action.reasoning,
        reasoning_trace: action.reasoning_trace ?? null,
      });
      setShowMCPModal(true);
    } catch (e) {
      console.error('[MCPContext] showActionFromNotification failed:', e);
    }
  }, []);

  // Set up WebSocket connection for real-time proactive actions
  React.useEffect(() => {
    if (!userId) return;

    const wsProtocol = BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
    const baseUrl = BACKEND_URL.replace(/\/api\/v1\/?$/, '');
    const wsUrl = `${baseUrl.replace(/^http/, wsProtocol)}/ws/${userId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[MCPContext] WebSocket connected.');
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'proactive_action' && payload.action_id) {
          // Fetch the full action data (just like we do for a push notification)
          showActionFromNotification(payload.action_id);
        }
      } catch (err) {
        console.error('[MCPContext] Failed to parse WS message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[MCPContext] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[MCPContext] WebSocket closed.');
    };

    return () => {
      ws.close();
    };
  }, [userId, showActionFromNotification]);

  return (
    <MCPContext.Provider value={{
      pendingAction,
      setPendingAction,
      showMCPModal,
      setShowMCPModal,
      approveAction,
      declineAction,
      showActionFromNotification,
    }}>
      {children}
      <MCPActionModal
        visible={showMCPModal}
        onClose={declineAction}
        onExecute={approveAction}
        proactiveAction={pendingAction}
      />
    </MCPContext.Provider>
  );
};

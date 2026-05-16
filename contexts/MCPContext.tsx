import React, { createContext, useContext, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { artemisApi } from '../api/artemisClient';
import MCPActionModal, { ProactiveAction } from '../components/MCPActionModal';

type MCPContextType = {
  pendingAction: ProactiveAction | null;
  setPendingAction: (action: ProactiveAction | null) => void;
  showMCPModal: boolean;
  setShowMCPModal: (show: boolean) => void;
  approveAction: () => Promise<string | null>;
  declineAction: () => Promise<void>;
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

  return (
    <MCPContext.Provider value={{
      pendingAction,
      setPendingAction,
      showMCPModal,
      setShowMCPModal,
      approveAction,
      declineAction
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

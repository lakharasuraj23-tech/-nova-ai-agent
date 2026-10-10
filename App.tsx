import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  ListTodo,
  Brain,
  Globe,
  Wrench,
  HardDrive,
  Settings,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Download,
  Languages,
  Info,
} from 'lucide-react';
import {
  AppSettings,
  Conversation,
  MemoryItem,
  NovaMessage,
  TaskPlan,
} from './types/nova';
import { StorageService } from './services/storage';
import { Avatar3D } from './components/Avatar3D';
import { ChatInterface } from './components/ChatInterface';
import { TaskPlanner } from './components/TaskPlanner';
import { MemoryBank } from './components/MemoryBank';
import { ResearchMode } from './components/ResearchMode';
import { ToolModules } from './components/ToolModules';
import { UsbBackupModal } from './components/UsbBackupModal';
import { SettingsView } from './components/SettingsView';
import { Diagnostics } from './components/Diagnostics';
import { ConfirmModal } from './components/ConfirmModal';

type ActiveTab =
  | 'chat'
  | 'planner'
  | 'memory'
  | 'research'
  | 'tools'
  | 'backup'
  | 'settings'
  | 'diagnostics';

export default function App() {
  // Application State
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    StorageService.getConversations()
  );
  const [activeConvId, setActiveConvId] = useState<string | null>(() =>
    StorageService.getActiveConversationId()
  );
  const [memories, setMemories] = useState<MemoryItem[]>(() =>
    StorageService.getMemories()
  );
  const [taskPlans, setTaskPlans] = useState<TaskPlan[]>(() =>
    StorageService.getTaskPlans()
  );
  const [settings, setSettings] = useState<AppSettings>(() =>
    StorageService.getSettings()
  );

  // UI State
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [avatarStatus, setAvatarStatus] = useState<
    'idle' | 'listening' | 'speaking' | 'thinking'
  >('idle');
  const [showAvatar, setShowAvatar] = useState<boolean>(true);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Ensure an active conversation exists
  useEffect(() => {
    if (conversations.length === 0) {
      const initialConv: Conversation = {
        id: `conv_${Date.now()}`,
        title: 'Welcome Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [
          {
            id: 'init_msg_1',
            sender: 'nova',
            text: `नमस्ते! I am NOVA, your personal AI assistant.\n\nI am configured for Android mobile performance, offline USB OTG storage backup, and natural communication in both Hindi (हिंदी) and English.\n\nHow can I help you today? You can ask questions, plan goals, or summarize documents.`,
            timestamp: Date.now(),
            language: 'hinglish',
          },
        ],
      };
      setConversations([initialConv]);
      setActiveConvId(initialConv.id);
      StorageService.saveConversations([initialConv]);
      StorageService.setActiveConversationId(initialConv.id);
    } else if (!activeConvId || !conversations.some((c) => c.id === activeConvId)) {
      setActiveConvId(conversations[0].id);
      StorageService.setActiveConversationId(conversations[0].id);
    }
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Conversation Handlers
  const handleUpdateConversation = (updated: Conversation) => {
    const updatedList = conversations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setConversations(updatedList);
    StorageService.saveConversations(updatedList);
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv_${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    setActiveConvId(newConv.id);
    StorageService.saveConversations(updated);
    StorageService.setActiveConversationId(newConv.id);
  };

  const handleDeleteConversation = (id: string) => {
    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);
    StorageService.saveConversations(remaining);

    if (activeConvId === id) {
      const nextId = remaining.length > 0 ? remaining[0].id : null;
      setActiveConvId(nextId);
      if (nextId) StorageService.setActiveConversationId(nextId);
    }
  };

  // Memory Handlers
  const handleSaveMemories = (newMemories: MemoryItem[]) => {
    setMemories(newMemories);
    StorageService.saveMemories(newMemories);
  };

  // Plan Handlers
  const handleSavePlans = (newPlans: TaskPlan[]) => {
    setTaskPlans(newPlans);
    StorageService.saveTaskPlans(newPlans);
  };

  // Settings Handlers
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  // Restore Handler
  const handleDataRestored = () => {
    setConversations(StorageService.getConversations());
    setActiveConvId(StorageService.getActiveConversationId());
    setMemories(StorageService.getMemories());
    setTaskPlans(StorageService.getTaskPlans());
    setSettings(StorageService.getSettings());
  };

  // Clear All Data
  const handleClearAllData = () => {
    StorageService.clearAllData();
    handleNewConversation();
    setMemories([]);
    setTaskPlans([]);
    setSettings(StorageService.getSettings());
  };

  // Confirm Action Helper
  const triggerConfirmation = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    if (settings.confirmDestructiveActions) {
      setConfirmModal({
        isOpen: true,
        title,
        message,
        onConfirm,
      });
    } else {
      onConfirm();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-violet-500/30">
      {/* 1. TOP BAR CONTRACT: Single text brand, concise nav links, single action */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md z-30 shrink-0">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-cyan-500 flex items-center justify-center shadow-md shadow-violet-900/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white font-display">
            NOVA
          </span>
          <span className="text-[10px] text-violet-400 font-mono hidden sm:inline">
            Personal AI
          </span>
        </div>

        {/* Zone 2: Navigation Links (hidden on small screens, thumb nav below) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('chat')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'chat' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'planner' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Planner
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'memory' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Memory Bank
          </button>
          <button
            onClick={() => setActiveTab('research')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'research' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Research Lab
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'tools' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Skill Registry
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'backup' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            USB Backup
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'settings' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'diagnostics' ? 'text-violet-300 font-semibold' : 'hover:text-slate-200'
            }`}
          >
            Diagnostics
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('backup')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
            title="Export or Import data using USB OTG Flash Drive"
          >
            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">OTG Backup</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Column: 3D Holographic Core & Quick Switcher (Collapsible on mobile) */}
        <div
          className={`shrink-0 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-950/70 flex flex-col transition-all duration-300 ${
            showAvatar ? 'h-auto md:w-72 lg:w-80' : 'h-10 md:w-14'
          }`}
        >
          {/* Avatar Toggle Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span>Holographic Core</span>
            </span>

            <button
              onClick={() => setShowAvatar(!showAvatar)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded"
              title={showAvatar ? 'Minimize avatar' : 'Expand avatar'}
            >
              {showAvatar ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* 3D Canvas Sphere */}
          {showAvatar && (
            <div className="p-2 flex flex-col items-center">
              <Avatar3D
                status={avatarStatus}
                quality={settings.particleQuality}
              />

              {/* Status Indicator */}
              <div className="text-[11px] font-mono text-slate-400 capitalize mt-1">
                State: <span className="text-violet-300 font-semibold">{avatarStatus}</span>
              </div>

              {/* Setup notice for zero-budget & OTG usage */}
              <div className="mt-2.5 mx-1 p-2 bg-slate-900/60 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 leading-relaxed hidden md:block">
                <div className="font-semibold text-slate-300 mb-0.5">Android + OTG Optimized</div>
                Local browser persistence keeps your memories and plans safe without server cost. Export to your USB stick anytime.
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Active Tab Content */}
        <main className="flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-3 relative">
          {activeTab === 'chat' && activeConversation && (
            <ChatInterface
              conversation={activeConversation}
              onUpdateConversation={handleUpdateConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              settings={settings}
              memories={memories}
              onOpenTaskPlanner={() => setActiveTab('planner')}
              onOpenBackup={() => setActiveTab('backup')}
              onAssistantStatusChange={setAvatarStatus}
              onConfirmAction={triggerConfirmation}
            />
          )}

          {activeTab === 'planner' && (
            <TaskPlanner
              plans={taskPlans}
              onSavePlans={handleSavePlans}
              settings={settings}
              onConfirmAction={triggerConfirmation}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryBank
              memories={memories}
              onSaveMemories={handleSaveMemories}
              onConfirmAction={triggerConfirmation}
            />
          )}

          {activeTab === 'research' && <ResearchMode settings={settings} />}

          {activeTab === 'tools' && <ToolModules />}

          {activeTab === 'backup' && (
            <UsbBackupModal
              onDataRestored={handleDataRestored}
              onConfirmAction={triggerConfirmation}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onClearAllData={handleClearAllData}
              onConfirmAction={triggerConfirmation}
            />
          )}

          {activeTab === 'diagnostics' && <Diagnostics />}
        </main>
      </div>

      {/* Mobile Thumb Navigation Bar (Sticky at bottom for Android ergonomics, max 12% viewport) */}
      <nav className="lg:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-1 py-1.5 z-40 shrink-0">
        {[
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'planner', label: 'Planner', icon: ListTodo },
          { id: 'memory', label: 'Memory', icon: Brain },
          { id: 'research', label: 'Research', icon: Globe },
          { id: 'backup', label: 'USB OTG', icon: HardDrive },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex flex-col items-center justify-center min-w-[50px] min-h-[44px] py-1 px-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'text-violet-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
}

import React from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Heart,
  Shield,
  HelpCircle,
} from 'lucide-react';

function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  return (
    <div className="w-72 h-screen bg-gradient-to-b from-indigo-950 via-indigo-900 to-slate-900 text-white flex flex-col">
      {/* Logo & Brand */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-teal-400 flex items-center justify-center shadow-lg">
            <Heart size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">HealthAssist</h1>
            <p className="text-xs text-indigo-300">AI Insurance Assistant</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewConversation}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 text-sm font-medium border border-white/10 hover:border-white/20"
        >
          <Plus size={18} />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold px-3 py-2">
          Recent Chats
        </p>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
              activeConversationId === conv.id
                ? 'bg-white/15 text-white shadow-sm'
                : 'text-indigo-200 hover:bg-white/5 hover:text-white'
            }`}
            onClick={() => onSelectConversation(conv.id)}
          >
            <MessageSquare size={15} className="shrink-0 opacity-60" />
            <span className="text-sm truncate flex-1">{conv.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Quick Help Topics */}
      <div className="p-3 border-t border-white/10">
        <p className="text-xs uppercase tracking-wider text-indigo-400 font-semibold px-3 py-2">
          Quick Topics
        </p>
        <div className="space-y-1">
          <QuickTopic icon={<Shield size={14} />} label="Medicare Basics" />
          <QuickTopic icon={<Heart size={14} />} label="Medicaid Eligibility" />
          <QuickTopic icon={<HelpCircle size={14} />} label="Insurance Terms" />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-indigo-400 text-center">
          Not a substitute for professional advice
        </p>
      </div>
    </div>
  );
}

function QuickTopic({ icon, label }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-indigo-300 hover:bg-white/5 hover:text-white cursor-pointer transition-all text-sm">
      {icon}
      {label}
    </div>
  );
}

export default Sidebar;

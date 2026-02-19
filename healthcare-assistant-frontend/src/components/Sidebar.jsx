import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Heart,
  Shield,
  HelpCircle,
  LogIn,
  LogOut,
  User,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}) {
  const { user, signIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      console.error('Sign-in failed:', error);
    } finally {
      setSigningIn(false);
    }
  };

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

      {/* User Profile / Sign In */}
      <div className="p-3 border-b border-white/10">
        {user ? (
          <div className="flex items-center gap-3 px-3 py-2">
            {user.pictureUrl ? (
              <img
                src={user.pictureUrl}
                alt={user.name}
                className="w-8 h-8 rounded-full border-2 border-indigo-400"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <User size={14} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-indigo-300 truncate">{user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-indigo-300 hover:text-white"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-200 text-sm font-medium border border-white/10 hover:border-white/20 disabled:opacity-50"
          >
            {signingIn ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>
        )}
        {!user && (
          <p className="text-xs text-indigo-400 text-center mt-2 px-2">
            Sign in to save your chat history
          </p>
        )}
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
          {user ? 'Your Chats' : 'Recent Chats'}
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


import React, { useState, useCallback, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import ContactPage from './components/ContactPage';
import ProfilePage from './components/ProfilePage';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Menu, X } from 'lucide-react';
import {
  getConversations,
  getConversation as fetchConversation,
  createConversation,
  addMessageToConversation,
  deleteConversation as apiDeleteConversation,
} from './services/api';

function AppContent() {
  const { user } = useAuth();
  const [view, setView] = useState('landing');
  const [sessionType, setSessionType] = useState('free-20'); // 'free-20' or 'paid-60'
  const [conversations, setConversations] = useState([
    { id: 'default', title: 'New Conversation', messages: [], createdAt: new Date() },
  ]);
  const [activeConversationId, setActiveConversationId] = useState('default');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  // Load conversations from server when user signs in
  useEffect(() => {
    if (user) {
      loadUserConversations();
    } else {
      // Reset to guest mode
      setConversations([
        { id: 'default', title: 'New Conversation', messages: [], createdAt: new Date() },
      ]);
      setActiveConversationId('default');
    }
  }, [user]);

  const loadUserConversations = async () => {
    try {
      setLoadingConversations(true);
      const serverConversations = await getConversations();

      if (serverConversations.length === 0) {
        // Create a new conversation on the server
        const newConv = await createConversation('New Conversation');
        setConversations([{
          id: newConv.id,
          title: newConv.title,
          messages: [],
          createdAt: newConv.createdAt,
          persisted: true,
        }]);
        setActiveConversationId(newConv.id);
      } else {
        // Map server conversations to local format
        const mapped = serverConversations.map((conv) => ({
          id: conv.id,
          title: conv.title,
          messages: [], // Lazy-load messages when selected
          createdAt: conv.createdAt,
          messageCount: conv.messageCount,
          persisted: true,
        }));
        setConversations(mapped);
        setActiveConversationId(mapped[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Lazy-load messages when a conversation is selected
  const handleSelectConversation = useCallback(async (convId) => {
    setActiveConversationId(convId);

    if (user) {
      const conv = conversations.find((c) => c.id === convId);
      if (conv && conv.persisted && conv.messages.length === 0 && conv.messageCount > 0) {
        try {
          const fullConv = await fetchConversation(convId);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId
                ? { ...c, messages: fullConv.messages.map(mapServerMessage) }
                : c
            )
          );
        } catch (error) {
          console.error('Failed to load conversation messages:', error);
        }
      }
    }
  }, [user, conversations]);

  const mapServerMessage = (msg) => ({
    id: `msg-${msg.id}`,
    role: msg.role,
    content: msg.content,
    contentType: msg.contentType,
    doctorSearchResult: msg.doctorSearchResult,
    timestamp: msg.timestamp,
  });

  const handleNewConversation = useCallback(async () => {
    if (user) {
      try {
        const newConv = await createConversation('New Conversation');
        const conv = {
          id: newConv.id,
          title: newConv.title,
          messages: [],
          createdAt: newConv.createdAt,
          persisted: true,
        };
        setConversations((prev) => [conv, ...prev]);
        setActiveConversationId(newConv.id);
      } catch (error) {
        console.error('Failed to create conversation:', error);
      }
    } else {
      // Guest mode: in-memory only
      const newId = `conv-${Date.now()}`;
      const newConv = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
      };
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newId);
    }
  }, [user]);

  const handleUpdateConversation = useCallback(
    async (conversationId, messages) => {
      // Update local state immediately
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            let title = conv.title;
            if (title === 'New Conversation' && messages.length > 0) {
              const firstUserMsg = messages.find((m) => m.role === 'user');
              if (firstUserMsg) {
                title =
                  firstUserMsg.content.substring(0, 50) +
                  (firstUserMsg.content.length > 50 ? '...' : '');
              }
            }
            return { ...conv, messages, title };
          }
          return conv;
        })
      );

      // Persist new messages to server if user is signed in
      if (user && conversationId) {
        const existingConv = conversations.find((c) => c.id === conversationId);
        const existingCount = existingConv?.messages?.length || 0;
        const newMessages = messages.slice(existingCount);

        for (const msg of newMessages) {
          try {
            await addMessageToConversation(conversationId, {
              role: msg.role,
              content: msg.content,
              contentType: msg.contentType || 'TEXT',
              doctorSearchResult: msg.doctorSearchResult || null,
            });
          } catch (error) {
            console.error('Failed to persist message:', error);
          }
        }
      }
    },
    [user, conversations]
  );

  const handleDeleteConversation = useCallback(
    async (conversationId) => {
      if (user) {
        try {
          await apiDeleteConversation(conversationId);
        } catch (error) {
          console.error('Failed to delete conversation:', error);
        }
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conversationId);
        if (filtered.length === 0) {
          if (user) {
            // Will trigger creation on server via handleNewConversation
            handleNewConversation();
            return prev; // Let the async handler update state
          }
          const newConv = {
            id: `conv-${Date.now()}`,
            title: 'New Conversation',
            messages: [],
            createdAt: new Date(),
          };
          setActiveConversationId(newConv.id);
          return [newConv];
        }
        if (activeConversationId === conversationId) {
          setActiveConversationId(filtered[0].id);
        }
        return filtered;
      });
    },
    [activeConversationId, user, handleNewConversation]
  );

  const navigate = (page) => {
    setView(page);
    window.scrollTo(0, 0);
  };

  // Chat view
  if (view === 'chat') {
    return (
      <div className="flex h-screen bg-gray-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <button
          onClick={() => navigate('landing')}
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          ← Back to Home
        </button>

        <div
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:relative lg:translate-x-0 z-40 transition-transform duration-300 ease-in-out`}
        >
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
          />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 flex flex-col min-w-0">
          {activeConversation && (
            <ChatInterface
              conversation={activeConversation}
              onUpdateMessages={(messages) =>
                handleUpdateConversation(activeConversation.id, messages)
              }
            />
          )}
        </main>
      </div>
    );
  }

  // Contact page view
  if (view === 'contact') {
    return (
      <ContactPage
        onBack={() => navigate('landing')}
        onOpenChat={() => navigate('chat')}
        user={user}
        sessionType={sessionType}
      />
    );
  }

  // Profile page view
  if (view === 'profile') {
    return (
      <ProfilePage
        onBack={() => navigate('landing')}
      />
    );
  }

  // Landing page view
  return (
    <LandingPage
      onOpenChat={() => navigate('chat')}
      onOpenContact={(type) => { setSessionType(type || 'free-20'); navigate('contact'); }}
      onOpenProfile={() => navigate('profile')}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


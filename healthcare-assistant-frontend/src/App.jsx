import React, { useState, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import ContactPage from './components/ContactPage';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Menu, X } from 'lucide-react';

function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'contact' | 'chat'
  const [conversations, setConversations] = useState([
    { id: 'default', title: 'New Conversation', messages: [], createdAt: new Date() },
  ]);
  const [activeConversationId, setActiveConversationId] = useState('default');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeConversation = conversations.find((c) => c.id === activeConversationId);

  const handleNewConversation = useCallback(() => {
    const newId = `conv-${Date.now()}`;
    const newConv = {
      id: newId,
      title: 'New Conversation',
      messages: [],
      createdAt: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newId);
  }, []);

  const handleUpdateConversation = useCallback((conversationId, messages) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          let title = conv.title;
          if (title === 'New Conversation' && messages.length > 0) {
            const firstUserMsg = messages.find((m) => m.role === 'user');
            if (firstUserMsg) {
              title = firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '');
            }
          }
          return { ...conv, messages, title };
        }
        return conv;
      })
    );
  }, []);

  const handleDeleteConversation = useCallback(
    (conversationId) => {
      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== conversationId);
        if (filtered.length === 0) {
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
    [activeConversationId]
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
            onSelectConversation={setActiveConversationId}
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
      />
    );
  }

  // Landing page view
  return (
    <LandingPage
      onOpenChat={() => navigate('chat')}
      onOpenContact={() => navigate('contact')}
    />
  );
}

export default App;

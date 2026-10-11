import React, { useState, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Menu, X, Loader2 } from 'lucide-react';
import { useLocation, navigate, legacyRedirect, Link } from './router';
import { BRAND } from './theme';
import SiteHeader from './components/layout/SiteHeader';
import SiteFooter from './components/layout/SiteFooter';
import HomePage from './components/home/HomePage';
import ChatLauncher from './components/chat/ChatLauncher';
import ChatDrawer from './components/chat/ChatDrawer';

// Everything except the home page is code-split so phones download less up front.
const TransitionFlow = lazy(() => import('./components/transition/TransitionFlow'));
const MoreWaysPage = lazy(() => import('./components/more/MoreWaysPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const ChatInterface = lazy(() => import('./components/ChatInterface'));
const Sidebar = lazy(() => import('./components/Sidebar'));
import {
  getConversations,
  getConversation as fetchConversation,
  createConversation,
  addMessageToConversation,
  deleteConversation as apiDeleteConversation,
} from './services/api';

// Conversations started from "Ask about my results" are never sent to
// /api/conversations: they stay in memory only (coverage-transition privacy).
const EPHEMERAL_PREFIX = 'ephemeral-';
const isEphemeral = (id) => String(id).startsWith(EPHEMERAL_PREFIX);

function AppContent() {
  const { user } = useAuth();
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
      if (user && conversationId && !isEphemeral(conversationId)) {
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
      if (user && !isEphemeral(conversationId)) {
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

  const { path, query, hash } = useLocation();
  const [chatOpen, setChatOpen] = useState(false);
  const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  // Old URLs: /transition and the anchors of the former single-page landing.
  useEffect(() => {
    const to = legacyRedirect(path, window.location.search, hash);
    if (to) navigate(to, { replace: true });
  }, [path, hash]);

  // On navigation: scroll to the anchor (or top) and move focus to the main content.
  useEffect(() => {
    document.title = PAGE_TITLES[path] || 'Zumanely';
    if (hash) {
      scrollToHash(hash);
    } else if (!firstRender.current) {
      window.scrollTo(0, 0);
      mainRef.current?.focus({ preventScroll: true });
    }
    firstRender.current = false;
  }, [path, hash]);

  const openChat = useCallback(() => setChatOpen(true), []);
  const closeChat = useCallback(() => setChatOpen(false), []);

  // "Ask about my results": opens the chat panel in place, with the results
  // summary as the first message of a conversation that is never saved.
  const handleAskAboutResults = useCallback((summary) => {
    const conv = {
      id: `${EPHEMERAL_PREFIX}${Date.now()}`,
      title: 'My coverage results',
      messages: [],
      createdAt: new Date(),
      ephemeral: true,
      initialPrompt: summary,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversationId(conv.id);
    setChatOpen(true);
  }, []);

  const openContact = useCallback((type) => navigate(type === 'paid-60' ? '/contact?type=paid-60' : '/contact'), []);
  const updateActive = useCallback(
    (messages) => activeConversation && handleUpdateConversation(activeConversation.id, messages),
    [activeConversation, handleUpdateConversation]
  );

  // Full-screen chat
  if (path === '/chat') {
    return (
      <div className="flex h-screen bg-gray-50">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Hide conversations' : 'Show conversations'}
          aria-expanded={sidebarOpen}
          className="fixed top-3 left-3 z-50 lg:hidden w-11 h-11 flex items-center justify-center bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        >
          {sidebarOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>

        <Link
          to="/"
          className="fixed top-3 right-3 z-50 inline-flex items-center min-h-[44px] px-4 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
        >
          ← Back to Home
        </Link>

        <Suspense fallback={<PageLoading />}>
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
              aria-hidden="true"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <main className="flex-1 flex flex-col min-w-0">
            {activeConversation && (
              <ChatInterface
                key={activeConversation.id}
                conversation={activeConversation}
                onUpdateMessages={updateActive}
              />
            )}
          </main>
        </Suspense>
      </div>
    );
  }

  let page;
  switch (path) {
    case '/':
      page = <HomePage paymentStatus={query.get('payment')} onOpenChat={openChat} onStickyCtaChange={setStickyCtaVisible} />;
      break;
    case '/compare':
    case '/transition':
      page = <TransitionFlow onBack={() => navigate('/')} onAskAboutResults={handleAskAboutResults} />;
      break;
    case '/more':
      page = <MoreWaysPage onOpenChat={openChat} onOpenContact={openContact} />;
      break;
    case '/contact':
      page = (
        <ContactPage
          onBack={() => navigate('/')}
          onOpenChat={openChat}
          user={user}
          sessionType={query.get('type') === 'paid-60' ? 'paid-60' : 'free-20'}
        />
      );
      break;
    case '/profile':
      page = <ProfilePage onBack={() => navigate('/')} />;
      break;
    default:
      page = <NotFound />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BRAND.bg }}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-3 focus:rounded-lg focus:bg-white focus:shadow-lg focus:font-semibold"
        style={{ color: BRAND.primary }}
      >
        Skip to main content
      </a>
      <SiteHeader onOpenChat={openChat} />
      <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<PageLoading />}>{page}</Suspense>
      </main>
      <SiteFooter />
      <ChatLauncher onOpen={openChat} raised={stickyCtaVisible} hidden={chatOpen} />
      <ChatDrawer
        open={chatOpen}
        onClose={closeChat}
        conversation={activeConversation}
        onUpdateMessages={updateActive}
        onNewConversation={handleNewConversation}
      />
    </div>
  );
}

const PAGE_TITLES = {
  '/': 'Lost your job? Keep your coverage. | Zumanely',
  '/compare': 'Compare your coverage options | Zumanely',
  '/transition': 'Compare your coverage options | Zumanely',
  '/chat': 'Ask Zume | Zumanely',
  '/more': 'More ways we help | Zumanely',
  '/contact': 'Talk to a person | Zumanely',
  '/profile': 'Your profile | Zumanely',
};

/** Scrolls to an in-page anchor, retrying briefly while a lazy page renders. */
function scrollToHash(hash, attempt = 0) {
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (el) {
    el.scrollIntoView({ block: 'start' });
    if (el.id !== 'main') return;
    el.focus?.({ preventScroll: true });
    return;
  }
  if (attempt < 20) setTimeout(() => scrollToHash(hash, attempt + 1), 50);
}

function PageLoading() {
  return (
    <div className="flex justify-center py-24">
      <Loader2 className="animate-spin text-gray-500" aria-label="Loading" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-2xl font-bold" style={{ color: BRAND.primary }}>We couldn’t find that page</h1>
      <p className="mt-3 text-slate-700">
        <Link to="/" className="font-semibold underline" style={{ color: BRAND.accent }}>Go to the home page</Link>
        {' '}or{' '}
        <Link to="/compare" className="font-semibold underline" style={{ color: BRAND.accent }}>compare your coverage options</Link>.
      </p>
    </div>
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


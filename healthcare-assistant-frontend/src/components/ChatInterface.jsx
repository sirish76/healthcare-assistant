import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Sparkles, Stethoscope, FileText, DollarSign, Users, Scale } from 'lucide-react';
import MessageBubble from './MessageBubble';
import DoctorResults from './DoctorResults';
import { sendMessage } from '../services/api';

// Starter questions for people who just lost (or are about to lose) job-based coverage.
const SUGGESTED_QUESTIONS = [
  {
    icon: <Scale size={18} />,
    label: 'COBRA or a Marketplace plan?',
    message: "I'm losing my job-based health insurance. How do I decide between COBRA and a Marketplace plan?",
  },
  {
    icon: <DollarSign size={18} />,
    label: 'What counts as income?',
    message: 'After a job loss, what counts as income for Marketplace subsidies? Do severance and unemployment count?',
  },
  {
    icon: <Users size={18} />,
    label: 'Can my kids get CHIP?',
    message: 'I just lost my job. Could my children qualify for Medicaid or CHIP?',
  },
  {
    icon: <Stethoscope size={18} />,
    label: 'Find a doctor',
    message: 'I need to find a primary care doctor in my area.',
  },
];

// Helper to get insurance plan from localStorage (never from server)
const getLocalInsurancePlan = () => {
  try {
    const saved = localStorage.getItem('healthassist_insurance_plan');
    if (saved) {
      const plan = JSON.parse(saved);
      if (plan.carrier && plan.planName) {
        return `${plan.carrier} — ${plan.planName}`;
      }
      if (plan.carrier) return plan.carrier;
    }
  } catch (e) {}
  return null;
};

function ChatInterface({ conversation, onUpdateMessages, compact = false }) {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const messages = conversation.messages || [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  const handleSend = async (messageText = null) => {
    const text = (messageText || inputValue).trim();
    if (!text || isLoading) return;

    setInputValue('');

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    onUpdateMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Prepend insurance plan context if available (from localStorage only)
      const insurancePlan = getLocalInsurancePlan();
      let messageToSend = text;
      if (insurancePlan && messages.length === 0 && !conversation.ephemeral) {
        // Only add context on first message of conversation
        messageToSend = `[User's insurance plan: ${insurancePlan}]\n\n${text}`;
      }

      const response = await sendMessage(messageToSend, conversationHistory, sessionId);

      if (response.sessionId) {
        setSessionId(response.sessionId);
      }

      const assistantMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: response.message,
        contentType: response.contentType,
        doctorSearchResult: response.doctorSearchResult,
        timestamp: new Date().toISOString(),
      };

      onUpdateMessages([...updatedMessages, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content:
          "I'm having trouble connecting to the server. Please make sure the backend is running on port 8080 and try again. If you need immediate help, call Medicare at 1-800-MEDICARE.",
        contentType: 'ERROR',
        timestamp: new Date().toISOString(),
      };

      onUpdateMessages([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Conversations opened from "Ask about my results" send their summary once.
  const sentInitialPrompt = useRef({});
  useEffect(() => {
    const { id, initialPrompt } = conversation;
    if (initialPrompt && messages.length === 0 && !sentInitialPrompt.current[id]) {
      sentInitialPrompt.current[id] = true;
      handleSend(initialPrompt);
    }
  }, [conversation.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isNewConversation = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header (the drawer supplies its own in compact mode) */}
      {!compact && <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 pl-10 lg:pl-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-800">Zume</h1>
            <p className="text-xs text-gray-600">AI assistant for coverage questions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online
          </span>
        </div>
      </header>}

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className={`flex-1 overflow-y-auto ${compact ? 'px-4 py-4' : 'px-4 md:px-6 lg:px-8 py-6'}`}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
      >
        {isNewConversation && !conversation.initialPrompt ? (
          <WelcomeScreen compact={compact} onSuggestionClick={(msg) => handleSend(msg)} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-1">
            {messages.map((message) => (
              <div key={message.id}>
                <MessageBubble message={message} />
                {message.contentType === 'DOCTOR_RESULTS' && message.doctorSearchResult && (
                  <DoctorResults results={message.doctorSearchResult} />
                )}
              </div>
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`${compact ? 'px-3 py-3' : 'px-4 md:px-6 lg:px-8 py-4'} bg-white border-t border-gray-100`}>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600/30 transition-all p-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your question"
              aria-label="Your question"
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none focus-visible:outline-none text-gray-700 placeholder:text-gray-500 text-base px-3 py-2 max-h-32"
              style={{ minHeight: '40px' }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
              className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white hover:from-indigo-700 hover:to-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <p className="text-center text-xs text-gray-600 mt-2">
            Zume is an AI assistant and can make mistakes. General information only, not advice. Confirm with your plan or the official site.
          </p>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onSuggestionClick, compact }) {
  const insurancePlan = getLocalInsurancePlan();

  const dynamicSuggestions = [
    ...SUGGESTED_QUESTIONS,
  ];

  // If user has an insurance plan saved, add a personalized suggestion
  if (insurancePlan) {
    dynamicSuggestions.splice(2, 0, {
      icon: <FileText size={18} />,
      label: `My ${insurancePlan.split(' — ')[0]} Plan`,
      message: `I have ${insurancePlan}. Can you summarize what's covered, my deductible, copays, and out-of-pocket max?`,
    });
  }

  // Limit to 4 suggestions
  const suggestions = dynamicSuggestions.slice(0, 4);

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center justify-center h-full text-center px-2">
      {!compact && (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-teal-500 flex items-center justify-center shadow-xl mb-6">
          <Sparkles size={30} className="text-white" aria-hidden="true" />
        </div>
      )}
      <h2 className={`${compact ? 'text-lg' : 'text-2xl'} font-bold text-gray-800 mb-2`}>
        Questions about coverage after a job loss?
      </h2>
      <p className={`text-gray-600 ${compact ? 'mb-5 text-sm' : 'mb-8'} max-w-md`}>
        Ask in plain words about COBRA, Marketplace plans, Medicaid, or finding a doctor.
      </p>

      <div className={`grid grid-cols-1 ${compact ? '' : 'sm:grid-cols-2'} gap-3 w-full max-w-lg`}>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onSuggestionClick(suggestion.message)}
            className="group flex items-center gap-3 min-h-[48px] px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 transition-all duration-200 text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 transition-colors">
              {suggestion.icon}
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
              {suggestion.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center shrink-0">
        <Sparkles size={14} className="text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm border border-gray-100">
        <div className="flex gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-indigo-400" />
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;

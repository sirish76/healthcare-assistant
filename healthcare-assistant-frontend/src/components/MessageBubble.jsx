import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Sparkles, AlertCircle } from 'lucide-react';

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isError = message.contentType === 'ERROR';

  return (
    <div
      className={`flex items-start gap-3 py-3 animate-fade-in ${
        isUser ? 'flex-row-reverse' : ''
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
          isUser
            ? 'bg-gradient-to-br from-slate-600 to-slate-700'
            : isError
            ? 'bg-gradient-to-br from-red-500 to-red-600'
            : 'bg-gradient-to-br from-indigo-500 to-teal-500'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : isError ? (
          <AlertCircle size={14} className="text-white" />
        ) : (
          <Sparkles size={14} className="text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`max-w-[80%] rounded-2xl px-5 py-3.5 shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-tr-sm'
            : isError
            ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
            : 'bg-white text-gray-700 border border-gray-100 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-content text-sm leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        <p
          className={`text-xs mt-2 ${
            isUser ? 'text-indigo-200' : isError ? 'text-red-400' : 'text-gray-400'
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default MessageBubble;

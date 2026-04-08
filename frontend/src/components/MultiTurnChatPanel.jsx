import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Send, Bot, User, Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * MultiTurnChatPanel Component
 * 
 * A conversational AI interface for multi-turn dialogue.
 * Supports streaming responses, conversation history, and context management.
 * 
 * @param {Object} props
 * @param {string} props.title - Chat panel title
 * @param {Function} props.onSendMessage - Callback when user sends message
 * @param {boolean} props.isStreaming - Whether AI is currently streaming response
 * @param {string} props.activeTheme - Current theme ('light' | 'dark')
 */
export default function MultiTurnChatPanel({
  title = 'AI Assistant',
  onSendMessage,
  isStreaming = false,
  activeTheme = 'dark',
}) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you with content creation, analysis, and optimization. What would you like to discuss?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef(null);

  const isDark = activeTheme === 'dark';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Call parent handler
    onSendMessage?.(inputValue);

    // Simulate assistant response (in real app, this comes from API)
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: 'I\'m processing your request. This is a placeholder response - in production, this would stream from the LLM.',
      timestamp: new Date(),
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Conversation cleared. How can I help you today?',
        timestamp: new Date(),
      },
    ]);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  return (
    <Card className={`overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white'}`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b cursor-pointer ${
          isDark ? 'border-slate-800' : 'border-gray-200'
        }`}
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Multi-turn conversation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              clearConversation();
            }}
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Messages */}
      {isExpanded && (
        <>
          <div className={`h-80 overflow-y-auto p-4 space-y-4 ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-indigo-500'
                      : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-indigo-500 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-100'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <span
                    className={`text-xs mt-1 block ${
                      message.role === 'user'
                        ? 'text-indigo-200'
                        : isDark
                        ? 'text-slate-500'
                        : 'text-gray-400'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}
            {isStreaming && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div
                  className={`p-3 rounded-2xl ${
                    isDark ? 'bg-slate-800' : 'bg-white'
                  }`}
                >
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className={`p-4 border-t ${
              isDark ? 'border-slate-800 bg-slate-900' : 'border-gray-200 bg-white'
            }`}
          >
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isStreaming}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            <p
              className={`text-xs mt-2 text-center ${
                isDark ? 'text-slate-500' : 'text-gray-400'
              }`}
            >
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </>
      )}
    </Card>
  );
}

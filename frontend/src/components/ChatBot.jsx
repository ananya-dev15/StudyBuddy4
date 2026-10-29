import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Lottie from "lottie-react";
import chatAnimation from "../assets/chatAnimation.json";
import { useAppContext } from "../context/AppContext";
import ThemeToggle from "./ThemeToggle";
import Navbar from "./Navbar";
import PageIntroCard from "./PageIntroCard";
import focusCompanionIcon from "../assets/icons/focus companion.png";

function renderInlineFormatting(text, isDark) {
  if (!text) return null;
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-purple-900 dark:text-purple-200">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className={`px-1.5 py-0.5 rounded font-mono text-[11px] ${
            isDark ? "bg-purple-900/40 text-purple-300" : "bg-purple-100 text-purple-800"
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function parseMessageSegments(content) {
  if (!content) return [];
  const segments = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: content.substring(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      language: match[1] || "code",
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      content: content.substring(lastIndex),
    });
  }

  return segments;
}

function CodeSnippet({ code, language, isDark }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
  };

  return (
    <div className="my-2 rounded-xl overflow-hidden border border-purple-500/30 text-xs font-mono shadow-md text-left">
      <div className="flex justify-between items-center px-3 py-1 bg-slate-900 text-slate-300 text-[10px] border-b border-slate-700/60">
        <span className="uppercase font-semibold tracking-wider text-purple-400">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="hover:text-white transition-colors cursor-pointer text-[10px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded"
          title="Copy code to clipboard"
        >
          {copied ? "✓ Copied" : "📋 Copy"}
        </button>
      </div>
      <pre className="p-3 bg-slate-950 text-emerald-400 overflow-x-auto leading-relaxed select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedMessage({ text, isDark }) {
  if (!text) return null;
  const segments = parseMessageSegments(text);

  return (
    <div className="space-y-1.5 break-words">
      {segments.map((seg, i) => {
        if (seg.type === "code") {
          return <CodeSnippet key={i} code={seg.code} language={seg.language} isDark={isDark} />;
        }
        return (
          <div key={i} className="whitespace-pre-wrap leading-relaxed">
            {renderInlineFormatting(seg.content, isDark)}
          </div>
        );
      })}
    </div>
  );
}

export default function ChatBot({ standalone = false }) {
  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    chatLoading,
    isVoiceListening,
    isSpeaking,
    stopSpeakingText,
    clearChatHistory,
    sendMessageToChatbot,
    toggleVoiceRecognition,
    activeVideoContext,
    speakText,
    theme,
  } = useAppContext();

  const isDark = theme === "dark";

  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, isChatOpen, chatLoading]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessageToChatbot(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleVoiceClick = () => {
    toggleVoiceRecognition((transcript) => {
      if (transcript && transcript.trim()) {
        sendMessageToChatbot(transcript.trim());
      }
    });
  };

  // If standalone page like /chatbot
  if (standalone) {
    return (
      <div className={`min-h-screen relative z-10 font-sans transition-colors duration-500 ${isDark ? "text-white" : "text-slate-800"}`}>
        {/* Unified Navbar with ThemeToggle */}
        <Navbar />

        <div className="max-w-4xl mx-auto p-6 md:p-10 pt-6">
          {/* Page Introduction Card */}
          <PageIntroCard className="mb-6" />

          <div className={`backdrop-blur-2xl rounded-3xl border shadow-2xl flex flex-col h-[650px] overflow-hidden ${
          isDark
            ? "bg-slate-900/90 border-purple-500/25 text-white"
            : "bg-[#fdfbf7] border-[#eee8de] shadow-[0_15px_40px_rgba(0,0,0,0.04)] text-slate-800"
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white p-4 font-bold text-xl flex justify-between items-center shadow-md">
            <div className="flex items-center gap-2">
              <img src={focusCompanionIcon} alt="AI Assistant" className="w-6 h-6 object-contain inline-block" />
              <span>StudyBuddy AI Assistant</span>
              {isSpeaking && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeakingText();
                  }}
                  className="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse shadow transition-all cursor-pointer"
                  title="Stop Voice Speech"
                >
                  ⏹️ Stop Voice
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeVideoContext && (
                <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium truncate max-w-[200px]">
                  📺 Video: {activeVideoContext.videoTitle || activeVideoContext.videoId}
                </span>
              )}
              <button
                type="button"
                onClick={() => clearChatHistory()}
                className="bg-white/15 hover:bg-white/25 active:scale-95 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Start a fresh conversation (resets context memory)"
              >
                🔄 New Topic
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDark ? "bg-slate-950/60" : "bg-slate-50/70"}`}>
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  m.sender === "bot"
                    ? isDark
                      ? "bg-slate-800/90 text-purple-100 self-start border border-purple-500/20"
                      : "bg-purple-50 text-slate-800 self-start border border-purple-200/70 shadow-sm"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white self-end ml-auto shadow-md"
                }`}
              >
                <FormattedMessage text={m.text} isDark={isDark} />
                {m.sender === "bot" && !isSpeaking && (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => speakText(m.text)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer"
                    >
                      🔊 Listen
                    </button>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-3 rounded-2xl text-sm self-start animate-pulse">
                🤖 StudyBuddy AI is analyzing and generating response...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestions */}
          <div className={`flex flex-wrap gap-2 p-3 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white/80 border-slate-200"
          }`}>
            {["Reminders", "Assignments", "Video Tracker", "Streaks", "Analytics"].map((btn, idx) => (
              <button
                key={idx}
                onClick={() => sendMessageToChatbot(btn)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  isDark
                    ? "bg-slate-800 text-purple-200 hover:bg-slate-700 border border-purple-500/20"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                }`}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className={`flex items-center gap-2 p-3 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}>
            <input
              type="text"
              className={`flex-1 p-3 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
              }`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your study doubt or request here..."
            />
            <button
              onClick={handleVoiceClick}
              type="button"
              className={`p-3 rounded-xl border transition-all ${
                isVoiceListening
                  ? "bg-red-500 text-white animate-bounce border-red-600"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
              }`}
              title="Ask by Voice"
            >
              🎤
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold transition-all text-sm shadow-md"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Floating Chat Widget Across Application
  return (
    <div className="fixed bottom-5 right-5 z-[10000] flex flex-col items-end pointer-events-auto">
      {isChatOpen && (
        <div className={`mb-3 w-[360px] sm:w-[440px] h-[520px] shadow-2xl rounded-3xl overflow-hidden flex flex-col border backdrop-blur-2xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
          isDark
            ? "bg-slate-900/95 border-purple-500/30 text-white shadow-purple-950/40"
            : "bg-[#fdfbf7] border-[#eee8de] text-slate-800 shadow-[0_15px_40px_rgba(0,0,0,0.08)]"
        }`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 via-pink-600 to-indigo-700 text-white p-3.5 font-bold flex justify-between items-center text-sm shadow-md">
            <div className="flex items-center gap-2">
              <img src={focusCompanionIcon} alt="AI Assistant" className="w-5 h-5 object-contain inline-block" />
              <span>StudyBuddy AI</span>
            </div>
            <div className="flex items-center gap-2">
              {isSpeaking && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeakingText();
                  }}
                  className="bg-red-500 hover:bg-red-600 active:scale-95 text-white px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 animate-pulse shadow transition-all cursor-pointer"
                  title="Stop Assistant Voice"
                >
                  ⏹️ Stop Voice
                </button>
              )}
              <button
                type="button"
                onClick={() => clearChatHistory()}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                title="Start a fresh conversation (resets context memory)"
              >
                🔄
              </button>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Context Notice if in Video Tracker */}
          {activeVideoContext?.videoTitle && (
            <div className={`px-3 py-1.5 text-[11px] font-semibold border-b truncate ${
              isDark ? "bg-slate-800/80 text-purple-300 border-purple-500/20" : "bg-purple-50 text-purple-800 border-purple-100"
            }`}>
              📺 Active Context: {activeVideoContext.videoTitle}
            </div>
          )}

          {/* Messages */}
          <div className={`flex-1 overflow-y-auto p-3 space-y-2.5 ${isDark ? "bg-slate-950/60" : "bg-slate-50/70"}`}>
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  m.sender === "bot"
                    ? isDark
                      ? "bg-slate-800/90 text-purple-100 self-start rounded-bl-none border border-purple-500/20"
                      : "bg-purple-50 text-slate-800 self-start rounded-bl-none border border-purple-200/60 shadow-sm"
                    : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white self-end rounded-br-none ml-auto shadow-sm"
                }`}
              >
                <FormattedMessage text={m.text} isDark={isDark} />
                {m.sender === "bot" && !isSpeaking && (
                  <div className="mt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => speakText(m.text)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-0.5 cursor-pointer"
                    >
                      🔊 Listen
                    </button>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="bg-purple-500/10 border border-purple-500/20 text-purple-400 p-2.5 rounded-2xl text-xs self-start animate-pulse">
                🤖 StudyBuddy AI is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Predefined suggestion buttons */}
          <div className={`flex flex-wrap gap-1.5 p-2.5 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}>
            {["Reminders", "Assignments", "Video Tracker", "Streaks", "Analytics"].map(
              (btn, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessageToChatbot(btn)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    isDark
                      ? "bg-slate-800 text-purple-200 hover:bg-slate-700 border border-purple-500/20"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-100"
                  }`}
                >
                  {btn}
                </button>
              )
            )}
          </div>

          {/* Listening Indicator Banner */}
          {isVoiceListening && (
            <div className="bg-red-500/15 border border-red-500/40 text-red-600 dark:text-red-400 px-3 py-1.5 rounded-xl text-xs font-medium flex items-center justify-between animate-pulse mx-2.5 my-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>🎙️ Listening... Speak now</span>
              </div>
              <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded-full font-mono">Press V to send</span>
            </div>
          )}

          {/* Input field */}
          <div className={`flex items-center gap-2 p-2.5 border-t ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <input
              type="text"
              className={`flex-1 p-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                  : "bg-white border-slate-300 text-slate-800 placeholder-slate-400"
              }`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isVoiceListening ? "Listening... Speak or press V" : "Ask a doubt or question... (Press V to speak)"}
            />
            <button
              onClick={handleVoiceClick}
              type="button"
              className={`p-2 rounded-xl border text-sm transition-all ${
                isVoiceListening
                  ? "bg-red-500 text-white animate-bounce border-red-600"
                  : isDark
                  ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
              title={isVoiceListening ? "Listening... Click to send (or press V)" : "Ask by Voice (or press V)"}
            >
              🎤
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Floating Chat Icon Toggle */}
      {!isChatOpen && (
        <div
          onClick={() => setIsChatOpen(true)}
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95 drop-shadow-xl"
          title="Open StudyBuddy AI Chatbot"
        >
          <Lottie
            animationData={chatAnimation}
            loop={true}
            className="w-28 h-[115px]"
          />
        </div>
      )}
    </div>
  );
}

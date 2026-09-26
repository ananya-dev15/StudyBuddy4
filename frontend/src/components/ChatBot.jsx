import React, { useState, useRef, useEffect } from "react";
import Lottie from "lottie-react";
import chatAnimation from "../assets/chatAnimation.json";
import { useAppContext } from "../context/AppContext";

export default function ChatBot({ standalone = false }) {
  const {
    isChatOpen,
    setIsChatOpen,
    chatMessages,
    chatLoading,
    isVoiceListening,
    sendMessageToChatbot,
    startVoiceRecognition,
    activeVideoContext,
    speakText,
  } = useAppContext();

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
    if (isVoiceListening) return;
    startVoiceRecognition((transcript) => {
      if (transcript && transcript.trim()) {
        sendMessageToChatbot(transcript.trim());
      }
    });
  };

  // If standalone page like /chatbot
  if (standalone) {
    return (
      <div className="max-w-4xl mx-auto my-6 p-4 bg-white shadow-xl rounded-2xl border border-gray-100 flex flex-col h-[650px]">
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 font-bold text-xl rounded-t-xl flex justify-between items-center">
          <span>📚 StudyBuddy AI Assistant</span>
          {activeVideoContext && (
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
              📺 Video: {activeVideoContext.videoTitle || activeVideoContext.videoId}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {chatMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                m.sender === "bot"
                  ? "bg-indigo-100 text-gray-900 self-start rounded-bl-none border border-indigo-200"
                  : "bg-indigo-700 text-white self-end rounded-br-none ml-auto shadow-md"
              }`}
            >
              <div>{m.text}</div>
              {m.sender === "bot" && (
                <div className="mt-1 flex justify-end">
                  <button
                    onClick={() => speakText(m.text)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium flex items-center gap-1"
                    title="Listen to response"
                  >
                    🔊 Listen
                  </button>
                </div>
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-3 rounded-2xl text-sm self-start animate-pulse">
              🤖 StudyBuddy AI is thinking...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap gap-2 p-3 border-t border-gray-100 bg-white">
          {["Reminders", "Assignments", "Video Tracker", "Streaks", "Analytics"].map((btn, idx) => (
            <button
              key={idx}
              onClick={() => sendMessageToChatbot(btn)}
              className="bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold transition-all"
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2 p-3 border-t border-gray-100 bg-white rounded-b-xl">
          <input
            type="text"
            className="flex-1 p-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your study doubt here..."
          />
          <button
            onClick={handleVoiceClick}
            type="button"
            className={`p-2.5 rounded-xl border transition-all ${
              isVoiceListening
                ? "bg-red-500 text-white animate-bounce border-red-600"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300"
            }`}
            title="Ask by Voice"
          >
            🎤
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-medium transition-colors text-sm"
          >
            Send
          </button>
        </div>
      </div>
    );
  }

  // Floating Chat Widget Across Application
  return (
    <div className="fixed bottom-5 right-5 z-[10000] flex flex-col items-end pointer-events-auto">
      {isChatOpen && (
        <div className="mb-3 w-[360px] sm:w-[440px] h-[520px] bg-white shadow-2xl rounded-2xl overflow-hidden flex flex-col border border-indigo-100 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-3.5 font-semibold flex justify-between items-center text-base rounded-t-2xl shadow-md">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <span>StudyBuddy AI</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center font-bold text-sm transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Context Notice if in Video Tracker */}
          {activeVideoContext?.videoTitle && (
            <div className="bg-indigo-50 px-3 py-1.5 text-[11px] text-indigo-800 font-medium border-b border-indigo-100 truncate">
              📺 Active Context: {activeVideoContext.videoTitle}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-slate-50">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                  m.sender === "bot"
                    ? "bg-indigo-100 text-gray-900 self-start rounded-bl-none border border-indigo-200"
                    : "bg-indigo-700 text-white self-end rounded-br-none ml-auto shadow-sm"
                }`}
              >
                <div>{m.text}</div>
                {m.sender === "bot" && (
                  <div className="mt-1 flex justify-end">
                    <button
                      onClick={() => speakText(m.text)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 transition-colors font-medium flex items-center gap-0.5"
                      title="Replay Spoken Answer"
                    >
                      🔊 Listen
                    </button>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-2.5 rounded-2xl text-xs self-start animate-pulse">
                🤖 StudyBuddy AI is thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Predefined suggestion buttons */}
          <div className="flex flex-wrap gap-1.5 p-2.5 border-t border-gray-100 bg-white">
            {["Reminders", "Assignments", "Video Tracker", "Streaks", "Analytics"].map(
              (btn, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessageToChatbot(btn)}
                  className="bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                >
                  {btn}
                </button>
              )
            )}
          </div>

          {/* Input field */}
          <div className="flex items-center gap-2 p-2.5 border-t border-gray-100 bg-white">
            <input
              type="text"
              className="flex-1 p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a doubt or question..."
            />
            <button
              onClick={handleVoiceClick}
              type="button"
              className={`p-2 rounded-xl border text-sm transition-all ${
                isVoiceListening
                  ? "bg-red-500 text-white animate-bounce border-red-600"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
              }`}
              title="Ask by Voice"
            >
              🎤
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
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
          className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
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

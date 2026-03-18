import { useEffect, useRef, useState } from "react";
import { Bot, SendHorizontal, Trash2, X, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import axiosInstance from "../../api/axios";

const SUGGESTIONS = [
  "Show platform summary",
  "How many active users?",
  "What is the total revenue?",
  "Show subscription breakdown",
  "Most used templates",
];

const INITIAL_MSG = {
  from: "bot",
  text: "👋 Hello Admin! I'm your UpToSkills Admin Assistant.\nAsk me anything about the platform — users, revenue, analytics, and more.",
};

export default function AdminChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([INITIAL_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (showDeleteModal) return;
      if (open && containerRef.current && btnRef.current &&
        !containerRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, showDeleteModal]);

  async function sendMessage(customText) {
    const text = customText || input.trim();
    if (!text) return;

    setMessages(prev => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/api/chatbot/admin-chat", {
        message: text,
        prevMsg: messages,
      });

      const reply = res.data;
      setMessages(prev => [...prev, { from: "bot", text: "" }]);

      let idx = 0;
      const interval = setInterval(() => {
        idx += 1;
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1].text = reply.text.slice(0, idx);
          return msgs;
        });
        if (idx >= reply.text.length) clearInterval(interval);
      }, 15);

      if (reply.mode === "navigation" && reply.path) {
        setTimeout(() => { setOpen(false); navigate(reply.path); }, 1200);
      }
    } catch {
      setMessages(prev => [...prev, { from: "bot", text: "Something went wrong. Please try again." }]);
    }

    setLoading(false);
  }

  function clearChat() {
    setMessages([INITIAL_MSG]);
    setShowDeleteModal(false);
  }

  return (
    <>
      {/* Chat Window */}
      <div
        ref={containerRef}
        className="fixed right-6 bottom-20 w-[370px] h-[540px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl transition-all duration-400 ease-in-out z-[9999]"
        style={{ transform: open ? "translateX(0)" : "translateX(130%)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">Admin AI Assistant</p>
              <p className="text-indigo-200 text-[10px] mt-0.5">Live platform data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={messages.length <= 1}
              className="text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition disabled:opacity-30"
              title="Clear chat"
            >
              <Trash2 size={14} />
            </button>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1.5 rounded-lg transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.from === "user" ? "justify-end" : "items-start"}`}>
              {m.from === "bot" && (
                <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0 mt-1">
                  <Bot size={14} className="text-indigo-600" />
                </div>
              )}
              {m.from === "user" ? (
                <div className="max-w-[240px] text-sm px-3.5 py-2.5 bg-indigo-600 text-white rounded-2xl rounded-tr-none">
                  {m.text}
                </div>
              ) : (
                <div className="text-sm px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-none max-w-full">
                  <ReactMarkdown
                    components={{
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-2">
                          <table className="text-xs border-collapse w-full">{children}</table>
                        </div>
                      ),
                      th: ({ children }) => <th className="border border-slate-200 px-2 py-1 bg-slate-100 font-semibold text-left">{children}</th>,
                      td: ({ children }) => <td className="border border-slate-200 px-2 py-1">{children}</td>,
                      h3: ({ children }) => <h3 className="font-bold text-slate-800 mt-2 mb-1">{children}</h3>,
                      p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-700">{children}</p>,
                      li: ({ children }) => <li className="mb-1 text-slate-700">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                      a: ({ href, children }) => (
                        <button onClick={() => { setOpen(false); navigate(href); }}
                          className="text-indigo-600 font-medium hover:underline">
                          {children}
                        </button>
                      ),
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="mt-1">
              <p className="text-xs text-slate-400 mb-2 font-medium">Quick questions</p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-full border border-indigo-100 transition">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
                <Bot size={14} className="text-indigo-600" />
              </div>
              <div className="flex items-center gap-0.5 px-3 py-2 bg-slate-50 rounded-2xl">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:240ms]" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-slate-100 bg-white rounded-b-2xl">
          <input
            ref={inputRef}
            value={input}
            className="flex-1 px-3 py-2 bg-slate-100 text-sm rounded-xl outline-none border border-transparent focus:border-indigo-300 transition"
            placeholder="Ask about users, revenue, analytics..."
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl transition disabled:opacity-40"
            disabled={loading || !input.trim()}
            onClick={() => sendMessage()}
          >
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Floating Button */}
      <button
        ref={btnRef}
        onClick={() => setOpen(prev => !prev)}
        className="fixed right-6 bottom-6 z-50 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-lg transition flex items-center gap-2"
        title="Admin AI Assistant"
      >
        {open ? <ChevronDown size={20} /> : <Bot size={20} />}
      </button>

      {/* Clear Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Clear Conversation?</h3>
            <p className="text-sm text-slate-500 mb-5">All messages will be removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                Cancel
              </button>
              <button onClick={clearChat}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

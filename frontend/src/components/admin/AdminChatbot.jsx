import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Trash2, X, ChevronDown, ShieldCheck, User, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import axiosInstance from "../../api/axios";
import chatbotIcon from "../../assets/chatbot_image.png";

const ADMIN_SUGGESTIONS = [
  "Show platform summary",
  "How many active users?",
  "What is the total revenue?",
  "Show subscription breakdown",
  "Most used templates",
];

const USER_SUGGESTIONS = [
  "How can I improve my resume?",
  "What is ATS score?",
  "Steps to build a resume",
  "Open resume builder",
];

const ADMIN_INITIAL = {
  from: "bot",
  text: "👋 Hello Admin! I'm your UpToSkills Admin Assistant.\nAsk me anything about the platform — users, revenue, analytics, and more.",
};

const USER_INITIAL = {
  from: "bot",
  text: "Hi! I'm the UpToSkills AI Resume Assistant.\nHow can I help you today?",
};

export default function AdminChatbot() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("admin");
  const [adminMessages, setAdminMessages] = useState([ADMIN_INITIAL]);
  const [userMessages, setUserMessages] = useState([USER_INITIAL]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const messagesRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const btnRef = useRef(null);

  const isAdmin = mode === "admin";
  const messages = isAdmin ? adminMessages : userMessages;
  const setMessages = isAdmin ? setAdminMessages : setUserMessages;
  const suggestions = isAdmin ? ADMIN_SUGGESTIONS : USER_SUGGESTIONS;
  const initialMsg = isAdmin ? ADMIN_INITIAL : USER_INITIAL;

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, mode]);

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

    const lower = text.toLowerCase();

    // Admin switch — check FIRST before user check
    if (lower.includes("switch to admin") || lower.includes("admin mode") || lower.includes("admin dashboard") || lower.includes("admin dashbord") || lower.includes("go to admin") || lower.includes("super admin")) {
      setInput("");
      setMode("admin");
      setAdminMessages(prev => [...prev,
        { from: "user", text },
        { from: "bot", text: "✅ Switched to Admin mode! Taking you to the Admin Dashboard." }
      ]);
      setTimeout(() => { setOpen(false); navigate("/admin"); }, 1000);
      return;
    }

    // User switch
    if (lower.includes("switch to user") || lower.includes("user mode") || lower.includes("user dashboard") || lower.includes("go to user")) {
      setInput("");
      setMode("user");
      setUserMessages(prev => [...prev,
        { from: "user", text },
        { from: "bot", text: "✅ Switched to User mode! Taking you to the User Dashboard." }
      ]);
      setTimeout(() => { setOpen(false); navigate("/user/dashboard"); }, 1000);
      return;
    }

    setMessages(prev => [...prev, { from: "user", text }]);
    setInput("");
    setLoading(true);

    try {
      const endpoint = isAdmin ? "/api/chatbot/admin-chat" : "/api/chatbot/chat";
      const payload = isAdmin
        ? { message: text, prevMsg: messages }
        : { message: text, prevMsg: messages, isLoggedIn: true };

      const res = await axiosInstance.post(endpoint, payload);
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
    setMessages([initialMsg]);
    setShowDeleteModal(false);
  }

  return (
    <>
      {/* Chat Window */}
      <div
        ref={containerRef}
        className="fixed right-6 bottom-20 w-[370px] h-[560px] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl transition-all duration-300 ease-in-out z-[9999]"
        style={{ transform: open ? "translateX(0)" : "translateX(130%)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      >
        {/* Header — always orange */}
        <div className="flex justify-between items-center px-4 py-3 rounded-t-2xl bg-gradient-to-r from-orange-500 to-orange-600">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20">
              <img src={chatbotIcon} alt="AI" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-none">
                {isAdmin ? "Admin AI Assistant" : "AI Resume Assistant"}
              </p>
              <p className="text-orange-100 text-[10px] mt-0.5">
                {isAdmin ? "Live platform data" : "Powered by UpToSkills AI"}
              </p>
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

        {/* Mode Toggle */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => setMode("admin")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${isAdmin ? "text-orange-600 border-b-2 border-orange-500 bg-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            <ShieldCheck size={13} /> Admin
          </button>
          <button
            onClick={() => setMode("user")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition ${!isAdmin ? "text-orange-600 border-b-2 border-orange-500 bg-white" : "text-slate-400 hover:text-slate-600"}`}
          >
            <User size={13} /> User
          </button>
        </div>

        {/* Messages */}
        <div ref={messagesRef} className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto scrollbar-hide">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.from === "user" ? "justify-end" : "items-start"}`}>
              {m.from === "bot" && (
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1">
                  <img src={chatbotIcon} alt="bot" className="w-full h-full object-cover" />
                </div>
              )}
              {m.from === "user" ? (
                <div className="max-w-[240px] text-sm px-3.5 py-2.5 rounded-2xl rounded-tr-none text-white bg-orange-500">
                  {m.text}
                </div>
              ) : (
                <div className="text-sm px-3.5 py-2.5 bg-white border border-slate-100 rounded-2xl rounded-tl-none max-w-full shadow-sm">
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
                          className="text-orange-600 font-medium hover:underline">
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
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s)}
                    className="px-2.5 py-1 text-xs rounded-full border transition bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-100">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-2 items-center">
              <div className="w-7 h-7 rounded-full overflow-hidden">
                <img src={chatbotIcon} alt="bot" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-0.5 px-3 py-2 bg-slate-50 rounded-2xl">
                <span className="h-1.5 w-1.5 rounded-full animate-bounce bg-orange-400" />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:120ms] bg-orange-400" />
                <span className="h-1.5 w-1.5 rounded-full animate-bounce [animation-delay:240ms] bg-orange-400" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 p-3 border-t border-slate-100 bg-white rounded-b-2xl">
          <input
            ref={inputRef}
            value={input}
            className="flex-1 px-3 py-2 bg-slate-100 text-sm rounded-xl outline-none border border-transparent focus:border-orange-300 transition"
            placeholder={isAdmin ? "Ask about users, revenue, analytics..." : "Ask about resume, CV, ATS..."}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button
            className="text-white px-3 py-2 rounded-xl transition disabled:opacity-40 bg-orange-500 hover:bg-orange-600"
            disabled={loading || !input.trim()}
            onClick={() => sendMessage()}
          >
            <SendHorizontal size={15} />
          </button>
        </div>
      </div>

      {/* Floating Button — always orange */}
      <button
        ref={btnRef}
        onClick={() => setOpen(prev => !prev)}
        className="fixed right-6 bottom-6 z-50 text-white p-3.5 rounded-full shadow-lg transition bg-orange-500 hover:bg-orange-600"
        title="AI Assistant"
      >
      {open ? <ChevronDown size={20} /> : <Bot size={30} />}
      </button>

      {/* Clear Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={e => e.target === e.currentTarget && setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Clear Conversation?</h3>
            <p className="text-sm text-slate-500 mb-5">All messages in {isAdmin ? "Admin" : "User"} mode will be removed.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
                Cancel
              </button>
              <button onClick={clearChat}
                className="px-4 py-2 text-sm text-white rounded-lg transition bg-orange-500 hover:bg-orange-600">
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

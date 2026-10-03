import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useStore } from "./store";
import "./App.css";

const LINKEDIN_URL = "https://www.linkedin.com/in/chirag-raj-b0a622360/?isSelfProfile=true"; // <- put your link here

const SUGGESTIONS = [
  "Summarize this document",
  "What are the key points?",
  "List any important dates or numbers",
];

function Sidebar() {
  const { documents, activeId, selectDocument, removeDocument, uploadPdf, uploading, uploadProgress, uploadError } =
    useStore();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    uploadPdf(e.dataTransfer.files?.[0]);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">P</span>
        <div>
          <h1>PDF Assistant</h1>
          <p>Ask your documents anything</p>
        </div>
      </div>

      <div
        className={`drop ${drag ? "drag" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => { uploadPdf(e.target.files?.[0]); e.target.value = ""; }}
        />
        {uploading ? (
          <>
            <strong>{uploadProgress < 100 ? `Uploading ${uploadProgress}%` : "Reading your PDF…"}</strong>
            <div className="bar"><i style={{ width: `${uploadProgress}%` }} /></div>
          </>
        ) : (
          <>
            <strong>Drop a PDF here</strong>
            <span>or click to browse</span>
          </>
        )}
      </div>
      {uploadError && <p className="err" role="alert">{uploadError}</p>}

      <div className="docs">
        {documents.length === 0 && <p className="muted">Your uploaded PDFs will appear here.</p>}
        {documents.map((d) => (
          <div key={d.id} className={`doc ${d.id === activeId ? "active" : ""}`}>
            <button className="doc-main" onClick={() => selectDocument(d.id)}>
              <span className="doc-name">{d.filename}</span>
              <span className="doc-meta">{d.chunks} sections indexed</span>
            </button>
            <button className="doc-x" onClick={() => removeDocument(d.id)} aria-label={`Remove ${d.filename}`}>×</button>
          </div>
        ))}
      </div>

      <footer className="foot">
        <span>Built by you, powered by RAG</span>
        <a href={LINKEDIN_URL} target="_blank" rel="noreferrer noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
          </svg>
          Connect on LinkedIn
        </a>
      </footer>
    </aside>
  );
}

function Chat() {
  const { documents, activeId, chats, ask, asking } = useStore();
  const [text, setText] = useState("");
  const endRef = useRef(null);
  const doc = documents.find((d) => d.id === activeId);
  const messages = chats[activeId] || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, asking]);

  const send = (q = text) => {
    if (!q.trim() || asking) return;
    setText("");
    ask(q.trim());
  };

  if (!doc) {
    return (
      <main className="chat empty">
        <div className="hero">
          <h2>Upload a PDF, then ask it questions.</h2>
          <p>Answers come only from the pages you upload, so you can trust where they came from.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="chat">
      <header className="chat-head">
        <div>
          <h2>{doc.filename}</h2>
          <p>Ready · answers are based on this document only</p>
        </div>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="start">
            <p>Try one of these to begin:</p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role} ${m.error ? "error" : ""}`}>
            <div className="bubble">
              {m.role === "bot" && !m.error ? <ReactMarkdown>{m.text}</ReactMarkdown> : m.text}
              {m.source && <div className="source">Source: {m.source}</div>}
            </div>
          </div>
        ))}
        {asking && (
          <div className="msg bot">
            <div className="bubble typing"><i /><i /><i /></div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          rows={1}
          value={text}
          placeholder="Ask a question about this PDF"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
        />
        <button onClick={() => send()} disabled={asking || !text.trim()}>Ask</button>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <div className="app">
      <Sidebar />
      <Chat />
    </div>
  );
}
import { create } from "zustand";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

const errorText = (e) =>
  e?.response?.data?.detail
    ? typeof e.response.data.detail === "string"
      ? e.response.data.detail
      : "The server could not process this request."
    : e?.message || "Something went wrong.";

export const useStore = create((set, get) => ({
  documents: [], // { id, filename, chunks, sessionId }
  activeId: null,
  chats: {}, // { [documentId]: [{ role, text, error? }] }
  uploading: false,
  uploadProgress: 0,
  asking: false,
  uploadError: null,

  selectDocument: (id) => set({ activeId: id }),

  uploadPdf: async (file) => {
    if (!file || file.type !== "application/pdf") {
      set({ uploadError: "Choose a PDF file." });
      return;
    }
    set({ uploading: true, uploadProgress: 0, uploadError: null });
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/upload", form, {
        onUploadProgress: (p) =>
          set({ uploadProgress: Math.round((p.loaded * 100) / (p.total || file.size)) }),
      });
      const doc = {
        id: data.document_id,
        filename: data.filename,
        chunks: data.chunks,
        sessionId: crypto.randomUUID(),
      };
      set((s) => ({
        documents: [doc, ...s.documents],
        activeId: doc.id,
        chats: { ...s.chats, [doc.id]: [] },
      }));
    } catch (e) {
      set({ uploadError: errorText(e) });
    } finally {
      set({ uploading: false, uploadProgress: 0 });
    }
  },

  ask: async (question) => {
    const { activeId, documents } = get();
    const doc = documents.find((d) => d.id === activeId);
    if (!doc || !question.trim()) return;

    const push = (msg) =>
      set((s) => ({ chats: { ...s.chats, [doc.id]: [...(s.chats[doc.id] || []), msg] } }));

    push({ role: "user", text: question });
    set({ asking: true });
    try {
      const { data } = await api.post("/question", {
        question,
        document_id: doc.id,
        session_id: doc.sessionId,
      });
      const a = data.answer;
      if (typeof a === "string") {
        push({ role: "bot", text: a });
      } else {
        // backend returns { answer, source } (or a message object with .content)
        push({
          role: "bot",
          text: a?.answer ?? a?.content ?? JSON.stringify(a),
          source: a?.source,
        });
      }
    } catch (e) {
      push({ role: "bot", text: errorText(e), error: true });
    } finally {
      set({ asking: false });
    }
  },

  removeDocument: (id) =>
    set((s) => {
      const documents = s.documents.filter((d) => d.id !== id);
      const { [id]: _, ...chats } = s.chats;
      return {
        documents,
        chats,
        activeId: s.activeId === id ? documents[0]?.id ?? null : s.activeId,
      };
    }),
}));
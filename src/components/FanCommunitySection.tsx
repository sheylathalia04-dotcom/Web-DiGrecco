import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import {
  MessageSquare,
  Send,
  Heart,
  Sparkles,
  Disc,
  Star,
  CornerDownRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Mic,
  MicOff,
} from "lucide-react";
import {
  subscribeFanMessages,
  addFanMessage,
  addFanReply,
  likeFanMessage,
  FanMessage,
  FanReply,
} from "../lib/firebase";
import { SONGS } from "../data/diGreccoData";

interface FanCommunitySectionProps {
  user: User | null;
  lang: "pt" | "es" | "en";
  onOpenAuth: () => void;
}

export const FanCommunitySection: React.FC<FanCommunitySectionProps> = ({
  user,
  lang,
  onOpenAuth,
}) => {
  const [messages, setMessages] = useState<FanMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Campos do formulário principal de comentário / avaliação
  const [authorName, setAuthorName] = useState<string>("");
  const [newMsg, setNewMsg] = useState<string>("");
  const [selectedSong, setSelectedSong] = useState<string>("Checkmate");
  const [rating, setRating] = useState<number>(5);
  const [roleTag, setRoleTag] = useState<string>("Debutante 15 Anos 👑");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Controle de respostas inline estilo Instagram
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyAuthorName, setReplyAuthorName] = useState<string>("");
  const [replyText, setReplyText] = useState<string>("");
  const [isSendingReply, setIsSendingReply] = useState<boolean>(false);

  // Controle de visibilidade de respostas abertas
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Curtidas locais para feedback instantâneo
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  // Transcrição de áudio com gemini-3.5-transcribe
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await transcribeVoiceAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      alert("Acesso ao microfone negado ou não suportado.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsTranscribing(true);
    }
  };

  const transcribeVoiceAudio = async (blob: Blob) => {
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: "audio/webm",
          }),
        });
        const data = await res.json();
        if (data.transcript) {
          setNewMsg((prev) => (prev ? `${prev} ${data.transcript}` : data.transcript));
        }
        setIsTranscribing(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Transcription error:", err);
      setIsTranscribing(false);
    }
  };

  // Efeito de escuta em tempo real do Firestore (Apenas mensagens reais de usuários)
  useEffect(() => {
    const unsub = subscribeFanMessages((firestoreMsgs) => {
      setMessages(firestoreMsgs || []);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  // Alternar abertura de respostas
  const toggleReplies = (id: string) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Enviar novo comentário / avaliação
  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalAuthor = user?.displayName || authorName.trim();
    if (!finalAuthor) {
      alert("Por favor, digite seu nome ou faça login para publicar.");
      return;
    }
    if (!newMsg.trim()) return;

    setIsSubmitting(true);

    try {
      const newComment: Omit<FanMessage, "id"> = {
        userId: user ? user.uid : "guest",
        userName: finalAuthor,
        userPhoto: user?.photoURL || undefined,
        message: newMsg.trim(),
        favoriteSong: selectedSong,
        rating,
        roleTag,
        likesCount: 1,
        replies: [],
        createdAt: new Date().toISOString(),
      };

      await addFanMessage(newComment);
      setNewMsg("");
      if (!user) {
        setAuthorName("");
      }
    } catch (err) {
      console.warn("Firestore write error, falling back locally:", err);
      // Fallback local se estiver offline
      const localComment: FanMessage = {
        id: `local-${Date.now()}`,
        userId: user ? user.uid : "guest",
        userName: finalAuthor,
        userPhoto: user?.photoURL || undefined,
        message: newMsg.trim(),
        favoriteSong: selectedSong,
        rating,
        roleTag,
        likesCount: 1,
        replies: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [localComment, ...prev]);
      setNewMsg("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Enviar resposta a um comentário
  const handleSendReply = async (parentMessageId: string) => {
    const finalReplier = user?.displayName || replyAuthorName.trim() || "Fã Di Grecco";
    if (!replyText.trim()) return;

    setIsSendingReply(true);
    const newReply: FanReply = {
      id: `rep-${Date.now()}`,
      userId: user?.uid,
      userName: finalReplier,
      userPhoto: user?.photoURL || undefined,
      replyText: replyText.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
    };

    try {
      if (!parentMessageId.startsWith("local-")) {
        await addFanReply(parentMessageId, newReply);
      } else {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === parentMessageId) {
              return {
                ...msg,
                replies: [...(msg.replies || []), newReply],
              };
            }
            return msg;
          })
        );
      }

      setReplyText("");
      setReplyAuthorName("");
      setReplyingToId(null);
      setExpandedReplies((prev) => ({ ...prev, [parentMessageId]: true }));
    } catch (err) {
      console.warn("Error adding reply:", err);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === parentMessageId) {
            return {
              ...msg,
              replies: [...(msg.replies || []), newReply],
            };
          }
          return msg;
        })
      );
      setReplyText("");
      setReplyingToId(null);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Curtir um comentário
  const handleLike = async (msgId: string) => {
    if (likedMap[msgId]) return;

    setLikedMap((prev) => ({ ...prev, [msgId]: true }));

    // Atualização otimista no estado
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, likesCount: (m.likesCount || 0) + 1 } : m))
    );

    if (!msgId.startsWith("local-")) {
      try {
        await likeFanMessage(msgId);
      } catch (err) {
        console.warn("Error incrementing like:", err);
      }
    }
  };

  // Textos adaptados aos 3 idiomas
  const t = {
    pt: {
      badge: "MURAL PÚBLICO & AVALIAÇÕES",
      title: "Mural da Comunidade & Depoimentos de 15 Anos",
      subtitle:
        "Espaço aberto para comentários públicos, relatos das debutantes e conversas entre fãs. Qualquer pessoa pode comentar e responder aos comentários de outros!",
      formTitle: "Deixar meu Comentário / Avaliação",
      formSubtitle: "Compartilhe sua experiência, sua música favorita ou deixe seu carinho para a Di Grecco.",
      nameLabel: "Seu Nome ou @Instagram *",
      namePlaceholder: "Ex: Laura Silva (ou @laurinha_15anos)",
      roleLabel: "Quem é você?",
      msgPlaceholder: "Escreva aqui seu comentário, como foi o show na sua festa, ou recado para a Di Grecco...",
      songLabel: "Música Favorita:",
      ratingLabel: "Sua Avaliação do Show:",
      btnPost: "Publicar Comentário",
      btnPosting: "Publicando...",
      btnReply: "Responder",
      btnCancel: "Cancelar",
      btnSendReply: "Enviar Resposta",
      viewReplies: (count: number) => `Ver ${count} ${count === 1 ? "resposta" : "respostas"}`,
      hideReplies: "Ocultar respostas",
      likesWord: "curtidas",
      replyPlaceholder: "Escreva uma resposta pública...",
      replyNamePlaceholder: "Seu nome...",
      googleBadge: "Conta Google Verificada",
      guestBadge: "Fã Visitante",
      emptyTitle: "Nenhum comentário publicado ainda",
      emptySubtitle: "Seja a primeira pessoa a compartilhar seu relato de 15 anos, avaliar os shows ou deixar uma mensagem carinhosa para a Di Grecco!",
    },
    es: {
      badge: "MURAL PÚBLICO & RESEÑAS",
      title: "Muro de la Comunidad & Reseñas de 15 Años",
      subtitle:
        "Espacio abierto para comentarios públicos, testimonios de quinceañeras y charlas entre fans. ¡Cualquiera puede comentar y responder comentarios!",
      formTitle: "Dejar mi Comentario / Reseña",
      formSubtitle: "Comparte tu experiencia, tu canción favorita o tu saludo para Di Grecco.",
      nameLabel: "Tu Nombre o @Instagram *",
      namePlaceholder: "Ej: Sofía Martínez (o @sofi_15anos)",
      roleLabel: "¿Quién eres?",
      msgPlaceholder: "Escribe aquí tu comentario, cómo fue el show en tu fiesta de 15 años o mensaje para Di Grecco...",
      songLabel: "Canción Favorita:",
      ratingLabel: "Tu Calificación del Show:",
      btnPost: "Publicar Comentario",
      btnPosting: "Publicando...",
      btnReply: "Responder",
      btnCancel: "Cancelar",
      btnSendReply: "Enviar Respuesta",
      viewReplies: (count: number) => `Ver ${count} ${count === 1 ? "respuesta" : "respuestas"}`,
      hideReplies: "Ocultar respuestas",
      likesWord: "me gusta",
      replyPlaceholder: "Escribe una respuesta pública...",
      replyNamePlaceholder: "Tu nombre...",
      googleBadge: "Cuenta Google Verificada",
      guestBadge: "Fan Visitante",
      emptyTitle: "Aún no hay comentarios publicados",
      emptySubtitle: "¡Sé la primera persona en compartir tu experiencia de 15 años, calificar los shows o dejar un mensaje para Di Grecco!",
    },
    en: {
      badge: "PUBLIC GUESTBOOK & REVIEWS",
      title: "Community Wall & 15th Birthday Reviews",
      subtitle:
        "Open public space for fan reviews, debutante testimonials, and discussions. Anyone can post comments and reply to each other!",
      formTitle: "Leave My Comment / Review",
      formSubtitle: "Share your experience, favorite song, or heartfelt message for Di Grecco.",
      nameLabel: "Your Name or @Instagram *",
      namePlaceholder: "Ex: Emily Davis (or @emily_sweet16)",
      roleLabel: "Your relationship to the show:",
      msgPlaceholder: "Write your review, what you thought of the show at your party, or greeting for Di Grecco...",
      songLabel: "Favorite Track:",
      ratingLabel: "Your Rating:",
      btnPost: "Post Comment",
      btnPosting: "Posting...",
      btnReply: "Reply",
      btnCancel: "Cancel",
      btnSendReply: "Post Reply",
      viewReplies: (count: number) => `View ${count} ${count === 1 ? "reply" : "replies"}`,
      hideReplies: "Hide replies",
      likesWord: "likes",
      replyPlaceholder: "Write a public reply...",
      replyNamePlaceholder: "Your name...",
      googleBadge: "Verified Google Account",
      guestBadge: "Guest Fan",
      emptyTitle: "No comments published yet",
      emptySubtitle: "Be the first person to share your 15th birthday experience, review the shows, or leave a message for Di Grecco!",
    },
  }[lang];

  return (
    <section id="comunidade" className="py-24 relative overflow-hidden bg-[#09090f]">
      {/* Glow ambient background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-pink-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-xs font-bold text-pink-400 uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.badge}</span>
          </div>

          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
            {t.title}
          </h2>

          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
            {t.subtitle}
          </p>
        </div>

        {/* ========================================================================= */}
        {/* 📝 FORMULARIO DE COMENTARIOS / RESEÑAS PÚBLICAS                           */}
        {/* ========================================================================= */}
        <div className="mb-14 glass-panel-glow p-6 sm:p-8 rounded-3xl border border-pink-500/30 bg-[#10101c]/95 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10 mb-6">
            <div>
              <h3 className="font-display font-extrabold text-xl text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-pink-400" />
                <span>{t.formTitle}</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                {t.formSubtitle}
              </p>
            </div>

            {/* Estrellas de Calificación (1 a 5) */}
            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-2xl border border-white/10">
              <span className="text-[11px] font-semibold text-zinc-300 mr-1">
                {t.ratingLabel}
              </span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-125 focus:outline-none"
                  title={`${star} estrelas`}
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= rating
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                        : "text-zinc-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handlePostMessage} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nome ou @Instagram */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {t.nameLabel}
                </label>
                {user ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-pink-500/40 text-xs text-white">
                    <span className="font-bold text-pink-400 truncate">
                      {user.displayName || "Usuário Conectado"}
                    </span>
                    <span className="text-[10px] text-zinc-400 ml-auto flex-shrink-0">
                      ({t.googleBadge})
                    </span>
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
                  />
                )}
              </div>

              {/* Relação / Papel */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {t.roleLabel}
                </label>
                <select
                  value={roleTag}
                  onChange={(e) => setRoleTag(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-pink-500 transition-colors"
                >
                  <option value="Debutante 15 Anos 👑">Debutante 15 Anos 👑</option>
                  <option value="Mãe / Pai de Debutante 🌸">Mãe / Pai de Debutante 🌸</option>
                  <option value="Amigo(a) da Aniversariante 🎉">Amigo(a) da Aniversariante 🎉</option>
                  <option value="Fã Clube Oficial ⚡">Fã Clube Oficial ⚡</option>
                  <option value="Produtor / Assessor de Eventos 🎧">Produtor / Assessor de Eventos 🎧</option>
                  <option value="Admirador Pop 🌟">Admirador Pop 🌟</option>
                </select>
              </div>

              {/* Música Favorita */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                  <Disc className="w-3.5 h-3.5 text-[#1DB954]" />
                  <span>{t.songLabel}</span>
                </label>
                <select
                  value={selectedSong}
                  onChange={(e) => setSelectedSong(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs focus:outline-none focus:border-[#1DB954] transition-colors"
                >
                  {SONGS.map((s) => (
                    <option key={s.id} value={s.title}>
                      {s.title} ({s.releaseYear})
                    </option>
                  ))}
                  <option value="Todas as Músicas">Todas as Músicas ❤️</option>
                </select>
              </div>
            </div>

            {/* Mensagem principal com opção de Transcrição por Voz */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Seu Comentário ou Avaliação:</span>
                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    isRecording
                      ? "bg-rose-600/30 border-rose-500 text-rose-300 animate-pulse"
                      : "bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:border-pink-500/40"
                  }`}
                  title="Falar por voz com modelo gemini-3.5-transcribe"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3.5 h-3.5 text-rose-400" />
                      <span>Gravando... clique para transcrever</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Falar por Microfone (IA)</span>
                    </>
                  )}
                </button>
              </div>

              {isTranscribing && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Transcrevendo áudio com gemini-3.5-transcribe...</span>
                </div>
              )}

              <textarea
                required
                rows={3}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={
                  isRecording
                    ? "Gravando sua voz... fale agora..."
                    : t.msgPlaceholder
                }
                className="w-full px-4 py-3 rounded-2xl bg-black/60 border border-white/10 text-white text-xs sm:text-sm placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 transition-colors"
              />
            </div>

            {/* Rodapé do Form com Ações */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                {!user && (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="text-pink-400 hover:text-pink-300 font-semibold underline underline-offset-2 transition-colors"
                  >
                    Fazer Login com Google para ter avatar verificado
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !newMsg.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all hover:scale-102 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? t.btnPosting : t.btnPost}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ========================================================================= */}
        {/* 💬 HILO DE COMENTARIOS & RESPUESTAS ANIDADAS (REALES)                     */}
        {/* ========================================================================= */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
            <span>Comentários dos Fãs ({messages.length})</span>
            <span>Feed em Tempo Real</span>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Carregando comentários...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 px-6 glass-panel rounded-3xl border border-white/10 bg-[#11111f]/60 max-w-2xl mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 mx-auto">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="font-display font-bold text-white text-lg">
                {t.emptyTitle}
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                {t.emptySubtitle}
              </p>
            </div>
          ) : (
            messages.map((comment) => {
              const replies = comment.replies || [];
              const hasReplies = replies.length > 0;
              const isRepliesOpen = expandedReplies[comment.id] || false;
              const isReplying = replyingToId === comment.id;
              const isLiked = likedMap[comment.id] || false;

              return (
                <div
                  key={comment.id}
                  className="glass-panel rounded-3xl border border-white/10 hover:border-pink-500/30 p-5 sm:p-6 bg-[#11111f]/80 transition-all space-y-4 shadow-xl"
                >
                  {/* Cabecera del comentario: Foto/Avatar, Nombre, Rol, Estrellas, Fecha */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {comment.userPhoto ? (
                        <img
                          src={comment.userPhoto}
                          alt={comment.userName}
                          className="w-10 h-10 rounded-full border-2 border-pink-500/40 object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
                          {comment.userName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-white text-sm">
                            {comment.userName}
                          </h4>

                          {comment.roleTag && (
                            <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-[10px] font-bold text-pink-300">
                              {comment.roleTag}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                          {/* Estrellas */}
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${
                                  s <= (comment.rating || 5)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-zinc-600"
                                }`}
                              />
                            ))}
                          </div>

                          <span>•</span>
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {comment.favoriteSong && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1DB954]/15 border border-[#1DB954]/30 text-[11px] font-bold text-[#1DB954] flex-shrink-0">
                        <Disc className="w-3 h-3" />
                        <span>{comment.favoriteSong}</span>
                      </span>
                    )}
                  </div>

                  {/* Texto del comentario */}
                  <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed pl-0 sm:pl-13">
                    {comment.message}
                  </p>

                  {/* Barra de acción: Me Gusta, Responder, Contador de respuestas */}
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 pl-0 sm:pl-13 text-xs">
                    <div className="flex items-center gap-4">
                      {/* Botón Curtir / Like */}
                      <button
                        type="button"
                        onClick={() => handleLike(comment.id)}
                        className={`flex items-center gap-1.5 transition-colors font-medium ${
                          isLiked ? "text-pink-400" : "text-zinc-400 hover:text-pink-400"
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${isLiked ? "fill-pink-400" : ""}`}
                        />
                        <span>
                          {(comment.likesCount || 0) > 0
                            ? `${comment.likesCount} ${t.likesWord}`
                            : "Curtir"}
                        </span>
                      </button>

                      {/* Botón Responder */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToId(isReplying ? null : comment.id);
                          if (!isRepliesOpen) {
                            toggleReplies(comment.id);
                          }
                        }}
                        className="flex items-center gap-1 text-zinc-400 hover:text-white font-medium transition-colors"
                      >
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>{t.btnReply}</span>
                      </button>
                    </div>

                    {/* Ver / Ocultar respuestas */}
                    {hasReplies && (
                      <button
                        type="button"
                        onClick={() => toggleReplies(comment.id)}
                        className="text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1 text-xs transition-colors"
                      >
                        <span>
                          {isRepliesOpen ? t.hideReplies : t.viewReplies(replies.length)}
                        </span>
                        {isRepliesOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* ================================================================= */}
                  {/* 💬 CAJA INLINE PARA RESPONDER                                    */}
                  {/* ================================================================= */}
                  {isReplying && (
                    <div className="mt-3 pl-0 sm:pl-13 pt-3 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
                      <div className="p-3.5 rounded-2xl bg-black/50 border border-pink-500/30 space-y-2.5">
                        <p className="text-[11px] font-bold text-pink-400">
                          Respondendo a @{comment.userName}:
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <input
                            type="text"
                            value={user?.displayName || replyAuthorName}
                            disabled={Boolean(user?.displayName)}
                            onChange={(e) => setReplyAuthorName(e.target.value)}
                            placeholder={t.replyNamePlaceholder}
                            className="w-full sm:w-1/3 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
                          />

                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={t.replyPlaceholder}
                            className="w-full sm:w-2/3 px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSendReply(comment.id);
                              }
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setReplyingToId(null)}
                            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                          >
                            {t.btnCancel}
                          </button>

                          <button
                            type="button"
                            disabled={isSendingReply || !replyText.trim()}
                            onClick={() => handleSendReply(comment.id)}
                            className="px-4 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                          >
                            {isSendingReply ? "Enviando..." : t.btnSendReply}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ================================================================= */}
                  {/* 💬 LISTA DE RESPUESTAS ANIDADAS                                  */}
                  {/* ================================================================= */}
                  {hasReplies && isRepliesOpen && (
                    <div className="mt-3 pl-4 sm:pl-14 space-y-3 border-l-2 border-pink-500/20 ml-2 sm:ml-6">
                      {replies.map((reply) => {
                        const isDiGrecco =
                          reply.userName.toLowerCase().includes("di grecco") ||
                          reply.userName.toLowerCase().includes("camilla") ||
                          reply.userName.toLowerCase().includes("giovanna");

                        return (
                          <div
                            key={reply.id}
                            className={`p-3.5 rounded-2xl border transition-all space-y-1.5 ${
                              isDiGrecco
                                ? "bg-pink-950/20 border-pink-500/40"
                                : "bg-white/5 border-white/5"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {reply.userPhoto ? (
                                  <img
                                    src={reply.userPhoto}
                                    alt={reply.userName}
                                    className="w-6 h-6 rounded-full border border-pink-500/40 object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                                    {reply.userName.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <span className="font-bold text-white text-xs flex items-center gap-1">
                                  {reply.userName}
                                  {isDiGrecco && (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-pink-500 text-white text-[9px] font-black uppercase">
                                      <CheckCircle2 className="w-2.5 h-2.5 fill-white text-pink-600" />
                                      <span>Oficial</span>
                                    </span>
                                  )}
                                </span>
                              </div>

                              <span className="text-[10px] text-zinc-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-xs text-zinc-300 leading-relaxed pl-8">
                              {reply.replyText}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

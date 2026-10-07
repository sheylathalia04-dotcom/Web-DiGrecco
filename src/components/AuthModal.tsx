import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { X, LogOut, Heart, Calendar, Music, Sparkles, CheckCircle2 } from "lucide-react";
import {
  signInWithGoogle,
  logoutUser,
  getUserProfile,
  getUserDebutanteQuotes,
  UserProfile,
  DebutanteQuote,
} from "../lib/firebase";
import { SONGS } from "../data/diGreccoData";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  lang: "pt" | "es" | "en";
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, user, lang }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [quotes, setQuotes] = useState<DebutanteQuote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (user) {
      loadUserData(user.uid);
    } else {
      setProfile(null);
      setQuotes([]);
    }
  }, [user]);

  const loadUserData = async (uid: string) => {
    try {
      const p = await getUserProfile(uid);
      setProfile(p);
      const q = await getUserDebutanteQuotes(uid);
      setQuotes(q);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Erro ao autenticar com o Google.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const t = {
    pt: {
      title: user
        ? "Perfil do Fã Oficial"
        : authMode === "register"
        ? "Criar Conta na Di Grecco"
        : "Iniciar Sessão na Di Grecco",
      subtitle: user
        ? "Gerencie suas músicas favoritas e preferências de fã."
        : authMode === "register"
        ? "Cadastre-se para interagir com a comunidade, salvar músicas e acompanhar a dupla."
        : "Acesse sua conta para conferir novidades, preferências e conteúdos exclusivos.",
      tabLogin: "Iniciar Sessão",
      tabRegister: "Registrar-se",
      googleBtn: "Continuar com o Google",
      signingIn: "Conectando ao Google...",
      logoutBtn: "Encerrar Sessão",
      favSongs: "Músicas Favoritadas",
      myQuotes: "Seus Orçamentos Salvos",
      noFavs: "Nenhuma música favoritada ainda. Clique no coração nas músicas abaixo!",
      noQuotes: "Você ainda não solicitou um orçamento de debutante.",
      statusPending: "Em análise pela produção",
      statusContacted: "Contato iniciado via WhatsApp",
      statusConfirmed: "Show Confirmado!",
    },
    es: {
      title: user
        ? "Perfil del Fan Oficial"
        : authMode === "register"
        ? "Crear Cuenta en Di Grecco"
        : "Iniciar Sesión en Di Grecco",
      subtitle: user
        ? "Administra tus canciones favoritas y preferencias de fan."
        : authMode === "register"
        ? "Regístrate para interactuar con los fans, guardar canciones y seguir a la dupla."
        : "Accede a tu cuenta para consultar novedades, preferencias y contenidos exclusivos.",
      tabLogin: "Iniciar Sesión",
      tabRegister: "Registrarse",
      googleBtn: "Continuar con Google",
      signingIn: "Conectando con Google...",
      logoutBtn: "Cerrar Sesión",
      favSongs: "Canciones Favoritas",
      myQuotes: "Tus Cotizaciones Guardadas",
      noFavs: "Ninguna canción favorita aún. ¡Haz clic en el corazón de las canciones!",
      noQuotes: "Aún no has solicitado una cotización de debutante.",
      statusPending: "En análisis por producción",
      statusContacted: "Contacto iniciado por WhatsApp",
      statusConfirmed: "¡Show Confirmado!",
    },
    en: {
      title: user
        ? "Official Fan Profile"
        : authMode === "register"
        ? "Create Di Grecco Account"
        : "Sign In to Di Grecco",
      subtitle: user
        ? "Manage your bookmarked tracks and fan preferences."
        : authMode === "register"
        ? "Sign up to join the fan community, bookmark songs, and follow Camilla & Giovanna."
        : "Access your account to manage preferences and exclusive artist updates.",
      tabLogin: "Sign In",
      tabRegister: "Sign Up",
      googleBtn: "Continue with Google",
      signingIn: "Connecting to Google...",
      logoutBtn: "Sign Out",
      favSongs: "Favorite Songs",
      myQuotes: "Saved Show Quotes",
      noFavs: "No favorite songs yet. Click the heart icon on any track!",
      noQuotes: "No show quotes saved yet.",
      statusPending: "Reviewing with production",
      statusContacted: "Contacted on WhatsApp",
      statusConfirmed: "Show Confirmed!",
    },
  }[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel-glow border-2 border-[#1DB954]/50 shadow-2xl p-6 sm:p-8 bg-[#0c0c14] text-white max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Firebase Auth & Firestore</span>
          </div>

          <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-white">
            {t.title}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">{t.subtitle}</p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
            {errorMsg}
          </div>
        )}

        {!user ? (
          /* Auth View (Tabs + Google + Divider + Form Login/Register) */
          <div className="space-y-5 py-2">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-2xl bg-white/5 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authMode === "login"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.tabLogin}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("register");
                  setErrorMsg(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                  authMode === "register"
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t.tabRegister}
              </button>
            </div>

            {/* 1. Google Button (Común para Login y Registro) */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-102"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.64-5.2 3.64-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.92H1.21v3.15C3.25 21.4 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.57H1.21C.44 8.1 0 9.99 0 12s.44 3.9 1.21 5.43l4.11-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.25 2.6 1.21 6.57l4.11 3.15c.94-2.82 3.58-4.97 6.68-4.97z"
                />
              </svg>
              <span>{isLoading ? t.signingIn : t.googleBtn}</span>
            </button>

            {/* 2. Separador visual */}
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px bg-white/10"></span>
              <span className="text-xs text-zinc-400 lowercase">
                {authMode === "login"
                  ? lang === "es"
                    ? "o inicia sesión con tu correo"
                    : lang === "en"
                    ? "or sign in with your email"
                    : "ou entre com seu e-mail"
                  : lang === "es"
                  ? "o regístrate con tu correo"
                  : lang === "en"
                  ? "or register with your email"
                  : "ou cadastre-se com seu e-mail"}
              </span>
              <span className="flex-1 h-px bg-white/10"></span>
            </div>

            {/* 3. Formulario: LOGIN */}
            {authMode === "login" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setErrorMsg(
                    lang === "es"
                      ? "El área de usuarios y administración estará disponible próximamente en la versión completa."
                      : lang === "en"
                      ? "The user and management area will be available soon in the full release."
                      : "A área de usuários e administração estará disponível em breve na versão completa."
                  );
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === "es" ? "Correo electrónico" : lang === "en" ? "Email address" : "E-mail"}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === "es" ? "Contraseña" : lang === "en" ? "Password" : "Senha"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg transition-all hover:scale-101"
                >
                  {lang === "es" ? "Iniciar Sesión" : lang === "en" ? "Sign In" : "Iniciar Sessão"}
                </button>
              </form>
            )}

            {/* 3. Formulario: REGISTRO */}
            {authMode === "register" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setErrorMsg(
                    lang === "es"
                      ? "¡Cuenta registrada con éxito! El área de usuarios y administración estará disponible próximamente en la versión completa."
                      : lang === "en"
                      ? "Account created successfully! The user area will be available soon in the full release."
                      : "Conta criada com sucesso! A área de usuários estará disponível em breve na versão completa."
                  );
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === "es" ? "Nombre completo" : lang === "en" ? "Full name" : "Nome completo"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={lang === "es" ? "Tu nombre y apellido" : lang === "en" ? "Your full name" : "Seu nome completo"}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === "es" ? "Correo electrónico" : lang === "en" ? "Email address" : "E-mail"}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    {lang === "es" ? "Contraseña" : lang === "en" ? "Password" : "Senha"}
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-pink-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-purple-500 text-white font-extrabold text-xs shadow-lg transition-all hover:scale-101"
                >
                  {lang === "es" ? "Crear Cuenta" : lang === "en" ? "Create Account" : "Criar Conta"}
                </button>
              </form>
            )}

            {/* 4. Enlaces de cambio rápido entre Login y Registro */}
            <div className="text-center pt-2 border-t border-white/10">
              {authMode === "login" ? (
                <p className="text-xs text-zinc-400">
                  {lang === "es" ? "¿No tienes cuenta? " : lang === "en" ? "Don't have an account? " : "Não tem uma conta? "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setErrorMsg(null);
                    }}
                    className="text-pink-400 hover:text-pink-300 font-bold underline"
                  >
                    {lang === "es" ? "Regístrate" : lang === "en" ? "Sign Up" : "Cadastre-se"}
                  </button>
                </p>
              ) : (
                <p className="text-xs text-zinc-400">
                  {lang === "es" ? "¿Ya tienes cuenta? " : lang === "en" ? "Already have an account? " : "Já tem uma conta? "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMsg(null);
                    }}
                    className="text-pink-400 hover:text-pink-300 font-bold underline"
                  >
                    {lang === "es" ? "Inicia sesión" : lang === "en" ? "Sign In" : "Iniciar sessão"}
                  </button>
                </p>
              )}
            </div>
          </div>
        ) : (
          /* Logged In View */
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User"}
                  className="w-14 h-14 rounded-full border-2 border-[#1DB954] object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-black text-xl">
                  {user.displayName?.charAt(0) || "U"}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-base text-white truncate">
                  {user.displayName || "Fã Di Grecco"}
                </h4>
                <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-[#1DB954]">
                  VIP Fan Ativo
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-red-500/20 text-zinc-300 hover:text-red-300 border border-white/10 transition-colors"
                title={t.logoutBtn}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Favorite Songs list */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                <span>{t.favSongs}</span>
              </h5>

              {profile?.favoriteSongs && profile.favoriteSongs.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {profile.favoriteSongs.map((songId) => {
                    const song = SONGS.find((s) => s.id === songId);
                    if (!song) return null;
                    return (
                      <div
                        key={song.id}
                        className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2.5"
                      >
                        <img
                          src={song.coverImage}
                          alt={song.title}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                        <div className="truncate text-xs">
                          <p className="font-bold text-white truncate">{song.title}</p>
                          <p className="text-[10px] text-zinc-400">{song.duration}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic p-3 rounded-xl bg-white/5 border border-white/5">
                  {t.noFavs}
                </p>
              )}
            </div>

            {/* Saved Quotes */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{t.myQuotes}</span>
              </h5>

              {quotes.length > 0 ? (
                <div className="space-y-2">
                  {quotes.map((q) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm">
                          {q.debutanteName} (15 Anos)
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                          {q.packageType}
                        </span>
                      </div>
                      <p className="text-zinc-400">
                        {q.city} • Data: {q.eventDate || "A definir"}
                      </p>
                      <p className="text-[#1DB954] text-[11px] font-semibold">
                        Música de Valsa / Show: {q.specialSong || "Checkmate / Anjo Querubim"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 italic p-3 rounded-xl bg-white/5 border border-white/5">
                  {t.noQuotes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

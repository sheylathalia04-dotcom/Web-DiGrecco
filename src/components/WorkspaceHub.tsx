import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  Folder,
  Mail,
  Calendar,
  FileText,
  Users,
  ExternalLink,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  Lock,
} from "lucide-react";
import {
  connectGoogleWorkspace,
  getCachedAccessToken,
  fetchDriveFiles,
  uploadDriveFile,
  deleteDriveFile,
  DriveFileItem,
  fetchGmailMessages,
  sendGmailMessage,
  GmailMessageSummary,
  fetchCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  CalendarEventItem,
  fetchGoogleForms,
  createDebutanteGoogleForm,
  GoogleFormItem,
  fetchGoogleContacts,
  createGoogleContact,
  ContactPersonItem,
} from "../lib/workspace";

interface WorkspaceHubProps {
  user: User | null;
  lang: "pt" | "es" | "en";
}

type WorkspaceTab = "drive" | "gmail" | "calendar" | "forms" | "contacts";

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({ user, lang }) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("drive");
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Confirmation dialog state (Mandatory for mutating/destructive operations)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    isDestructive?: boolean;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    actionLabel: "Confirmar",
    isDestructive: false,
    onConfirm: async () => {},
  });

  // 1. Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [driveSearch, setDriveSearch] = useState<string>("");
  const [newFileName, setNewFileName] = useState<string>("");
  const [newFileContent, setNewFileContent] = useState<string>("");
  const [isCreatingFile, setIsCreatingFile] = useState<boolean>(false);

  // 2. Gmail State
  const [gmailMessages, setGmailMessages] = useState<GmailMessageSummary[]>([]);
  const [isComposingEmail, setIsComposingEmail] = useState<boolean>(false);
  const [emailTo, setEmailTo] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");

  // 3. Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState<boolean>(false);
  const [eventSummary, setEventSummary] = useState<string>("");
  const [eventStart, setEventStart] = useState<string>("");
  const [eventEnd, setEventEnd] = useState<string>("");
  const [eventDesc, setEventDesc] = useState<string>("");

  // 4. Forms State
  const [googleForms, setGoogleForms] = useState<GoogleFormItem[]>([]);
  const [isCreatingForm, setIsCreatingForm] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState<string>("");

  // 5. Contacts State
  const [contacts, setContacts] = useState<ContactPersonItem[]>([]);
  const [isAddingContact, setIsAddingContact] = useState<boolean>(false);
  const [contactName, setContactName] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");

  // Check token on mount or user change
  useEffect(() => {
    const token = getCachedAccessToken();
    setHasToken(!!token);
    if (token) {
      loadTabData(activeTab);
    }
  }, [user, activeTab]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMsg(null);
    try {
      await connectGoogleWorkspace();
      setHasToken(true);
      setStatusMsg({
        type: "success",
        text:
          lang === "es"
            ? "¡Conectado exitosamente con Google Workspace!"
            : lang === "en"
            ? "Successfully connected with Google Workspace!"
            : "Conectado com sucesso ao Google Workspace!",
      });
      loadTabData(activeTab);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: "error",
        text: err.message || "Error al conectar con los servicios de Google Workspace.",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const loadTabData = async (tab: WorkspaceTab) => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      if (tab === "drive") {
        const files = await fetchDriveFiles();
        setDriveFiles(files);
      } else if (tab === "gmail") {
        const msgs = await fetchGmailMessages();
        setGmailMessages(msgs);
      } else if (tab === "calendar") {
        const events = await fetchCalendarEvents();
        setCalendarEvents(events);
      } else if (tab === "forms") {
        const forms = await fetchGoogleForms();
        setGoogleForms(forms);
      } else if (tab === "contacts") {
        const people = await fetchGoogleContacts();
        setContacts(people);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg({
        type: "error",
        text: err.message || `Error al sincronizar datos de ${tab}.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Mutating Action with Confirmation Dialog: Upload Drive File
  const triggerCreateDriveFile = () => {
    if (!newFileName.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Guardar Archivo en Google Drive" : lang === "en" ? "Save File to Google Drive" : "Salvar Arquivo no Google Drive",
      description:
        lang === "es"
          ? `¿Confirmas que deseas crear el archivo "${newFileName.trim()}" en tu Google Drive con permiso de tu cuenta?`
          : lang === "en"
          ? `Do you confirm you want to create "${newFileName.trim()}" in your Google Drive with permission?`
          : `Confirma a criação do arquivo "${newFileName.trim()}" no seu Google Drive com permissão?`,
      actionLabel: lang === "es" ? "Crear en Drive" : lang === "en" ? "Create File" : "Criar no Drive",
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await uploadDriveFile(newFileName.trim(), newFileContent, "text/plain");
          setNewFileName("");
          setNewFileContent("");
          setIsCreatingFile(false);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "¡Archivo creado en Google Drive con éxito!" : "Arquivo criado com sucesso no Google Drive!",
          });
          await loadTabData("drive");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Delete Drive File
  const triggerDeleteDriveFile = (file: DriveFileItem) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Eliminar Archivo de Google Drive" : lang === "en" ? "Delete Google Drive File" : "Excluir Arquivo do Google Drive",
      description:
        lang === "es"
          ? `¿Estás seguro de que deseas eliminar permanentemente "${file.name}" de tu Google Drive? Esta acción no se puede deshacer.`
          : lang === "en"
          ? `Are you sure you want to permanently delete "${file.name}" from Google Drive? This action cannot be undone.`
          : `Tem certeza que deseja excluir "${file.name}" do seu Google Drive permanentemente?`,
      actionLabel: lang === "es" ? "Eliminar Archivo" : lang === "en" ? "Delete File" : "Excluir Arquivo",
      isDestructive: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteDriveFile(file.id);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "Archivo eliminado de Google Drive." : "Arquivo excluído do Google Drive.",
          });
          await loadTabData("drive");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Send Gmail Email
  const triggerSendEmail = () => {
    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Enviar Correo desde Gmail" : lang === "en" ? "Send Email via Gmail" : "Enviar E-mail via Gmail",
      description:
        lang === "es"
          ? `¿Deseas enviar este mensaje a "${emailTo.trim()}" con el asunto "${emailSubject.trim()}" a través de tu cuenta oficial de Gmail?`
          : lang === "en"
          ? `Do you want to send this email to "${emailTo.trim()}" with subject "${emailSubject.trim()}" using your Gmail account?`
          : `Deseja enviar este e-mail para "${emailTo.trim()}" com o assunto "${emailSubject.trim()}" via Gmail?`,
      actionLabel: lang === "es" ? "Enviar Correo" : lang === "en" ? "Send Email" : "Enviar E-mail",
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await sendGmailMessage(emailTo.trim(), emailSubject.trim(), emailBody.trim());
          setEmailTo("");
          setEmailSubject("");
          setEmailBody("");
          setIsComposingEmail(false);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "¡Correo enviado con éxito por Gmail!" : "E-mail enviado com sucesso pelo Gmail!",
          });
          await loadTabData("gmail");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Create Calendar Event
  const triggerCreateEvent = () => {
    if (!eventSummary.trim() || !eventStart || !eventEnd) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Programar Evento en Google Calendar" : lang === "en" ? "Schedule Google Calendar Event" : "Agendar no Google Calendar",
      description:
        lang === "es"
          ? `¿Confirmas agendar "${eventSummary.trim()}" el ${new Date(eventStart).toLocaleString()} en tu Google Calendar?`
          : lang === "en"
          ? `Do you confirm scheduling "${eventSummary.trim()}" on ${new Date(eventStart).toLocaleString()} in Google Calendar?`
          : `Confirma o agendamento de "${eventSummary.trim()}" em ${new Date(eventStart).toLocaleString()} no Google Calendar?`,
      actionLabel: lang === "es" ? "Agendar Evento" : lang === "en" ? "Schedule Event" : "Agendar Evento",
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await createCalendarEvent({
            summary: eventSummary.trim(),
            description: eventDesc.trim(),
            startIso: new Date(eventStart).toISOString(),
            endIso: new Date(eventEnd).toISOString(),
          });
          setEventSummary("");
          setEventDesc("");
          setEventStart("");
          setEventEnd("");
          setIsAddingEvent(false);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "¡Evento programado con éxito en Google Calendar!" : "Evento agendado com sucesso no Google Calendar!",
          });
          await loadTabData("calendar");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Delete Calendar Event
  const triggerDeleteEvent = (event: CalendarEventItem) => {
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Eliminar Evento de Google Calendar" : lang === "en" ? "Delete Google Calendar Event" : "Excluir Evento do Calendar",
      description:
        lang === "es"
          ? `¿Estás seguro de que deseas cancelar y eliminar "${event.summary}" de tu calendario de Google?`
          : lang === "en"
          ? `Are you sure you want to cancel and delete "${event.summary}" from your Google Calendar?`
          : `Tem certeza que deseja cancelar e excluir "${event.summary}" da sua agenda?`,
      actionLabel: lang === "es" ? "Eliminar Evento" : lang === "en" ? "Delete Event" : "Excluir Evento",
      isDestructive: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await deleteCalendarEvent(event.id);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "Evento eliminado de Google Calendar." : "Evento excluído do Google Calendar.",
          });
          await loadTabData("calendar");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Create Google Form
  const triggerCreateForm = () => {
    if (!formTitle.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Crear Formulario en Google Forms" : lang === "en" ? "Create Google Form" : "Criar no Google Forms",
      description:
        lang === "es"
          ? `¿Deseas crear un nuevo formulario "${formTitle.trim()}" para coordinación de 15 años en tu cuenta de Google Forms?`
          : lang === "en"
          ? `Do you want to create a new form "${formTitle.trim()}" in Google Forms with permission?`
          : `Deseja criar o formulário "${formTitle.trim()}" no Google Forms com permissão?`,
      actionLabel: lang === "es" ? "Crear Formulario" : lang === "en" ? "Create Form" : "Criar Formulário",
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          const res = await createDebutanteGoogleForm(formTitle.trim());
          setFormTitle("");
          setIsCreatingForm(false);
          setStatusMsg({
            type: "success",
            text:
              lang === "es"
                ? `¡Formulario creado en Google Forms! Enlace: ${res.responderUri}`
                : `Formulário criado no Google Forms! Link: ${res.responderUri}`,
          });
          await loadTabData("forms");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Mutating Action with Confirmation Dialog: Create Contact
  const triggerCreateContact = () => {
    if (!contactName.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: lang === "es" ? "Agregar Contacto a Google People" : lang === "en" ? "Add Google Contact" : "Adicionar aos Contatos",
      description:
        lang === "es"
          ? `¿Confirmas agregar a "${contactName.trim()}" a tu libreta de contactos de Google?`
          : lang === "en"
          ? `Do you confirm adding "${contactName.trim()}" to your Google Contacts list?`
          : `Confirma a inclusão de "${contactName.trim()}" na sua lista de Contatos do Google?`,
      actionLabel: lang === "es" ? "Guardar Contacto" : lang === "en" ? "Save Contact" : "Salvar Contato",
      isDestructive: false,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await createGoogleContact({
            givenName: contactName.trim(),
            email: contactEmail.trim() || undefined,
            phone: contactPhone.trim() || undefined,
          });
          setContactName("");
          setContactEmail("");
          setContactPhone("");
          setIsAddingContact(false);
          setStatusMsg({
            type: "success",
            text: lang === "es" ? "¡Contacto guardado con éxito en Google!" : "Contato salvo com sucesso no Google!",
          });
          await loadTabData("contacts");
        } catch (e: any) {
          setStatusMsg({ type: "error", text: e.message });
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <section id="workspace-hub" className="py-20 relative bg-[#090912] border-t border-white/10">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-pink-500/10 via-purple-600/10 to-blue-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-blue-500/20 via-emerald-500/20 to-purple-500/20 border border-white/20 text-xs font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Google Workspace Suite Oficial</span>
          </div>

          <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
            {lang === "es"
              ? "Centro de Gestión Google Workspace"
              : lang === "en"
              ? "Google Workspace Production Center"
              : "Central de Gestão Google Workspace"}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            {lang === "es"
              ? "Sincroniza y gestiona contratos en Google Drive, correos de producción en Gmail, ensayos en Google Calendar, formularios y tu lista de contactos oficiales de Di Grecco con permiso de tu cuenta."
              : lang === "en"
              ? "Access and organize contracts in Google Drive, production emails in Gmail, calendar rehearsals, debutante forms, and contacts with permission."
              : "Gerencie arquivos no Google Drive, e-mails pelo Gmail, ensaios no Google Calendar, formulários de debutantes e contatos oficiais com a devida permissão."}
          </p>
        </div>

        {/* Status Notification Banner */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-semibold ${
              statusMsg.type === "success"
                ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-200"
                : "bg-red-950/80 border border-red-500/40 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-white/60 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* If not connected: Show Official Sign in with Google Button */}
        {!hasToken && (
          <div className="p-8 sm:p-12 rounded-3xl glass-panel-glow border border-white/15 bg-[#0f0f1c]/90 text-center max-w-xl mx-auto shadow-2xl mb-12">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/15">
              <Lock className="w-8 h-8 text-pink-400" />
            </div>

            <h3 className="font-display font-bold text-xl text-white mb-2">
              {lang === "es"
                ? "Conecta tu Cuenta de Google"
                : lang === "en"
                ? "Connect Your Google Account"
                : "Conecte sua Conta Google"}
            </h3>

            <p className="text-xs text-zinc-300 mb-6 leading-relaxed">
              {lang === "es"
                ? "Para ver tus archivos de Drive, enviar correos por Gmail, consultar el calendario, crear formularios y ver tus contactos, inicia sesión con Google con permiso de tu cuenta."
                : lang === "en"
                ? "To browse files, send emails, schedule rehearsals, and manage debutante contacts, sign in with your Google account."
                : "Para acessar seus arquivos do Drive, e-mails no Gmail, agenda de ensaios e contatos, conecte sua conta Google com permissão."}
            </p>

            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white hover:bg-zinc-100 text-black font-extrabold text-sm flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-102 mx-auto active:scale-95 disabled:opacity-75"
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
              <span>
                {isConnecting
                  ? lang === "es"
                    ? "Conectando con Google..."
                    : "Connecting..."
                  : lang === "es"
                  ? "Conectar Google Workspace"
                  : "Connect Google Workspace"}
              </span>
            </button>
          </div>
        )}

        {/* When connected: Show Full 5-in-1 Workspace Suite Dashboard */}
        {hasToken && (
          <div className="rounded-3xl glass-panel-glow border border-white/15 bg-[#0d0d1a]/95 overflow-hidden shadow-2xl">
            {/* Top Workspace Navigation Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 sm:px-6 pt-3 bg-black/40 overflow-x-auto gap-2">
              <div className="flex gap-1.5 sm:gap-2">
                <button
                  onClick={() => setActiveTab("drive")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === "drive"
                      ? "border-blue-400 text-blue-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span>Google Drive</span>
                </button>

                <button
                  onClick={() => setActiveTab("gmail")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === "gmail"
                      ? "border-red-400 text-red-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>Gmail</span>
                </button>

                <button
                  onClick={() => setActiveTab("calendar")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === "calendar"
                      ? "border-cyan-400 text-cyan-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  <span>Calendar</span>
                </button>

                <button
                  onClick={() => setActiveTab("forms")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === "forms"
                      ? "border-purple-400 text-purple-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Forms</span>
                </button>

                <button
                  onClick={() => setActiveTab("contacts")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
                    activeTab === "contacts"
                      ? "border-emerald-400 text-emerald-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Contactos</span>
                </button>
              </div>

              {/* Refresh button */}
              <button
                onClick={() => loadTabData(activeTab)}
                disabled={isLoading}
                title="Actualizar datos"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors disabled:opacity-50 mb-2"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-pink-400" : ""}`} />
              </button>
            </div>

            {/* Content Body per Tab */}
            <div className="p-6 sm:p-8">
              {/* TAB 1: GOOGLE DRIVE */}
              {activeTab === "drive" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Folder className="w-5 h-5 text-blue-400" />
                        <span>Google Drive — Archivos de Producción</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {driveFiles.length} archivos sincronizados en tiempo real.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsCreatingFile(!isCreatingFile)}
                        className="px-3.5 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Nuevo Archivo</span>
                      </button>
                    </div>
                  </div>

                  {/* Create File Box (Optional Form) */}
                  {isCreatingFile && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-blue-400">Crear Documento en Google Drive</h4>
                      <input
                        type="text"
                        placeholder="Nombre del archivo (ej: Contrato Show 15 Anos.txt)"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-blue-400"
                      />
                      <textarea
                        rows={3}
                        placeholder="Contenido del documento..."
                        value={newFileContent}
                        onChange={(e) => setNewFileContent(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-blue-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsCreatingFile(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={triggerCreateDriveFile}
                          className="px-4 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold shadow-md"
                        >
                          Guardar con Permiso
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Filtrar archivos de Drive por nombre..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-zinc-500 outline-none focus:border-blue-400"
                    />
                  </div>

                  {/* Files List */}
                  <div className="space-y-2">
                    {driveFiles
                      .filter((f) => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
                      .map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Folder className="w-5 h-5 text-blue-400 shrink-0" />
                            <div className="truncate">
                              <p className="text-xs font-bold text-white truncate">{file.name}</p>
                              <p className="text-[10px] text-zinc-400">
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : "Drive"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
                                title="Abrir en Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => triggerDeleteDriveFile(file)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              title="Eliminar de Google Drive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}

                    {driveFiles.length === 0 && !isLoading && (
                      <p className="text-xs text-zinc-500 text-center py-8">
                        No se encontraron archivos en Google Drive o la carpeta está vacía.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: GMAIL */}
              {activeTab === "gmail" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-red-400" />
                        <span>Gmail — Bandeja de Entrada & Producción</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {gmailMessages.length} correos recientes sincronizados.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsComposingEmail(!isComposingEmail)}
                      className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Redactar Correo</span>
                    </button>
                  </div>

                  {/* Compose Email Form */}
                  {isComposingEmail && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-red-400">Redactar Correo desde tu Gmail</h4>
                      <input
                        type="email"
                        placeholder="Para: destinatario@ejemplo.com"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-red-400"
                      />
                      <input
                        type="text"
                        placeholder="Asunto: Propuesta Show 15 Años Di Grecco"
                        value={emailSubject}
                        onChange={(e) => setEmailSubject(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-red-400"
                      />
                      <textarea
                        rows={3}
                        placeholder="Escribe el cuerpo del mensaje..."
                        value={emailBody}
                        onChange={(e) => setEmailBody(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-red-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsComposingEmail(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={triggerSendEmail}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar con Confirmación</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Message List */}
                  <div className="space-y-2">
                    {gmailMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-white truncate max-w-[200px] sm:max-w-md">
                            {msg.from}
                          </span>
                          <span className="text-[10px] text-zinc-400">{msg.date}</span>
                        </div>
                        <p className="text-xs font-semibold text-red-300">{msg.subject}</p>
                        <p className="text-xs text-zinc-400 line-clamp-2">{msg.snippet}</p>
                      </div>
                    ))}

                    {gmailMessages.length === 0 && !isLoading && (
                      <p className="text-xs text-zinc-500 text-center py-8">
                        No hay mensajes recientes en la bandeja de entrada.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: GOOGLE CALENDAR */}
              {activeTab === "calendar" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-cyan-400" />
                        <span>Google Calendar — Shows & Ensayos Oficiales</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {calendarEvents.length} eventos y compromisos próximos.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddingEvent(!isAddingEvent)}
                      className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agendar Evento</span>
                    </button>
                  </div>

                  {/* Add Event Form */}
                  {isAddingEvent && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-cyan-400">Programar en Google Calendar</h4>
                      <input
                        type="text"
                        placeholder="Título: Ensayo General Show 15 Años Di Grecco"
                        value={eventSummary}
                        onChange={(e) => setEventSummary(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Fecha & Hora de Inicio</label>
                          <input
                            type="datetime-local"
                            value={eventStart}
                            onChange={(e) => setEventStart(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-1">Fecha & Hora de Fin</label>
                          <input
                            type="datetime-local"
                            value={eventEnd}
                            onChange={(e) => setEventEnd(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                          />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Descripción o lugar (opcional)"
                        value={eventDesc}
                        onChange={(e) => setEventDesc(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-cyan-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsAddingEvent(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={triggerCreateEvent}
                          className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-extrabold shadow-md"
                        >
                          Confirmar Evento
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Calendar Event List */}
                  <div className="space-y-2">
                    {calendarEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                      >
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            <span>{evt.summary}</span>
                          </p>
                          <p className="text-[11px] text-cyan-300 flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            <span>
                              {evt.start?.dateTime
                                ? new Date(evt.start.dateTime).toLocaleString()
                                : evt.start?.date || "Fecha por definir"}
                            </span>
                          </p>
                          {evt.description && (
                            <p className="text-[10px] text-zinc-400">{evt.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {evt.htmlLink && (
                            <a
                              href={evt.htmlLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors"
                              title="Abrir en Google Calendar"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => triggerDeleteEvent(evt)}
                            className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Eliminar evento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {calendarEvents.length === 0 && !isLoading && (
                      <p className="text-xs text-zinc-500 text-center py-8">
                        No hay eventos próximos en Google Calendar.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: GOOGLE FORMS */}
              {activeTab === "forms" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span>Google Forms — Cuestionarios de Debutantes</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {googleForms.length} formularios disponibles en tu cuenta.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsCreatingForm(!isCreatingForm)}
                      className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Crear Formulario</span>
                    </button>
                  </div>

                  {/* Create Form Input */}
                  {isCreatingForm && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-purple-400">Crear Formulario de Debutante en Google Forms</h4>
                      <input
                        type="text"
                        placeholder="Título del formulario (ej: Cuestionario Show 15 Años Di Grecco)"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-purple-400"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsCreatingForm(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={triggerCreateForm}
                          className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
                        >
                          Crear en Google Forms
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Forms List */}
                  <div className="space-y-2">
                    {googleForms.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-purple-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-white">{f.name}</p>
                            <p className="text-[10px] text-zinc-400">
                              {f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString() : "Google Forms"}
                            </p>
                          </div>
                        </div>

                        {f.webViewLink && (
                          <a
                            href={f.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-bold"
                          >
                            <span>Abrir Formulario</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    ))}

                    {googleForms.length === 0 && !isLoading && (
                      <p className="text-xs text-zinc-500 text-center py-8">
                        No hay formularios de Google creados aún. Haz clic en "Crear Formulario" para generar uno automáticamente.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: GOOGLE CONTACTS (PEOPLE API) */}
              {activeTab === "contacts" && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <span>Contactos de Google (People API)</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {contacts.length} contactos oficiales registrados.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsAddingContact(!isAddingContact)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Nuevo Contacto</span>
                    </button>
                  </div>

                  {/* Add Contact Box */}
                  {isAddingContact && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-emerald-400">Guardar Contacto en Google</h4>
                      <input
                        type="text"
                        placeholder="Nombre completo (ej: Valentina Rossi - Debutante)"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-emerald-400"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          placeholder="Email: contacto@ejemplo.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-emerald-400"
                        />
                        <input
                          type="tel"
                          placeholder="Teléfono: +55 11 98765-4321"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/60 border border-white/15 text-white text-xs outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsAddingContact(false)}
                          className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={triggerCreateContact}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold shadow-md"
                        >
                          Guardar con Permiso
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Contacts List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {contacts.map((c) => (
                      <div
                        key={c.resourceName}
                        className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-3"
                      >
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt={c.displayName}
                            className="w-10 h-10 rounded-full border border-emerald-400/50 object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                            {c.displayName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <p className="text-xs font-bold text-white truncate">{c.displayName}</p>
                          {c.email && <p className="text-[10px] text-zinc-400 truncate">{c.email}</p>}
                          {c.phoneNumber && (
                            <p className="text-[10px] text-emerald-400 font-mono">{c.phoneNumber}</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {contacts.length === 0 && !isLoading && (
                      <div className="col-span-2 text-xs text-zinc-500 text-center py-8">
                        No hay contactos disponibles en Google Contacts.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MANDATORY CONFIRMATION DIALOG (For Destructive/Mutating Operations)
          ========================================================================= */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md rounded-3xl glass-panel-glow border-2 border-white/20 p-6 bg-[#0c0c16] text-white shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`p-2 rounded-xl ${
                  confirmDialog.isDestructive ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-base text-white">{confirmDialog.title}</h4>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-6">
              {confirmDialog.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const runAction = confirmDialog.onConfirm;
                  setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
                  await runAction();
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-lg transition-transform hover:scale-102 active:scale-95 ${
                  confirmDialog.isDestructive
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white"
                }`}
              >
                {confirmDialog.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

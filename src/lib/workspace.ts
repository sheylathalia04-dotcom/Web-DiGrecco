import { auth, googleProvider } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";

// ============================================================================
// 🔐 GOOGLE WORKSPACE OAUTH SCOPES
// ============================================================================
export const WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/forms.body",
  "https://www.googleapis.com/auth/forms.responses.readonly",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/contacts.readonly",
];

// Configure scopes on the provider
WORKSPACE_SCOPES.forEach((scope) => {
  try {
    googleProvider.addScope(scope);
  } catch (e) {
    // Ignore duplicate scope registration
  }
});

// ============================================================================
// 💾 IN-MEMORY TOKEN CACHING (Strict: Never in localStorage/sessionStorage)
// ============================================================================
let cachedAccessToken: string | null = null;

auth.onAuthStateChanged((user: User | null) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

export function setCachedAccessToken(token: string | null) {
  cachedAccessToken = token;
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export async function connectGoogleWorkspace(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("No se pudo obtener el token de acceso de Google Workspace.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error("Error al conectar Google Workspace:", err);
    throw err;
  }
}

// Helper to ensure valid token
function requireToken(customToken?: string): string {
  const token = customToken || cachedAccessToken;
  if (!token) {
    throw new Error("Se requiere autenticación con Google para acceder a este servicio.");
  }
  return token;
}

// ============================================================================
// 1. 📁 GOOGLE DRIVE API
// ============================================================================
export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function fetchDriveFiles(token?: string): Promise<DriveFileItem[]> {
  const accessToken = requireToken(token);
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?pageSize=20&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,iconLink)",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al obtener archivos de Google Drive");
  }
  const data = await res.json();
  return data.files || [];
}

export async function uploadDriveFile(
  name: string,
  content: string,
  mimeType: string = "text/plain",
  token?: string
): Promise<DriveFileItem> {
  const accessToken = requireToken(token);
  const metadata = {
    name,
    mimeType,
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelim = "\r\n--" + boundary + "--";

  const multipartRequestBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelim;

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al crear archivo en Google Drive");
  }
  return res.json();
}

export async function deleteDriveFile(fileId: string, token?: string): Promise<void> {
  const accessToken = requireToken(token);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al eliminar archivo de Google Drive");
  }
}

// ============================================================================
// 2. ✉️ GMAIL API
// ============================================================================
export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet: string;
  from?: string;
  subject?: string;
  date?: string;
}

export async function fetchGmailMessages(token?: string): Promise<GmailMessageSummary[]> {
  const accessToken = requireToken(token);
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=category:primary OR label:INBOX",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!listRes.ok) {
    const err = await listRes.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al listar correos de Gmail");
  }

  const listData = await listRes.json();
  const messagesList = listData.messages || [];

  const detailedMessages: GmailMessageSummary[] = await Promise.all(
    messagesList.slice(0, 8).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId, snippet: "" };
        const detailData = await detailRes.json();
        const headers: { name: string; value: string }[] = detailData.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(Sin asunto)";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "Desconocido";
        const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detailData.snippet || "",
          subject,
          from,
          date,
        };
      } catch (e) {
        return { id: msg.id, threadId: msg.threadId, snippet: "" };
      }
    })
  );

  return detailedMessages;
}

export async function sendGmailMessage(
  to: string,
  subject: string,
  body: string,
  token?: string
): Promise<{ id: string; threadId: string }> {
  const accessToken = requireToken(token);

  // Encode RFC 2822 formatted email in standard base64url format
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${utf8Subject}`,
    "",
    body,
  ];
  const email = emailLines.join("\r\n");

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(email)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64EncodedEmail }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al enviar correo mediante Gmail");
  }
  return res.json();
}

// ============================================================================
// 3. 📅 GOOGLE CALENDAR API
// ============================================================================
export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
}

export async function fetchCalendarEvents(token?: string): Promise<CalendarEventItem[]> {
  const accessToken = requireToken(token);
  const now = new Date().toISOString();
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=15&singleEvents=true&orderBy=startTime`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al obtener eventos de Google Calendar");
  }
  const data = await res.json();
  return data.items || [];
}

export async function createCalendarEvent(
  eventData: {
    summary: string;
    description?: string;
    location?: string;
    startIso: string;
    endIso: string;
  },
  token?: string
): Promise<CalendarEventItem> {
  const accessToken = requireToken(token);
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: { dateTime: eventData.startIso },
      end: { dateTime: eventData.endIso },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al programar evento en Google Calendar");
  }
  return res.json();
}

export async function deleteCalendarEvent(eventId: string, token?: string): Promise<void> {
  const accessToken = requireToken(token);
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al eliminar evento de Google Calendar");
  }
}

// ============================================================================
// 4. 📋 GOOGLE FORMS API
// ============================================================================
export interface GoogleFormItem {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export async function fetchGoogleForms(token?: string): Promise<GoogleFormItem[]> {
  const accessToken = requireToken(token);
  // List Forms created or stored in Drive
  const res = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.form'&pageSize=15&orderBy=modifiedTime desc&fields=files(id,name,webViewLink,modifiedTime)",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al obtener formularios de Google");
  }
  const data = await res.json();
  return data.files || [];
}

export async function createDebutanteGoogleForm(
  title: string,
  description?: string,
  token?: string
): Promise<{ formId: string; responderUri: string }> {
  const accessToken = requireToken(token);
  // 1. Create the base Form
  const res = await fetch("https://forms.googleapis.com/v1/forms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      info: {
        title,
        documentTitle: title,
        description: description || "Formulario oficial de Di Grecco para la coordinación de Fiesta de 15 Años y Shows.",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al crear formulario en Google Forms");
  }
  const formData = await res.json();
  const formId = formData.formId;

  // 2. Add sample questions for Debutante coordination
  try {
    await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            createItem: {
              item: {
                title: "¿Cuál es el nombre de la quinceañera / debutante?",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: false },
                  },
                },
              },
              location: { index: 0 },
            },
          },
          {
            createItem: {
              item: {
                title: "¿Cuál es la fecha prevista para la fiesta de 15 años?",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: false },
                  },
                },
              },
              location: { index: 1 },
            },
          },
          {
            createItem: {
              item: {
                title: "¿Prefieres apertura de pista electrizante con bailarines o show pop acústico?",
                questionItem: {
                  question: {
                    required: false,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Show Pop Electrizante con Baile Sincronizado" },
                        { value: "Apertura de Pista + Ensayo con la Debutante" },
                        { value: "Show Completo con Bailarines" },
                      ],
                    },
                  },
                },
              },
              location: { index: 2 },
            },
          },
        ],
      }),
    });
  } catch (e) {
    console.warn("Questions creation warning:", e);
  }

  return {
    formId,
    responderUri: formData.responderUri || `https://docs.google.com/forms/d/${formId}/viewform`,
  };
}

// ============================================================================
// 5. 👥 GOOGLE CONTACTS (PEOPLE API)
// ============================================================================
export interface ContactPersonItem {
  resourceName: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  photoUrl?: string;
}

export async function fetchGoogleContacts(token?: string): Promise<ContactPersonItem[]> {
  const accessToken = requireToken(token);
  const res = await fetch(
    "https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos&pageSize=25",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al obtener contactos de Google");
  }
  const data = await res.json();
  const connections = data.connections || [];

  return connections.map((c: any) => ({
    resourceName: c.resourceName,
    displayName: c.names?.[0]?.displayName || "Sin nombre",
    email: c.emailAddresses?.[0]?.value,
    phoneNumber: c.phoneNumbers?.[0]?.value,
    photoUrl: c.photos?.[0]?.url,
  }));
}

export async function createGoogleContact(
  contactData: { givenName: string; familyName?: string; email?: string; phone?: string },
  token?: string
): Promise<ContactPersonItem> {
  const accessToken = requireToken(token);
  const personPayload: any = {
    names: [
      {
        givenName: contactData.givenName,
        familyName: contactData.familyName || "",
      },
    ],
  };

  if (contactData.email) {
    personPayload.emailAddresses = [{ value: contactData.email, type: "work" }];
  }
  if (contactData.phone) {
    personPayload.phoneNumbers = [{ value: contactData.phone, type: "mobile" }];
  }

  const res = await fetch("https://people.googleapis.com/v1/people:createContact?personFields=names,emailAddresses,phoneNumbers", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(personPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || "Error al crear contacto en Google People");
  }
  const created = await res.json();
  return {
    resourceName: created.resourceName,
    displayName: created.names?.[0]?.displayName || contactData.givenName,
    email: created.emailAddresses?.[0]?.value,
    phoneNumber: created.phoneNumbers?.[0]?.value,
  };
}

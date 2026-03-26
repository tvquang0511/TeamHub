import { httpClient } from "./http";

export type AttachmentType = "FILE" | "LINK";

export type Attachment =
  | {
      id: string;
      cardId: string;
      type: "FILE";
      bucket?: string;
      objectKey?: string;
      url?: string;
      fileName?: string;
      mimeType?: string;
      size?: number;
      uploaderId?: string;
      createdAt?: string;
    }
  | {
      id: string;
      cardId: string;
      type: "LINK";
      linkUrl: string;
      linkTitle?: string;
      uploaderId?: string;
      createdAt?: string;
    };

type ListEnvelope = { attachments: any[] };

type PresignUpload = {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  bucket: string;
  objectKey: string;
  url: string;
  expiresIn: number;
};

const mapAttachment = (a: any): Attachment => {
  if (a.type === "LINK") {
    return {
      id: a.id,
      cardId: a.cardId,
      type: "LINK",
      linkUrl: a.linkUrl,
      linkTitle: a.linkTitle ?? undefined,
      uploaderId: a.uploaderId ?? undefined,
      createdAt: a.createdAt ?? new Date().toISOString(),
    };
  }

  return {
    id: a.id,
    cardId: a.cardId,
    type: "FILE",
    bucket: a.bucket ?? undefined,
    objectKey: a.objectKey ?? undefined,
    url: a.url ?? undefined,
    fileName: a.fileName ?? undefined,
    mimeType: a.mimeType ?? undefined,
    size: a.size ?? undefined,
    uploaderId: a.uploaderId ?? undefined,
    createdAt: a.createdAt ?? new Date().toISOString(),
  };
};

export const attachmentsApi = {
  listByCard: async (cardId: string): Promise<Attachment[]> => {
    const res = await httpClient.get<ListEnvelope>(`/attachments/cards/${cardId}`);
    return (res.data.attachments || []).map(mapAttachment);
  },

  presignUpload: async (cardId: string, data: { fileName: string; mimeType: string; size: number }) => {
    const res = await httpClient.post<{ presign: PresignUpload }>(`/attachments/cards/${cardId}/presign`, data);
    return res.data.presign;
  },

  commitFile: async (
    cardId: string,
    data: {
      bucket: string;
      objectKey: string;
      url?: string;
      fileName: string;
      mimeType: string;
      size: number;
    },
  ) => {
    const res = await httpClient.post<{ attachment: any }>(`/attachments/cards/${cardId}/files`, data);
    return mapAttachment(res.data.attachment);
  },

  createLink: async (cardId: string, data: { linkUrl: string; linkTitle?: string }) => {
    const res = await httpClient.post<{ attachment: any }>(`/attachments/cards/${cardId}/links`, data);
    return mapAttachment(res.data.attachment);
  },

  presignDownload: async (attachmentId: string) => {
    const res = await httpClient.post<{ presign: { downloadUrl: string; method: "GET"; expiresIn: number } }>(
      `/attachments/${attachmentId}/presign-download`,
    );
    return res.data.presign;
  },

  delete: async (attachmentId: string): Promise<void> => {
    await httpClient.delete(`/attachments/${attachmentId}`);
  },

  /**
   * Direct-to-MinIO upload in browser.
   * Flow: presign PUT -> fetch(PUT) -> commit.
   */
  uploadFileToCard: async (cardId: string, file: File) => {
    const presign = await attachmentsApi.presignUpload(cardId, {
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });

    const putRes = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: presign.headers,
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Upload failed (${putRes.status})`);
    }

    return attachmentsApi.commitFile(cardId, {
      bucket: presign.bucket,
      objectKey: presign.objectKey,
      url: presign.url,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  },
};

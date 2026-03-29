import { httpClient } from "./http";

export type ChatPresignUpload = {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  bucket: string;
  objectKey: string;
  url: string;
  expiresIn: number;
};

export type ChatMessageAttachment = {
  id: string;
  bucket: string;
  objectKey: string;
  url: string | null;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export const chatAttachmentsApi = {
  presignUpload: async (boardId: string, data: { fileName: string; mimeType: string; size: number }) => {
    const res = await httpClient.post<{ presign: ChatPresignUpload }>(
      `/boards/${boardId}/messages/attachments/presign`,
      data,
    );
    return res.data.presign;
  },

  commitFile: async (
    boardId: string,
    data: {
      bucket: string;
      objectKey: string;
      url?: string;
      fileName: string;
      mimeType: string;
      size: number;
    },
  ) => {
    const res = await httpClient.post<{ attachment: any }>(
      `/boards/${boardId}/messages/attachments/files`,
      data,
    );

    const a = res.data.attachment;
    return {
      id: a.id,
      bucket: a.bucket,
      objectKey: a.objectKey,
      url: a.url ?? null,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt ?? new Date().toISOString(),
    } as ChatMessageAttachment;
  },

  presignDownload: async (boardId: string, attachmentId: string, disposition?: "inline" | "attachment") => {
    const res = await httpClient.post<{ presign: { downloadUrl: string; method: "GET"; expiresIn: number } }>(
      `/boards/${boardId}/messages/attachments/${attachmentId}/presign-download`,
      disposition ? { disposition } : undefined,
    );
    return res.data.presign;
  },

  /**
   * Direct-to-MinIO upload in browser.
   * Flow: presign PUT -> fetch(PUT) -> commit.
   */
  uploadFileToBoardChat: async (boardId: string, file: File) => {
    const presign = await chatAttachmentsApi.presignUpload(boardId, {
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

    return chatAttachmentsApi.commitFile(boardId, {
      bucket: presign.bucket,
      objectKey: presign.objectKey,
      url: presign.url,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
    });
  },
};

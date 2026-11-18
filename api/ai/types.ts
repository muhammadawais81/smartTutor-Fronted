// Types for the Teacher Assistant AI chat API

export interface AiChatRequest {
  message: string;
}

/**
 * The backend response shape isn't strictly documented, so we keep it flexible.
 * The service layer normalises whichever field carries the assistant reply.
 */
export interface AiChatResponse {
  response?: string;
  reply?: string;
  answer?: string;
  message?: string;
  content?: string;
  text?: string;
  data?: string | {response?: string; reply?: string; answer?: string; content?: string};
  [key: string]: unknown;
}

export class AiApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'AiApiError';
    this.status = status;
    this.details = details;
  }
}

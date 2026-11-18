import AGORA_CONFIG from '../config/agoraConfig';
import {fetchAgoraToken} from '../api/agora';

type ResolveArgs = {
  channelName: string;
  uid: number;
  token?: string;
  appId?: string;
};

export type AgoraConnectionData = {
  appId: string;
  channel: string;
  token: string;
  uid: number;
};

export const resolveAgoraConnectionData = async (
  args: ResolveArgs,
): Promise<AgoraConnectionData> => {
  const fallbackAppId = args.appId?.trim() || AGORA_CONFIG.appId?.trim();

  if (args.token && args.token.trim().length > 0) {
    if (!fallbackAppId) {
      throw new Error('Agora App ID is missing. Update config/agoraConfig.ts');
    }

    return {
      appId: fallbackAppId,
      channel: args.channelName,
      token: args.token,
      uid: args.uid,
    };
  }

  const response = await fetchAgoraToken(args.channelName, args.uid);
  const appId = response.appId?.trim() || fallbackAppId;

  if (!appId) {
    throw new Error('Agora App ID is missing. Update config/agoraConfig.ts');
  }

  const channel = response.channel || response.channel_name || args.channelName;

  return {
    appId,
    channel,
    token: response.token,
    uid: response.uid ?? args.uid,
  };
};

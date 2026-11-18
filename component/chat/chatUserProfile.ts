/**
 * Helpers for resolving the "other user" of a conversation:
 * - their display name + avatar (profile picture)
 * - the last message preview
 *
 * The chat endpoints return everything we need directly:
 * - List:   student_profile_picture / teacher_profile_picture (+ names)
 * - Detail: other_user_name / other_user_profile_picture (the other participant)
 */

import { Conversation, Message } from '../../api/chat/types';

/**
 * Work out who the "other" participant is for the current user, using the
 * fields the API provides on both list and detail responses.
 */
export const getOtherParticipant = (
  conversation: Conversation,
  currentUserId?: number,
): { id?: number; role: 'teacher' | 'student'; name?: string; picture?: string | null } => {
  // The current user is the teacher when their id matches teacher_id.
  const currentIsTeacher = currentUserId === conversation.teacher_id;
  const role: 'teacher' | 'student' = currentIsTeacher ? 'student' : 'teacher';

  // Detail response gives us the other participant directly.
  const detailName = conversation.other_user_name ?? conversation.other_user?.full_name;
  const detailPicture =
    conversation.other_user_profile_picture ?? conversation.other_user?.profile_picture;
  const detailId = conversation.other_user_id ?? conversation.other_user?.id;

  // List response: pick the side opposite to the current user.
  const listName = currentIsTeacher
    ? conversation.student_name
    : conversation.teacher_name;
  const listPicture = currentIsTeacher
    ? conversation.student_profile_picture
    : conversation.teacher_profile_picture;
  const listId = currentIsTeacher
    ? conversation.student_id
    : conversation.teacher_id;

  return {
    id: detailId ?? listId,
    role,
    name: detailName ?? listName,
    picture: detailPicture ?? listPicture ?? null,
  };
};

/**
 * Pick the most relevant "last message" object available on a conversation.
 */
export const getConversationLastMessage = (
  conversation: Conversation,
): Message | null => {
  if (conversation.last_message) {
    return conversation.last_message;
  }
  if (conversation.recent_messages && conversation.recent_messages.length > 0) {
    return conversation.recent_messages[conversation.recent_messages.length - 1];
  }
  return null;
};

/**
 * The list endpoint only returns `last_message_at` (a timestamp), not the
 * message text. For conversations that have messages but no preview text yet,
 * fetch the conversation details (which include `recent_messages`) so the list
 * can show the actual last message. Runs lookups in parallel.
 */
export const attachLastMessages = async (
  conversations: Conversation[],
  getDetails: (id: number) => Promise<Conversation>,
): Promise<Conversation[]> => {
  return Promise.all(
    conversations.map(async conv => {
      const alreadyHasPreview =
        !!conv.last_message ||
        (conv.recent_messages && conv.recent_messages.length > 0);

      // Only fetch when there is a message timestamp but no text yet.
      if (alreadyHasPreview || !conv.last_message_at) {
        return conv;
      }

      try {
        const details = await getDetails(conv.id);
        return { ...conv, ...details };
      } catch {
        return conv;
      }
    }),
  );
};

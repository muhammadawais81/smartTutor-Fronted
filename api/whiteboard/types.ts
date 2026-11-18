export type CreateWhiteboardRoomRequest = {
	subject_id?: number;
	teacher_id?: number;
	video_call_id?: number;
};

export type CreateWhiteboardRoomResponse = {
	roomId: string;
	roomKey: string;
	url: string;
};

export type EndWhiteboardRoomRequest = {
	roomId: string;
	roomKey?: string;
	subject_id?: number;
	teacher_id?: number;
	video_call_id?: number;
};

export type EndWhiteboardRoomResponse = {
	status: string;
	roomId: string;
};

export type ActiveWhiteboardResponse = {
	roomId: string;
	roomKey: string;
	url: string;
	video_call_id?: number;
	subject_id?: number;
	teacher_id?: number;
	created_at?: string;
} | null;

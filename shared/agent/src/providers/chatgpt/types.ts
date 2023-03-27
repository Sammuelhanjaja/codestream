export type ChatGptMessage = { role: string; content: string };

export type ChatGptUsage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
};

export type ChatGptChoices = {
	finish_reason: string;
	message?: ChatGptMessage;
	index: number;
};

export type ChatGptResponse = ChatGptSuccessResponse | ChatGptErrorResponse;

export type ChatGptSuccessResponse = {
	id: string;
	object: string;
	created: number;
	model: string;
	usage: ChatGptUsage;
	choices: ChatGptChoices[];
};

export type ChatGptErrorResponse = {
	error: { message: string; type: string; param?: string; code: string };
};

export function isChatGptErrorResponse(obj: unknown): obj is ChatGptErrorResponse {
	return (obj as ChatGptErrorResponse).error !== undefined;
}

export type ChatApiResponse = string;

export type ChatGptRequest = {
	model: string;
	messages: ChatGptMessage[];
	temperature?: number;
	top_p?: number;
	n?: number;
	stream?: boolean;
	stop?: string | string[];
	max_tokens?: number;
	presence_penalty?: number;
	frequency_penalty?: number;
	logit_bias?: Map<string, number>;
	user?: string; // internal id to pass along to monitor and check abuse
};

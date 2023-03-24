import { customFetch } from "../../system/fetchCore";
import { memoize } from "lodash-es";
import path from "path";
import fs from "fs";
import { ResponseError } from "vscode-jsonrpc/lib/messages";
import { ERROR_CHATGPT_LICENSE } from "@codestream/protocols/agent";
import os from "os";
import Cache from "timed-cache";

const apiUrl = "https://api.openai.com/v1/chat/completions";

const codeStreamDirectory = path.join(os.homedir(), ".codestream");

const getApiKey = memoize((): string | undefined => {
	const licensePath = path.join(codeStreamDirectory, "chatgpt.license");
	if (!fs.existsSync(licensePath)) {
		return undefined;
	}
	const license = fs.readFileSync(licensePath, "utf8");
	return license.trim();
});

type ChatGptMessage = { role: string; content: string };

type ChatGptUsage = {
	prompt_tokens: number;
	completion_tokens: number;
	total_tokens: number;
};

type ChatGptChoices = {
	finish_reason: string;
	message: ChatGptMessage;
	index: number;
};

type ChatGptResponse = {
	id: string;
	object: string;
	created: number;
	model: string;
	usage: ChatGptUsage;
	choices: ChatGptChoices[];
};

type ChatApiResponse = string;

const conversationCache = new Cache<Array<ChatGptMessage>>({ defaultTtl: 300 * 60 * 1000 });

export async function getChatResponse(
	id: string,
	prompt: string,
	role = "user"
): Promise<ChatApiResponse> {
	let conversation = conversationCache.get(id);
	if (!conversation) {
		conversation = new Array<ChatGptMessage>();
		conversationCache.put(id, conversation);
	}
	conversation.push({ role, content: prompt });
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new ResponseError(ERROR_CHATGPT_LICENSE, "Could not find chatgpt license");
	}

	const response = await customFetch(apiUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${getApiKey()}`,
		},
		body: JSON.stringify({
			model: "gpt-3.5-turbo",
			messages: conversation,
		}),
	});

	const apiResponse: ChatGptResponse = await response.json();
	const responseMessage = `${apiResponse.choices[0].message.content}`;
	conversation.push({ role: "assistant", content: responseMessage });
	return `#chatgpt#${responseMessage}`;

	// const data: { choices: ChatResponse[] } = await response.json();
	// return data.choices[0].text.trim();
}

// const error = "FetchError: request to https://source.datanerd.us/api/v3/search/issues?q=archived%3Afalse%20is%3Aissue%20is%3Aopen%20assignee%3A%40me&sort=updated failed, reason: connect ETIMEDOUT 34.210.10.92:443             at ClientRequest.<anonymous> (/Users/ngarcia/.codestream/node_modules/node-fetch/lib/index.js:1491:11)                                                                              /at ClientRequest.emit (node:events:390:28)                                                                   /at TLSSocket.socketErrorListener (node:_http_client:447:9)                                                                                  /at TLSSocket.emit (node:events:390:28)                                                                                     /at emitErrorNT (node:internal/streams/destroy:157:8)                                                                                /at emitErrorCloseNT (node:internal/streams/destroy:122:3)                                                                       /at processTicksAndRejections (node:internal/process/task_queues:83:21)\n" +
// 	"No logs found\n" +
// 	"timestamp\n" +
// 	"Mar 23 7:24 PM\n";

// const error = "Object reference not set to an instance of an object.\n" +
// 	"System.NullReferenceException: Object reference not set to an instance of an object. at SubZero.Public.Web.Controllers.Components.PageContentController.OtherRelatedBrandsCategoriesProducts()\n" +
// 	"at lambda_method(Closure , ControllerBase , Object!] )\n" +
// 	"at System.Web.Mvc.ControllerActionInvoker. InvokeActionMethod(ControllerContext controllerContext, ActionDescriptor actionDescriptor,\n" +
// 	"IDictionary'2 parameters)\n" +
// 	"at System.Web.Mvc.ControllerActionInvoker.<>c_DisplayClass24_0.<InvokeActionMethodWithFilters>b0( at System.Web.Mvc. ControllerActionInvoker. InvokeActionMethodFilter(IActionFilter filter, ActionExecutingContext preContext,\n" +
// 	"Func'1 continuation)\n" +
// 	"at System.Web.Mvc.ControllerActionInvoker. InvokeActionMethodFilter(IActionFilter filter, ActionExecutingContext preContext,\n" +
// 	"Func' 1 continuation)\n" +
// 	"at System.Web.Mvc. ControllerActionInvoker. InvokeAction(ControllerContext controllerContext, String actionName)";
//
// // Example usage
// getChatResponse(`What language is this stack trace from?\n${error}`).then(response => {
// 	console.log(response);
// 	process.exit(0);
// });

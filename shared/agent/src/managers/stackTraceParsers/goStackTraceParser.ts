"use strict";

import { CSStackTraceInfo } from "@codestream/protocols/api";

import { Strings } from "../../system";

let regex: RegExp;

export function Parser(stack: string): CSStackTraceInfo {
	const info: CSStackTraceInfo = { text: stack, lines: [], language: "go" };

	if (!stack) return info;

	if (!regex) {
		// NOTE: there's no great way to have a multiline regex in js (except for this hackery ;)
		// so we build it once

		regex = Strings.regexBuilder`^(.+)\s\((.+?)(\:(\d+))?\)$`;
	}

	let m;
	while ((m = regex.exec(stack)) !== null) {
		// This is necessary to avoid infinite loops with zero-width matches
		if (m.index === regex.lastIndex) {
			regex.lastIndex++;
		}

		info.lines.push({
			method: (m[1] || "").replace(/\t/g, ""),
			arguments: undefined,
			fileFullPath: m[2],
			line: parseInt(m[4], 10),
			column: undefined,
		});
	}
	return info;
}

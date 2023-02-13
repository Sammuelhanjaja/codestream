"use strict";

import { FLTNameInferenceStrategy } from "./FLTNameInferenceStrategy";

export class FLTNameInferenceJavaStrategy extends FLTNameInferenceStrategy {
	getMetricLookup(): string {
		return `metricTimesliceName LIKE '%/${this.getNamespace()}/%'`;
	}

	getSpanLookup(): string {
		return `name LIKE '%/${this.getNamespace()}/%'`;
	}

	extractSymbol(spanName: string) {
		const parts = spanName.split("/");
		const method = parts[parts.length - 1];
		const clazz = parts[parts.length - 2];
		return {
			namespace: clazz, // what is this?
			className: clazz,
			functionName: method,
		};
	}

	private getNamespace() {
		return (this.request.locator?.namespaces || [])[0];
	}
}

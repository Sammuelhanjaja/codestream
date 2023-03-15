import { SessionContainer } from "../../container";
import {
	AgentFilterNamespacesRequestType,
	ObservabilityAnomaly,
} from "@codestream/protocols/agent";

interface NameValue {
	name: string;
	value: number;
}

interface Anomaly {
	name: string;
	oldValue: number;
	newValue: number;
	ratio: number;
}

export class AnomalyDetector {
	constructor(
		private entityGuid: string,
		private accountId: number,
		private _runNrql: <T>(accountId: number, nrql: string, timeout: number) => Promise<T[]>
	) {}

	async execute(includeSpans: Boolean = false): Promise<{
		responseTime: ObservabilityAnomaly[];
		errorRate: ObservabilityAnomaly[];
	}> {
		const sampleRatesMetricLookup =
			"(metricTimesliceName LIKE 'Java/%' OR metricTimesliceName LIKE 'Custom/%')";
		const sampleRatesMetric = await this.getSampleRateMetric(
			this._dataTimeFrame,
			sampleRatesMetricLookup
		);
		const metricRoots = this.getCommonRoots(sampleRatesMetric.map(_ => _.name));
		const metricLookup = metricRoots.length
			? metricRoots.map(_ => `\`metricTimesliceName\` LIKE '%${_}%'`).join(" OR ")
			: "1 != 1";

		let sampleRatesSpan: NameValue[] = [];
		let spanLookup = "1 != 1";
		if (includeSpans) {
			const sampleRatesSpanLookup = "(name LIKE 'Java/%' OR name LIKE 'Custom/%')";
			sampleRatesSpan = await this.getSampleRateSpan(this._dataTimeFrame, sampleRatesSpanLookup);
			const spanRoots = this.getCommonRoots(sampleRatesSpan.map(_ => _.name));
			spanLookup = spanRoots.length
				? spanRoots.map(_ => `name LIKE '${_}%'`).join(" OR ")
				: "1 != 1";
		}

		const consolidatedSampleRates = this.consolidateSampleRates(sampleRatesMetric, sampleRatesSpan);

		const responseTimeAnomalies = await this.getResponseTimeAnomalies(
			metricLookup,
			spanLookup,
			sampleRatesMetric,
			sampleRatesSpan,
			consolidatedSampleRates
		);

		const errorRateAnomalies = await this.getErrorRateAnomalies(
			metricLookup,
			spanLookup,
			sampleRatesMetric,
			sampleRatesSpan,
			consolidatedSampleRates
		);

		return {
			responseTime: responseTimeAnomalies,
			errorRate: errorRateAnomalies,
		};
	}

	private async getResponseTimeAnomalies(
		lookupMetric: string,
		lookupSpan: string,
		sampleRatesMetric: NameValue[],
		sampleRatesSpan: NameValue[],
		consolidatedSampleRates: Map<string, { span?: NameValue; metric?: NameValue }>
	): Promise<ObservabilityAnomaly[]> {
		const metricData = await this.getResponseTimeMetric(lookupMetric, this._dataTimeFrame);
		const metricBaseline = await this.getResponseTimeMetric(lookupMetric, this._baselineTimeFrame);
		const metricFilter = this.getSampleRateFilterPredicate(sampleRatesMetric);
		const filteredMetricData = metricData.filter(metricFilter);
		const filteredMetricBaseline = metricBaseline.filter(metricFilter);
		const metricComparison = this.compareData(filteredMetricData, filteredMetricBaseline);

		const spanData = await this.getResponseTimeSpan(lookupSpan, this._dataTimeFrame);
		const spanBaseline = await this.getResponseTimeSpan(lookupSpan, this._baselineTimeFrame);
		const spanFilter = this.getSampleRateFilterPredicate(sampleRatesSpan);
		const filteredSpanData = spanData.filter(spanFilter);
		const filteredSpanBaseline = spanBaseline.filter(spanFilter);
		const spanComparison = this.compareData(filteredSpanData, filteredSpanBaseline);

		const consolidatedComparison = this.consolidateComparisons(
			consolidatedSampleRates,
			metricComparison,
			spanComparison
		).filter(_ => _.ratio > 0);

		return consolidatedComparison.map(_ => this.comparisonToAnomaly(_));
	}

	private async getErrorRateAnomalies(
		lookupMetric: string,
		lookupSpan: string,
		sampleRatesMetric: NameValue[],
		sampleRatesSpan: NameValue[],
		consolidatedSampleRates: Map<string, { span?: NameValue; metric?: NameValue }>
	) {
		const metricData = await this.getErrorRateMetric(lookupMetric, this._dataTimeFrame);
		const metricBaseline = await this.getErrorRateMetric(lookupMetric, this._baselineTimeFrame);
		const metricFilter = this.getSampleRateFilterPredicate(sampleRatesMetric);
		const metricTransformer = this.getErrorRateTransformer(sampleRatesMetric);
		const filteredMetricData = metricData.filter(metricFilter).map(metricTransformer);
		const filteredMetricBaseline = metricBaseline.filter(metricFilter).map(metricTransformer);
		const metricComparison = this.compareData(filteredMetricData, filteredMetricBaseline);

		const spanData = await this.getErrorRateSpan(lookupSpan, this._dataTimeFrame);
		const spanBaseline = await this.getErrorRateSpan(lookupSpan, this._baselineTimeFrame);
		const spanFilter = this.getSampleRateFilterPredicate(sampleRatesSpan);
		const spanTransformer = this.getErrorRateTransformer(sampleRatesSpan);
		const filteredSpanData = spanData.filter(spanFilter).map(spanTransformer);
		const filteredSpanBaseline = spanBaseline.filter(spanFilter).map(spanTransformer);
		const spanComparison = this.compareData(filteredSpanData, filteredSpanBaseline);

		const consolidatedComparisons = this.consolidateComparisons(
			consolidatedSampleRates,
			metricComparison,
			spanComparison
		).filter(_ => _.ratio > 0 && _.newValue > 0.001);

		return consolidatedComparisons.map(_ => this.comparisonToAnomaly(_));
	}

	private getSampleRateFilterPredicate(sampleRates: NameValue[]) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(sampleRate => data.name === sampleRate.name);
			return sampleRate && sampleRate.value >= 10; // >= 1 rpm
		};
	}

	private getErrorRateTransformer(sampleRates: NameValue[]) {
		return (data: NameValue) => {
			const sampleRate = sampleRates.find(sampleRate => data.name === sampleRate.name);
			return {
				name: data.name,
				value: data.value / (sampleRate?.value || 1),
			};
		};
	}

	private consolidateComparisons(
		consolidatedSampleRates: Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>,
		metricComparisons: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[],
		spanComparisons: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[]
	) {
		const consolidatedComparisons: {
			name: string;
			source: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[] = [];

		for (const [symbolStr, consolidatedSampleRate] of consolidatedSampleRates.entries()) {
			const useMetric =
				consolidatedSampleRate.metric &&
				(!consolidatedSampleRate.span ||
					consolidatedSampleRate.metric.value / consolidatedSampleRate.span.value >= 0.8);
			if (useMetric) {
				const metricComparison = metricComparisons.find(_ => {
					const symbol = this.extractSymbol(_.name);
					const mySymbolStr = symbol.className + "/" + symbol.functionName;
					return symbolStr === mySymbolStr;
				});
				if (metricComparison) {
					consolidatedComparisons.push({
						...metricComparison,
						source: "metric",
					});
				}
			} else {
				const spanComparison = spanComparisons.find(_ => {
					const symbol = this.extractSymbol(_.name);
					const mySymbolStr = symbol.className + "/" + symbol.functionName;
					return symbolStr === mySymbolStr;
				});
				if (spanComparison) {
					consolidatedComparisons.push({
						...spanComparison,
						source: "span",
					});
				}
			}
		}

		consolidatedComparisons.sort((a, b) => b.ratio - a.ratio);
		return consolidatedComparisons;
	}

	private consolidateSampleRates(sampleRatesMetric: NameValue[], sampleRatesSpan: NameValue[]) {
		const consolidatedSampleRates = new Map<
			string,
			{
				span?: NameValue;
				metric?: NameValue;
			}
		>();

		for (const sampleRate of sampleRatesMetric) {
			if (sampleRate.value < 1) {
				continue;
			}
			const symbol = this.extractSymbol(sampleRate.name);
			const symbolStr = symbol.className + "/" + symbol.functionName;
			consolidatedSampleRates.set(symbolStr, { metric: sampleRate });
		}

		for (const sampleRate of sampleRatesSpan) {
			if (sampleRate.value < 1) {
				continue;
			}
			const symbol = this.extractSymbol(sampleRate.name);
			const symbolStr = symbol.className + "/" + symbol.functionName;
			const consolidatedSampleRate = consolidatedSampleRates.get(symbolStr) || {};
			consolidatedSampleRate.span = sampleRate;
			consolidatedSampleRates.set(symbolStr, consolidatedSampleRate);
		}
		return consolidatedSampleRates;
	}

	private readonly _dataTimeFrame = "SINCE 7 days AGO";
	private readonly _baselineTimeFrame = "SINCE 21 days AGO UNTIL 7 days AGO";

	getCommonRoots(namespaces: string[]): string[] {
		const namespaceTree = new Map<string, any>();
		for (const namespace of namespaces) {
			const parts = namespace.split(".");
			let node: Map<string, any> = namespaceTree;
			for (const part of parts) {
				if (!node.has(part)) {
					node.set(part, new Map<string, any>());
				}
				node = node.get(part);
			}
		}

		const commonRoots: string[] = [];
		namespaceTree.forEach((value: any, key: string) => {
			const parts = [key];
			let node: Map<string, any> = value;
			while (node.size === 1) {
				const onlyChild = Array.from(node.entries())[0];
				parts.push(onlyChild[0]);
				node = onlyChild[1];
			}
			commonRoots.push(parts.join("."));
		});

		return commonRoots;
	}

	private formatAnomalies(anomalies: Anomaly[]) {
		return anomalies.map(_ => this.formatAnomaly(_));
	}

	private formatAnomaly(anomaly: Anomaly) {
		const variation = (anomaly.ratio - 1) * 100;
		const formattedVariation = (Math.round(variation * 100) / 100).toFixed(2);
		const formattedName = anomaly.name.replace(/(^Custom\/|Java\/)/gi, "");
		const text = formattedName + (variation > 0 ? " +" : " ") + formattedVariation + "%";
		return text;
	}

	private compareData(data: NameValue[], baseline: NameValue[]) {
		const comparisonMap = this.comparisonMap(data, baseline);
		const comparisonArray: {
			name: string;
			oldValue: number;
			newValue: number;
			ratio: number;
		}[] = [];
		comparisonMap.forEach((value, key) => {
			if (value.oldValue && value.newValue && value.ratio) {
				comparisonArray.push({
					name: key,
					oldValue: value.oldValue,
					newValue: value.newValue,
					ratio: value.ratio,
				});
			}
		});
		comparisonArray.sort((a, b) => b.ratio - a.ratio);
		return comparisonArray;
	}

	private comparisonMap(data: NameValue[], baseline: NameValue[]) {
		const map = new Map<string, { oldValue?: number; newValue?: number; ratio?: number }>();
		for (const d of data) {
			map.set(d.name, { newValue: d.value });
		}
		for (const b of baseline) {
			const comparison = map.get(b.name);
			if (comparison && comparison.newValue) {
				comparison.oldValue = b.value;
				comparison.ratio = comparison.newValue / comparison.oldValue;
			}
		}
		return map;
	}

	private getResponseTimeSpan(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(duration) * 1000 AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	getResponseTimeMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT average(newrelic.timeslice.value) * 1000 AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private getErrorRateSpan(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND \`error.group.guid\` IS NOT NULL AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getErrorRateMetric(lookup: string, timeFrame: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(apm.service.transaction.error.count), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		return this.runNrql(query);
	}

	private async getSampleRateSpan(timeFrame: string, lookup: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(*), 1 minute) AS 'value' ` +
			`FROM Span WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET name ` +
			`${timeFrame} LIMIT MAX`;

		const sampleRates = await this.runNrql<NameValue>(query);
		const filteredSampleRates = await this.filterSampleRates(sampleRates);
		return filteredSampleRates;
	}

	private async filterSampleRates(sampleRates: NameValue[]) {
		const classNames = await this.extractClassNames(sampleRates.map(_ => _.name));
		const { filteredNamespaces } = await SessionContainer.instance().session.agent.sendRequest(
			AgentFilterNamespacesRequestType,
			{
				namespaces: classNames,
			}
		);

		const filteredSampleRates = sampleRates.filter(sampleRate =>
			filteredNamespaces.some(namespace => sampleRate.name.indexOf(namespace) >= 0)
		);
		return filteredSampleRates;
	}

	private async getSampleRateMetric(timeFrame: string, lookup: string): Promise<NameValue[]> {
		const query =
			`SELECT rate(count(newrelic.timeslice.value), 1 minute) AS 'value' ` +
			`FROM Metric WHERE \`entity.guid\` = '${this.entityGuid}' AND (${lookup}) FACET metricTimesliceName AS name ` +
			`${timeFrame} LIMIT MAX`;
		const sampleRates = await this.runNrql<NameValue>(query);
		const filteredSampleRates = await this.filterSampleRates(sampleRates);
		return filteredSampleRates;
	}

	private async extractClassNames(rawNames: string[]) {
		return rawNames.map(_ => {
			const symbol = this.extractSymbol(_);
			return symbol.className;
		});
	}

	extractSymbol(rawName: string) {
		const parts = rawName.split("/");
		const functionName = parts[parts.length - 1];
		const className = parts[parts.length - 2];
		return {
			className,
			functionName,
		};
	}

	private runNrql<T>(nrql: string): Promise<T[]> {
		return this._runNrql(this.accountId, nrql, 200);
	}

	private comparisonToAnomaly(comparison: {
		name: string;
		source: string;
		oldValue: number;
		newValue: number;
		ratio: number;
	}): ObservabilityAnomaly {
		const symbol = this.extractSymbol(comparison.name);
		return {
			...comparison,
			...symbol,
			text: this.formatAnomaly(comparison),
		};
	}
}

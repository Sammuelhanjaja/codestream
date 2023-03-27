import { Ranges } from "../../../src/api/extensions";

describe("range", () => {
	it("should range", () => {
		expect(
			Ranges.ensureStartBeforeEnd({
				start: { line: 0, character: 0 },
				end: { line: 1, character: 0 },
			})
		).toStrictEqual({ start: { line: 0, character: 0 }, end: { line: 1, character: 0 } });
	});

	it("should rangeier", () => {
		expect(
			Ranges.ensureStartBeforeEnd({
				start: { line: 1, character: 0 },
				end: { line: 0, character: 0 },
			})
		).toStrictEqual({ start: { line: 0, character: 0 }, end: { line: 1, character: 0 } });
	});
});

module.exports = {
	collectCoverageFrom: [
		"<rootDir>/src/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Authentication/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Container/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/Stream/**/*.{js,jsx,ts,tsx}",
		"!<rootDir>/node_modules/",
	],
	coverageReporters: ["clover", "json", "lcov", "text", "teamcity"],
	coverageThreshold: {
		global: {
			lines: 5,
			statements: 5,
		},
	},
	moduleNameMapper: {
		"^react-native$": "react-native-web",
		"^.+\\.module\\.(css|sass|scss)$": "identity-obj-proxy",
		"^lodash-es$": "lodash",
		"@codestream/webview/Stream/Markdowner": "<rootDir>/Stream/Markdowner.ts",
		"@codestream/webview/logger": ["<rootDir>/logger.ts"],
		"codestream-common/agent-protocol": "<rootDir>/../common/src/protocols/agent/agent.protocol.ts",
		"codestream-common/api-protocol": "<rootDir>/../common/src/protocols/agent/api.protocol.ts",
		"@codestream/protocols/webview": "<rootDir>/ipc/webview.protocol.ts",
		"@codestream/webview/utils": "<rootDir>/utils.ts",
		"@codestream/webview/(.*)": "<rootDir>/$1",
	},
	setupFilesAfterEnv: ["@testing-library/jest-dom/extend-expect"],
	testMatch: [
		"<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
		"<rootDir>/src/**/*.{spec,test}.{js,jsx,ts,tsx}",
	],
	testResultsProcessor: "jest-teamcity-reporter",
	transformIgnorePatterns: ["node_modules/(?!d3-color)"],
	watchPlugins: ["jest-watch-typeahead/filename", "jest-watch-typeahead/testname"],
};

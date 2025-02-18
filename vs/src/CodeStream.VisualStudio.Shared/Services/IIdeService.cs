﻿using System;
using System.Threading.Tasks;
using System.Windows.Forms;
using CodeStream.VisualStudio.Core.Models;
using CodeStream.VisualStudio.Shared.Models;
using Microsoft.VisualStudio.Text;
using Microsoft.VisualStudio.Text.Differencing;
using Microsoft.VisualStudio.Text.Editor;

namespace CodeStream.VisualStudio.Shared.Services {
	public interface IIdeService {
		void Navigate(string url);
		Task SetClipboardAsync(string text);
		void ScrollEditor(Uri fileUri, int? scrollTo = null, int? deltaPixels = null, bool? atTop = false);
		Task<OpenEditorResult> OpenEditorAndRevealAsync(Uri fileUri, int? scrollTo = null, bool? atTop = false, bool? focus = false);
		Task<IWpfTextView> OpenEditorAtLineAsync(Uri fileUri, Range range, bool forceOpen = false);
		FolderBrowserDialog FolderPrompt(string message, string initialDirectory = null, bool multiSelect = false);

		// Diff Services
		void CompareTempFiles(string filePath, string content, ITextBuffer textBuffer, Span span, string markerContent, string title);
		void CompareWithRightTempFile(string filePath, string content, ITextBuffer textBuffer, Span span, string markerContent, string title);

		// Other kinds of Diffs?
		void DiffTextBlocks(string originalFilePath, string leftContent, string rightContent, string title);

		// for PRs
		void PullRequestDiff(
			string originalFilePath,
			string leftContent,
			PullRequestDiffUri left,
			string rightContent,
			PullRequestDiffUri right,
			string title);

		// for PRs
		void FeedbackRequestDiff(
			string originalFilePath,
			string leftContent,
			FeedbackRequestDiffUri leftData,
			string rightContent,
			FeedbackRequestDiffUri rightData,
			string title);

		IDifferenceViewer GetActiveDiffEditor();
		void TryCloseDiffs();
	}
}

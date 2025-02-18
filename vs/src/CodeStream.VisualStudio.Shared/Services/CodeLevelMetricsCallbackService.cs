﻿using System;
using System.Collections.Concurrent;
using System.ComponentModel.Composition;
using System.IO.Pipes;
using System.Linq;
using CodeStream.VisualStudio.Core.Logging;
using Microsoft.VisualStudio.Language.CodeLens;
using Microsoft.VisualStudio.Utilities;
using Serilog;
using System.Reactive.Concurrency;
using System.Reactive.Linq;
using CodeStream.VisualStudio.Core.Models;
using Microsoft.VisualStudio.Shell;
using Microsoft.VisualStudio.Shell.Interop;
using Task = System.Threading.Tasks.Task;
using System.Threading.Tasks;
using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.CodeLevelMetrics;
using CodeStream.VisualStudio.Core.Enums;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Models;
using Process = System.Diagnostics.Process;
using Microsoft;
using CSConstants = CodeStream.VisualStudio.Core.Constants;

namespace CodeStream.VisualStudio.Shared.Services {

	/// <summary>
	/// Service gets injected into the CodeLensProvider in the OOP service and allows the CodeLens datapoints to communicate
	/// back to Visual Studio.
	/// </summary>
	[Export(typeof(ICodeLensCallbackListener))]
	[PartCreationPolicy(CreationPolicy.Shared)]
	[ContentType("CSharp")]
	public class CodeLevelMetricsCallbackService : ICodeLensCallbackListener, ICodeLevelMetricsCallbackService {
		private static readonly ILogger Log = LogManager.ForContext<CodeLevelMetricsCallbackService>();

		private readonly ICodeStreamAgentService _codeStreamAgentService;
		private readonly ISessionService _sessionService;
		private readonly ISettingsServiceFactory _settingsServiceFactory;

		public static readonly ConcurrentDictionary<string, CodeLensConnection> Connections = new ConcurrentDictionary<string, CodeLensConnection>();
		private readonly IVsSolution _vsSolution;

		[ImportingConstructor]
		public CodeLevelMetricsCallbackService(
			ICodeStreamAgentService codeStreamAgentService,
			ISessionService sessionService,
			ISettingsServiceFactory settingsServiceFactory,
			IEventAggregator eventAggregator,
			[Import(typeof(SVsServiceProvider))] IServiceProvider serviceProvider) {
			_codeStreamAgentService = codeStreamAgentService;
			_sessionService = sessionService;
			_settingsServiceFactory = settingsServiceFactory;

			eventAggregator.GetEvent<SessionReadyEvent>()
				.ObserveOn(Scheduler.Default)
				.Subscribe(e => {
					_ = RefreshAllCodeLensDataPointsAsync();
				});

			eventAggregator.GetEvent<SessionLogoutEvent>()
				.ObserveOn(Scheduler.Default)
				.Subscribe(e => {
					_ = RefreshAllCodeLensDataPointsAsync();
				});

			_vsSolution = serviceProvider.GetService(typeof(SVsSolution)) as IVsSolution;
			Assumes.Present(_vsSolution);
		}

		public async Task<CodeLevelMetricsTelemetry> GetTelemetryAsync(string codeNamespace, string functionName) {
			if (!_sessionService.IsReady)
			{
				return new CodeLevelMetricsTelemetry();
			}
		
			await ThreadHelper.JoinableTaskFactory.SwitchToMainThreadAsync();
			var solution = new Uri(_vsSolution.GetSolutionFile());

			//example: "avg duration: ${averageDuration} | error rate: ${errorRate} - ${sampleSize} samples in the last ${since}"
			var formatString = CSConstants.CodeLevelMetrics.GoldenSignalsFormat.ToLower();
			var includeAverageDuration = formatString.Contains(CSConstants.CodeLevelMetrics.Tokens.AverageDuration);
			var includeErrorRate = formatString.Contains(CSConstants.CodeLevelMetrics.Tokens.ErrorRate);

			try {
				var metrics = await _codeStreamAgentService.GetFileLevelTelemetryAsync(
					solution.AbsoluteUri,
					"csharp",
					false,
					codeNamespace,
					functionName,
					includeAverageDuration, 
					includeErrorRate
				);

				if (metrics is null)
				{
					return new CodeLevelMetricsTelemetry();
				}

				return new CodeLevelMetricsTelemetry(
					metrics.AverageDuration,
					metrics.SampleSize,
					metrics.ErrorRate,
					metrics.SinceDateFormatted,
					metrics.Repo,
					metrics.NewRelicEntityGuid);

			}
			catch (Exception ex) {
				Log.Error(ex, $"Unable to obtain CLM for {codeNamespace}.{functionName}");
				return new CodeLevelMetricsTelemetry();
			}
		}

		public CodeLevelMetricStatus GetClmStatus() {
			if (!_sessionService.IsAgentReady || _sessionService.SessionState == SessionState.UserSigningIn) {
				return CodeLevelMetricStatus.Loading;
			}

			if (_sessionService.SessionState != SessionState.UserSignedIn) {
				return CodeLevelMetricStatus.SignInRequired;
			}

			return CodeLevelMetricStatus.Ready;
		}

		public int GetVisualStudioPid() => Process.GetCurrentProcess().Id;

		public async Task InitializeRpcAsync(string dataPointId) {
			try {
				var stream = new NamedPipeServerStream(
					RpcPipeNames.ForCodeLens(Process.GetCurrentProcess().Id),
					PipeDirection.InOut,
					NamedPipeServerStream.MaxAllowedServerInstances,
					PipeTransmissionMode.Byte,
					PipeOptions.Asynchronous);

				await stream.WaitForConnectionAsync().ConfigureAwait(false);

				var connection = new CodeLensConnection(stream);
				Connections[dataPointId] = connection;
			}
			catch (Exception ex) {
				Log.Error(ex, "Unable to bind CallbackService and RPC");
			}
		}

		/// <summary>
		/// Refresh a SPECIFIC CodeLens datapoint through RPC
		/// </summary>
		public static async Task RefreshCodeLensDataPointAsync(string dataPointId) {
			if (!Connections.TryGetValue(dataPointId, out var connectionHandler)) {
				throw new InvalidOperationException($"CodeLens data point {dataPointId} was not registered.");
			}

			await connectionHandler.Rpc.InvokeAsync(nameof(IRemoteCodeLens.Refresh)).ConfigureAwait(false);
		}

		/// <summary>
		/// All RPC connections to the CodeLens datapoints are tracked, therefore
		/// we can trigger them ALL to refresh using this.
		/// </summary>
		public static async Task RefreshAllCodeLensDataPointsAsync()
			=> await Task
				.WhenAll(Connections.Keys.Select(RefreshCodeLensDataPointAsync))
				.ConfigureAwait(false);
	}
}

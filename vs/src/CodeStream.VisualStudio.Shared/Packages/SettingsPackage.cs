﻿using CodeStream.VisualStudio.Core;
using CodeStream.VisualStudio.Core.Properties;
using Microsoft.VisualStudio.Shell;
using System;
using System.ComponentModel;
using System.ComponentModel.Design;
using System.Runtime.InteropServices;
using System.Threading;
using CodeStream.VisualStudio.Core.Enums;
using CodeStream.VisualStudio.Core.Events;
using CodeStream.VisualStudio.Core.Logging;
using CodeStream.VisualStudio.Shared.Controllers;
using CodeStream.VisualStudio.Shared.Events;
using CodeStream.VisualStudio.Shared.Interfaces;
using CodeStream.VisualStudio.Shared.Models;
using CodeStream.VisualStudio.Shared.Services;
using CodeStream.VisualStudio.Shared.UI.Settings;
using Microsoft.VisualStudio.ComponentModelHost;
using Microsoft;
using Task = System.Threading.Tasks.Task;

namespace CodeStream.VisualStudio.Shared.Packages {
	[ProvideService(typeof(SSettingsManagerAccessor))]
	[ProvideOptionPage(typeof(OptionsDialogPage), "CodeStream", "Settings", 0, 0, true)]
	[PackageRegistration(UseManagedResourcesOnly = true, AllowsBackgroundLoading = true)]
	[InstalledProductRegistration("#110", "#112", SolutionInfo.Version, IconResourceID = 400)]
	[Guid(Guids.CodeStreamSettingsPackageId)]
	public sealed class SettingsPackage : AsyncPackage {
		private IComponentModel _componentModel;
		private IOptionsDialogPage _optionsDialogPage;
		private ICodeStreamSettingsManager _codeStreamSettingsManager;
		private IVisualStudioSettingsManager _vsSettingsManager;

		protected override async Task InitializeAsync(CancellationToken cancellationToken, IProgress<ServiceProgressData> progress) {
			_componentModel = await GetServiceAsync(typeof(SComponentModel)) as IComponentModel;
			Assumes.Present(_componentModel);

			await JoinableTaskFactory.SwitchToMainThreadAsync(cancellationToken);
			// can only get a dialog page from a package
			_optionsDialogPage = (IOptionsDialogPage)GetDialogPage(typeof(OptionsDialogPage));
			_codeStreamSettingsManager = new CodeStreamSettingsManager(_optionsDialogPage);
			((IServiceContainer)this).AddService(typeof(SSettingsManagerAccessor), CreateService, true);

			AsyncPackageHelper.InitializeLogging(_codeStreamSettingsManager.GetExtensionTraceLevel());
			AsyncPackageHelper.InitializePackage(GetType().Name);
			if (_codeStreamSettingsManager?.DialogPage != null) {
				_codeStreamSettingsManager.DialogPage.PropertyChanged += DialogPage_PropertyChanged;
			}

			_vsSettingsManager = _componentModel.GetService<IVisualStudioSettingsManager>();
			if (_vsSettingsManager != null) {
				_vsSettingsManager.GetPropertyToMonitor(VisualStudioSetting.IsCodeLensEnabled).SettingChangedAsync +=
					OnCodeLensSettingsChangedAsync;
				_vsSettingsManager.GetPropertyToMonitor(VisualStudioSetting.CodeLensDisabledProviders).SettingChangedAsync +=
					OnCodeLensSettingsChangedAsync;
			}
			
			await base.InitializeAsync(cancellationToken, progress);
		}

		private Task OnCodeLensSettingsChangedAsync(object sender, PropertyChangedEventArgs args) {
			var currentCodeLensSetting = _vsSettingsManager.IsCodeLevelMetricsEnabled();

			var configurationController = new ConfigurationController(
				_componentModel.GetService<IEventAggregator>(),
				_componentModel.GetService<IBrowserService>()
			);

			configurationController.ToggleCodeLens(currentCodeLensSetting);

			return Task.CompletedTask;
		}

		private void DialogPage_PropertyChanged(object sender, PropertyChangedEventArgs args)
		{
			if (_codeStreamSettingsManager == null)
			{
				return;
			}

			switch (args.PropertyName)
			{
				case nameof(_codeStreamSettingsManager.TraceLevel):
					LogManager.SetTraceLevel(_codeStreamSettingsManager.GetExtensionTraceLevel());
					break;

				case nameof(_codeStreamSettingsManager.AutoHideMarkers):
				{
					if (!(sender is OptionsDialogPage odp))
					{
						return;
					}

					var eventAggregator = _componentModel.GetService<IEventAggregator>();
					eventAggregator?.Publish(new AutoHideMarkersEvent { Value = odp.AutoHideMarkers });

					break;
				}

				case nameof(_codeStreamSettingsManager.ShowAvatars):
				case nameof(_codeStreamSettingsManager.ShowMarkerGlyphs):
				{
					if (!(sender is OptionsDialogPage odp))
					{
						return;
					}

					var configurationController = new ConfigurationController(
						_componentModel.GetService<IEventAggregator>(),
						_componentModel.GetService<IBrowserService>()
					);

					switch (args.PropertyName) {
						case nameof(_codeStreamSettingsManager.ShowAvatars):
							configurationController.ToggleShowAvatars(odp.ShowAvatars);
							break;
						case nameof(_codeStreamSettingsManager.ShowMarkerGlyphs):
							configurationController.ToggleShowMarkerGlyphs(odp.ShowMarkerGlyphs);
							break;
					}

					break;
				}

				case nameof(_codeStreamSettingsManager.ServerUrl):
				case nameof(_codeStreamSettingsManager.ProxyStrictSsl):
				case nameof(_codeStreamSettingsManager.ProxySupport):
				case nameof(_codeStreamSettingsManager.DisableStrictSSL):
				case nameof(_codeStreamSettingsManager.ExtraCertificates):
					try {
						var sessionService = _componentModel.GetService<ISessionService>();
						if (sessionService?.IsAgentReady == true || sessionService?.IsReady == true) {
							_ = _componentModel.GetService<ICodeStreamService>().ConfigChangeReloadNotificationAsync();
						}
					}
					catch
					{
						// ignored
					}

					break;
			}
		}


		private object CreateService(IServiceContainer container, Type serviceType) 
			=> typeof(SSettingsManagerAccessor) == serviceType
				? new SettingsManagerAccessor(_codeStreamSettingsManager)
				: null;

		protected override void Dispose(bool isDisposing) {
			if (isDisposing) {
				try {
					#pragma warning disable VSTHRD108
					ThreadHelper.ThrowIfNotOnUIThread();
					#pragma warning restore VSTHRD108

					if (_codeStreamSettingsManager?.DialogPage != null) {
						_codeStreamSettingsManager.DialogPage.PropertyChanged -= DialogPage_PropertyChanged;
					}

					if (_vsSettingsManager != null) {
						_vsSettingsManager.GetPropertyToMonitor(VisualStudioSetting.IsCodeLensEnabled)
								.SettingChangedAsync -=
							OnCodeLensSettingsChangedAsync;
						_vsSettingsManager.GetPropertyToMonitor(VisualStudioSetting.CodeLensDisabledProviders)
								.SettingChangedAsync -=
							OnCodeLensSettingsChangedAsync;
					}
				}
				catch (Exception)
				{
					// ignored
				}
			}

			base.Dispose(isDisposing);
		}
	}
}

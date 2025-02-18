﻿
using CodeStream.VisualStudio.Core.Models;
using Newtonsoft.Json;

namespace CodeStream.VisualStudio.Shared.Models {
	public class EmptyRequestTypeParams { }

	public class BootstrapInHostRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/bootstrap";
		public override string Method => MethodName;
	}

	public enum LogoutReason1 {
		Unknown,
		Reauthenticating
	}

	public class LogoutRequest {
		[JsonProperty("reason", NullValueHandling = NullValueHandling.Ignore)]
		public LogoutReason1? Reason { get; set; }
		[JsonProperty("newServerUrl", NullValueHandling = NullValueHandling.Ignore)]
		public string NewServerUrl { get; set; }
		[JsonProperty("newEnvironment", NullValueHandling = NullValueHandling.Ignore)]
		public string NewEnvironment { get; set; }
	}

	public class LogoutResponse { }

	public class LogoutRequestType : RequestType<LogoutRequest> {
		public const string MethodName = "host/logout";
		public override string Method => MethodName;
	}

	public class ReloadRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/restart";
		public override string Method => MethodName;
	}

	public class ReloadWebviewRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/webview/reload";
		public override string Method => MethodName;
	}

	public class CompareMarkerRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/marker/compare";
		public override string Method => MethodName;
	}

	public class ApplyMarkerRequestType : RequestType<EmptyRequestTypeParams> {
		public const string MethodName = "host/marker/apply";
		public override string Method => MethodName;
	}

	public class UpdateConfigurationRequest {
		public string Name { get; set; }
		public string Value { get; set; }
	}

	public class UpdateConfigurationRequestType : RequestType<UpdateConfigurationRequest> {
		public const string MethodName = "host/configuration/update";
		public override string Method => MethodName;
	}

	public class UpdateServerUrlRequest {
		public string ServerUrl { get; set; }
		public bool? DisableStrictSSL { get; set; }
		public string Environment { get; set; }
		public bool CopyToken { get; set; }
		public string CurrentTeamId { get; set; }
	}

	public class UpdateServerUrlResponse { }

	public class UpdateServerUrlRequestType : RequestType<UpdateServerUrlRequest> {
		public const string MethodName = "host/server-url";
		public override string Method => MethodName;
	}

	public class OpenUrlRequest {
		/// <summary>
		/// This is an http/https url
		/// </summary>
		public string Url { get; set; }
	}

	public class OpenUrlRequestType : RequestType<OpenUrlRequest> {
		public const string MethodName = "host/url/open";
		public override string Method => MethodName;
	}
}

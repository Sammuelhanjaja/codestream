'use strict';

const APIRequest = require(process.env.CS_API_TOP + '/lib/api_server/api_request.js');
const CodemarkLinkIndexes = require(process.env.CS_API_TOP + '/modules/codemarks/codemark_link_indexes');
const MomentTimezone = require('moment-timezone');
const HLJS = require('highlight.js');
const Path = require('path');

const PROVIDER_DISPLAY_NAMES = {
	'github': 'GitHub',
	'bitbucket': 'Bitbucket',
	'gitlab': 'GitLab',
	'trello': 'Trello',
	'jira': 'Jira',
	'asana': 'Asana'
};

class LinkCodemarkRequest extends APIRequest {

	async authorize () {
		// we'll handle authorization in the process phase,
		// but ascertain whether this is a public link
		this.isPublic = this.request.path.startsWith('/p/');
	}

	async process () {
		!await this.checkAuthentication() ||
		!await this.getCodemarkLink() ||
		!await this.getCodemark() ||
		!await this.showCodemark();
	}

	async checkAuthentication () {
		// if no identity, redirect to the login page
		if (!this.isPublic && !this.user) {
			this.log('User requesting codemark link but has no identity, redirecting to login');
			this.module.evalTemplate(this, 'login', { finishUrl: this.request.url });
			return false;
		}
		return true;
	}

	async getCodemarkLink () {
		// check if the user is on the indicated team
		const teamId = this.request.params.teamId.toLowerCase();
		if (!this.isPublic && !this.user.hasTeam(teamId)) {
			this.warn('User requesting codemark link is not on the team that owns the codemark');
			return this.redirect404();
		}
		// get the link to the codemark
		const linkId = this.request.params.id.toLowerCase();
		const codemarkLinks = await this.data.codemarkLinks.getByQuery(
			{ teamId: teamId, _id: linkId },
			{ hint: CodemarkLinkIndexes.byTeamId }
		);
		if (codemarkLinks.length === 0) {
			this.warn('User requested a codemark link that was not found');
			return this.redirect404();
		}
		this.codemarkLink = codemarkLinks[0];
		return true;
	}

	async getCodemark () {
		// get the codemark
		const codemarkId = this.codemarkLink.get('codemarkId');
		this.codemark = await this.data.codemarks.getById(codemarkId);
		if (!this.codemark) {
			this.warn('User requested to link to a codemark but the codemark was not found');
			return this.redirect404();
		}
		if (this.isPublic && !this.codemark.get('hasPublicPermalink')) {
			this.warn('Public link to codemark with no public permalink will not be honored');
			return this.redirect404();
		}
		return true;
	}

	async showCodemark () {
		const creator = await this.data.users.getById(this.codemark.get('creatorId'));

		let marker, file;
		const markerId = this.codemark.get('markerIds')[0];
		if (markerId) {
			marker = await this.data.markers.getById(markerId);
			const fileStream = marker && marker.get('fileStreamId') &&
				await this.data.streams.getById(marker.get('fileStreamId'));
			file = (fileStream && fileStream.get('file')) || (marker && marker.get('file'));
		}

		const username = creator && creator.get('username');
		const activity = this.getActivity(this.codemark.get('type'));
		const showComment = username && !this.codemark.get('invisible');
		const createdAt = this.formatTime(this.codemark.get('createdAt'));
		const title = this.codemark.get('title');
		const text = this.codemark.get('text');
		let code = marker.get('code') || '';

		if (code && file) {
			// do syntax highlighting for the code, based on the file extension
			let extension = Path.extname(file).toLowerCase();
			if (extension.startsWith('.')) {
				extension = extension.substring(1);
			}
			code = this.highlightCode(code, extension);
		}

		const remoteCodeUrl = this.codemark.get('remoteCodeUrl') || {};
		const provider = PROVIDER_DISPLAY_NAMES[remoteCodeUrl.name] || remoteCodeUrl.name;
		const providerUrl = remoteCodeUrl.url;

		this.module.evalTemplate(this, 'codemark', {
			showComment,
			username,
			activity,
			createdAt,
			title,
			text,
			file,
			code,
			provider,
			providerUrl
		});
	}

	formatTime (timeStamp) {
		const timeZone = (this.user && this.user.get('timeZone')) || 'America/New_York';
		return MomentTimezone.tz(timeStamp, timeZone).format('ddd, MMM D h:mm a');
	}

	highlightCode (code, extension) {
		return this.whiteSpaceToHtml(HLJS.highlight(extension, code).value);
	}

	getActivity (type) {
		switch (type) {
		case 'question': 
			return 'has a question';
		case 'issue': 
			return 'posted an issue';
		case 'bookmark': 
			return 'set a bookmark';
		case 'trap':
			return 'created a code trap';
		default:
			return 'commented on code';	// shouldn't happen, just a failsafe
		}
	}

	whiteSpaceToHtml (text) {
		return text
			.replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
			.replace(/^ +/gm, match => { return match.replace(/ /g, '&nbsp;'); })
			.replace(/\n/g, '<br/>');
	}

	redirect404 () {
		this.response.redirect('/web/404');
		this.responseHandled = true;
	}
}

module.exports = LinkCodemarkRequest;

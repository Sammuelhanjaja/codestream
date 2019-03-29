import cx from "classnames";
import React from "react";
import * as Path from "path-browserify";
import { connect } from "react-redux";
import { setCodemarkStatus } from "./actions";
import Headshot from "./Headshot";
import Icon from "./Icon";
import Menu from "./Menu";
import ScrollBox from "./ScrollBox";
import PostList from "./PostList";
import { markdownify } from "./Markdowner";
import { MessageInput } from "./MessageInput";
import { getTeamMembers } from "../store/users/reducer";
import PostDetails from "./PostDetails";
import { PostCompose } from "./PostCompose";
import { escapeHtml } from "../utils";
import { DocumentMarker } from "@codestream/protocols/agent";
import { CodemarkType } from "@codestream/protocols/api";
import { prettyPrintOne } from "code-prettify";
import { createPost } from "./actions";

const PostListJs: any = PostList;

interface CodemarkEntity {
	id: string;
	color: string;
	type: CodemarkType;
	createdAt: number;
	streamId: string;
	version: number;
	postId?: string;
	parentPostId?: string;
	text?: string;
	title?: string;
	markers?: {
		file?: string;
	};
	status?: string;
	creatorId?: string;
	pinned?: boolean;
}

interface State {
	editingPostId?: string;
	text: string;
}

interface Props {
	codemark?: CodemarkEntity;
	teammates?: any;
	currentUserId?: any;
	slashCommands?: any;
	services?: any;
	isSlackTeam?: any;
	height?: Number;
	capabilities?: any;
	hasFocus: boolean;
	usernamesRegexp: string;
	currentUserName: string;
	teamId: string;
	streamId: string;
	onSubmitPost?: any;
	createPost?: any;
}

export class CodemarkDetails extends React.Component<Props, State> {
	static defaultProps = {};

	constructor(props: Props) {
		super(props);
		this.state = {
			text: ""
		};
	}

	componentDidMount() {
		const input = document.getElementById("input-div");
		if (input) input.focus();
	}

	handleClickPost() {}

	postAction() {}

	submitReply = async () => {
		const { codemark } = this.props;
		const { text } = this.state;
		// const mentionedUserIds = this.findMentionedUserIds(text, this.props.teammates);
		const mentionedUserIds = [];
		const threadId = codemark ? codemark.postId : "";
		const { createPost, streamId } = this.props;
		this.setState({ text: "" });
		await createPost(streamId, threadId, text, null, mentionedUserIds, {
			entryPoint: "Codemark"
		});
	};

	handleOnChange = text => {
		this.setState({ text: text });
	};

	render() {
		const { codemark, capabilities } = this.props;

		const threadId = codemark ? codemark.postId : "";
		return (
			<div className="codemark-details">
				{this.renderCodeblock(codemark)}
				<PostDetails codemark={codemark} capabilities={capabilities} />
				<div className="replies">
					<div className="shadow-overlay">
						<div className="postslist threadlist" onClick={this.handleClickPost}>
							<ScrollBox>
								<PostListJs
									isActive={true}
									hasFocus={this.props.hasFocus}
									usernamesRegexp={this.props.usernamesRegexp}
									teammates={this.props.teammates}
									currentUserId={this.props.currentUserId}
									currentUserName={this.props.currentUserName}
									editingPostId={this.state.editingPostId}
									postAction={this.postAction}
									streamId={this.props.streamId}
									isThread
									threadId={threadId}
									teamId={this.props.teamId}
									hideParentPost={true}
								/>
							</ScrollBox>
						</div>
					</div>
				</div>

				<div className="compose codemark-compose">
					<MessageInput
						teammates={this.props.teammates}
						currentUserId={this.props.currentUserId}
						slashCommands={this.props.slashCommands}
						services={this.props.services}
						isSlackTeam={this.props.isSlackTeam}
						text={this.state.text}
						placeholder="Reply..."
						onChange={this.handleOnChange}
						onSubmit={this.submitReply}
					/>
				</div>
			</div>
		);
	}

	handleSubmitPost = (...args) => {
		this.props.onSubmitPost(...args);
	};

	renderCodeblock(codemark) {
		const markers = codemark.markers;
		if (!markers) return null;
		const marker = codemark.markers[0];
		const path = marker.file || "";
		let extension = Path.extname(path).toLowerCase();
		if (extension.startsWith(".")) {
			extension = extension.substring(1);
		}

		let startLine = 1;
		if (marker.range) {
			startLine = marker.range.start.line;
		} else if (marker.location) {
			startLine = marker.location[0];
		} else if (marker.locationWhenCreated) {
			startLine = marker.locationWhenCreated[0];
		}

		const codeHTML = prettyPrintOne(escapeHtml(marker.code), extension, startLine);
		return <pre className="code prettyprint" dangerouslySetInnerHTML={{ __html: codeHTML }} />;
	}
}

const mapStateToProps = state => {
	const {
		capabilities,
		configs,
		connectivity,
		session,
		context,
		editorContext,
		users,
		teams,
		posts,
		services
	} = state;

	const team = teams[context.currentTeamId];
	const teamMembers = getTeamMembers(state);

	// this usenames regexp is a pipe-separated list of
	// either usernames or if no username exists for the
	// user then his email address. it is sorted by length
	// so that the longest possible match will be made.
	const usernamesRegexp = teamMembers
		.map(user => {
			return user.username || "";
		})
		.sort(function(a, b) {
			return b.length - a.length;
		})
		.join("|")
		.replace(/\|\|+/g, "|") // remove blank identifiers
		.replace(/\+/g, "\\+") // replace + and . with escaped versions so
		.replace(/\./g, "\\."); // that the regexp matches the literal chars

	const isOffline = connectivity.offline;

	const user = users[session.userId];

	const providerInfo = (user.providerInfo && user.providerInfo[context.currentTeamId]) || {};

	return {
		streamId: context.currentStreamId,
		threadId: context.threadId,
		configs,
		capabilities,
		isOffline,
		teammates: teamMembers,
		providerInfo,
		teamId: context.currentTeamId,
		teamName: team.name || "",
		repoId: context.currentRepoId,
		hasFocus: context.hasFocus,
		scmInfo: editorContext.scm,
		usernamesRegexp: usernamesRegexp,
		currentUserId: user.id,
		currentUserName: user.username,
		services,
		isSlackTeam:
			teams[context.currentTeamId].providerInfo && teams[context.currentTeamId].providerInfo.slack
	};
};

export default connect(
	mapStateToProps,
	{ setCodemarkStatus, createPost }
)(CodemarkDetails);

import {
	FetchThirdPartyPullRequestPullRequest,
} from "@codestream/protocols/agent";
import { CSMe } from "@codestream/protocols/api";


import {
	getCurrentProviderPullRequest,
	getProviderPullRequestCollaborators,
} from "@codestream/webview/store/providerPullRequests/slice";
import React, { PropsWithChildren, useState } from "react";
import { useSelector } from "react-redux";
import { PRHeadshot } from "../../../src/components/Headshot";
import { CodeStreamState } from "../../../store";
import Icon from "../../Icon";
import { MarkdownText } from "../../MarkdownText";
import { PullRequestCommentMenu } from "../../PullRequestCommentMenu";
import {
	PRActionIcons,
	PRAuthor,
	PRComment,
	PRCommentBody,
	PRCommentCard,
	PRCommentHeader,
} from "../../PullRequestComponents";
import { PRAuthorBadges } from "../../PullRequestConversationTab";
import { PullRequestEditingComment } from "../../PullRequestEditingComment";
import { PullRequestMinimizedComment } from "../../PullRequestMinimizedComment";
import { PullRequestReactButton, PullRequestReactions } from "../../PullRequestReactions";
import Timestamp from "../../Timestamp";

export const GHOST = {
	login: "ghost",
	avatarUrl:
		"https://avatars2.githubusercontent.com/u/10137?s=460&u=b1951d34a583cf12ec0d3b0781ba19be97726318&v=4",
};

const ReviewIcons = {
	APPROVED: <Icon name="check" className="circled green" />,
	CHANGES_REQUESTED: <Icon name="plus-minus" className="circled red" />,
	COMMENTED: <Icon name="eye" className="circled" />,
	DISMISSED: <Icon name="x" className="circled" />,
	PENDING: <Icon name="eye" className="circled" />,
};

interface Props {
	pr: FetchThirdPartyPullRequestPullRequest;
	setIsLoadingMessage: Function;
	quote: Function;
}

export const PullRequestTimelineItems = (props: PropsWithChildren<Props>) => {
	const { pr, setIsLoadingMessage } = props;
	if (!pr || !pr.timelineItems) return null;

	const [openComments, setOpenComments] = useState({});
	const [pendingComments, setPendingComments] = useState({});
	const [editingComments, setEditingComments] = useState({});
	const [expandedComments, setExpandedComments] = useState({});

	const doneEditingComment = id => {
		setEditingComments({ ...editingComments, [id]: false });
	};

	const handleTextInputFocus = async (databaseCommentId: number) => {
		setOpenComments({
			...openComments,
			[databaseCommentId]: true,
		});
	};

	const setEditingComment = (comment, value) => {
		setEditingComments({
			...editingComments,
			[comment.id]: value,
		});
		setPendingComments({
			...pendingComments,
			[comment.id]: value ? comment.body : "",
		});
	};

	const expandComment = id => {
		setExpandedComments({
			...expandedComments,
			[id]: !expandedComments[id],
		});
	};

	const derivedState = useSelector((state: CodeStreamState) => {
		const currentUser = state.users[state.session.userId!] as CSMe;
		const currentPullRequest = getCurrentProviderPullRequest(state);
		return {
			currentUser,
			prRepoId: currentPullRequest?.conversations?.repository?.prRepoId,
			collaborators: getProviderPullRequestCollaborators(state),
		};
	});

	const [currentRepoRoot, setCurrentRepoRoot] = React.useState("");

	const timelineNodes = pr.timelineItems.nodes;
	console.warn(pr);
	return (
		<div>
			<PRComment style={{ marginTop: "10px" }}>
				<PRHeadshot person={pr.author} size={40} />
				<PRCommentCard className="dark-header">
					<PRCommentHeader>
						<div>
							<PRAuthor>{(pr.author || GHOST).login}</PRAuthor> commented{" "}
							<Timestamp time={pr.createdAt!} relative />
							{pr.includesCreatedEdit ? <> • edited</> : ""}
						</div>
						<PRActionIcons>
							<PRAuthorBadges pr={pr} node={pr} />
							<PullRequestReactButton
								pr={pr}
								targetId={pr.id}
								setIsLoadingMessage={setIsLoadingMessage}
								reactionGroups={pr.reactionGroups}
							/>
							<PullRequestCommentMenu
								pr={pr}
								node={pr}
								nodeType={"ROOT_COMMENT"}
								setIsLoadingMessage={setIsLoadingMessage}
								setEdit={setEditingComment}
								quote={props.quote}
							/>
						</PRActionIcons>
					</PRCommentHeader>
					<PRCommentBody>
						{editingComments[pr.id] ? (
							<PullRequestEditingComment
								pr={pr}
								setIsLoadingMessage={setIsLoadingMessage}
								id={pr.id}
								type={"PR"}
								isPending={false}
								text={pendingComments[pr.id]}
								done={() => doneEditingComment(pr.id)}
							/>
						) : pr.bodyHTML || pr.body ? ( //this is where to fix it
							<MarkdownText
								text={pr.bodyHTML ? pr.bodyHTML : pr.body}
								isHtml={pr.bodyHTML ? true : false}
								inline
							/>
						) : (
							<i>No description provided.</i>
						)}
					</PRCommentBody>

					<PullRequestReactions
						pr={pr}
						targetId={pr.id}
						setIsLoadingMessage={setIsLoadingMessage}
						reactionGroups={pr.reactionGroups}
					/>
				</PRCommentCard>
			</PRComment>

			{timelineNodes.map((item, index) => {
				const author = item.author || GHOST;
				// console.warn("ITEM: ", index, item);
				return (
					<PRComment key={index}>
						<PRHeadshot key={index} size={40} person={author} />
						<PRCommentCard className={`dark-header${item.isMinimized ? " no-arrow" : ""}`}>
							{item.isMinimized && !expandedComments[item.id] ? (
								<PullRequestMinimizedComment
									reason={item.minimizedReason}
									onClick={() => expandComment(item.id)}
								/>
							) : (
								<>
									<PRCommentHeader>
										<div>
											<PRAuthor>{(author || GHOST).login}</PRAuthor> commented{" "}
											<Timestamp time={item.createdAt!} relative />
											{item.includesCreatedEdit ? <> • edited</> : ""}
										</div>
										<PRActionIcons>
											<PRAuthorBadges pr={pr} node={item} />
											<PullRequestReactButton
												pr={pr}
												targetId={item.id}
												setIsLoadingMessage={setIsLoadingMessage}
												reactionGroups={item.reactionGroups}
											/>
											<PullRequestCommentMenu
												pr={pr}
												setIsLoadingMessage={setIsLoadingMessage}
												node={item}
												nodeType="ISSUE_COMMENT"
												viewerCanDelete={item.viewerCanDelete}
												setEdit={setEditingComment}
												quote={props.quote}
											/>
										</PRActionIcons>
									</PRCommentHeader>
									<PRCommentBody>
										{editingComments[item.id] ? (
											<PullRequestEditingComment
												pr={pr}
												setIsLoadingMessage={setIsLoadingMessage}
												id={item.id}
												isPending={item.state === "PENDING"}
												type={"ISSUE"}
												text={pendingComments[item.id]}
												done={() => doneEditingComment(item.id)}
											/>
										) : (
											<MarkdownText
												text={item.bodyHTML ? item.bodyHTML : item.bodyText}
												isHtml={item.bodyHTML ? true : false}
												inline
											/>
										)}
									</PRCommentBody>
									<PullRequestReactions
										pr={pr}
										targetId={item.id}
										setIsLoadingMessage={setIsLoadingMessage}
										reactionGroups={item.reactionGroups}
									/>
								</>
							)}
						</PRCommentCard>
					</PRComment>
				);
			})}
		</div>
	);
};

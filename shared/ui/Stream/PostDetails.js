import React, { Component } from "react";
import Button from "./Button";
import EventEmitter from "../event-emitter";

export default class PostDetails extends Component {
	state = {
		patchApplied: false,
		diffShowing: false,
		showDiffButtons: false
	};
	disposables = [];

	componentDidMount() {
		const codeBlocks = this.props.post.codeBlocks || [];
		codeBlocks.forEach(block =>
			this.disposables.push(EventEmitter.onFileChanged(block, this.onFileChanged))
		);
		// if (this._alert)
		// 	atom.tooltips.add(this._alert, {
		// 		title: "Unknown codeblock location."
		// 	});
	}

	componentWillUnmount() {
		this.disposables.forEach(d => d.dispose());
	}

	onFileChanged = ({ file, hasDiff }) => {
		const codeBlocks = this.props.post.codeBlocks || [];
		codeBlocks.forEach(block => {
			if (block.file === file) this.setState({ showDiffButtons: hasDiff });
		});
	};

	handleClickShowDiff = event => {
		event.preventDefault();
		EventEmitter.emit("interaction:show-diff", this.props.post.codeBlocks[0]);
		this.setState({ diffShowing: !this.state.diffShowing });
	};

	handleClickApplyPatch = event => {
		event.preventDefault();
		EventEmitter.emit("interaction:apply-patch", this.props.post.codeBlocks[0]);
		this.setState({ patchApplied: !this.state.patchApplied });
	};

	// handleShowVersion = async event => {
	// 	console.log("Showing version...");
	// };

	render() {
		const { post } = this.props;

		if (!post) return null;

		const applyPatchLabel = this.state.patchApplied ? "Revert" : "Apply Patch";
		const showDiffLabel = this.state.diffShowing ? "Hide Diff" : "Show Diff";
		const hasCodeBlock = post.codeBlocks && post.codeBlocks.length ? true : null;

		// if a patch has been applied, we treat it as if there is
		// a diff
		let showDiffButtons = this.state.showDiffButtons || this.state.patchApplied;
		let alert = null;
		// } else if (hasCodeBlock) {
		// 	// TODO: this is the case where we have a codeblock but no marker location
		// 	alert = <span className="icon icon-alert" ref={ref => (this._alert = ref)} />;
		// }

		let commitDiv = null;
		if (hasCodeBlock) {
			commitDiv = (
				<div className="posted-to">
					<label>Posted to:</label> <span>{post.commitHashWhenPosted}</span>
				</div>
			);
			// if (post.commitHashWhenPosted == this.props.currentCommit) {
			// 	commitDiv = <span />;
			// } else {
			// 	commitDiv = (
			// 		<Button
			// 			id="show-version-button"
			// 			className="control-button"
			// 			tabIndex="2"
			// 			type="submit"
			// 			onClick={this.handleShowVersion}
			// 		>
			// 			Warp to {post.commitHashWhenPosted}
			// 		</Button>
			// 	);
			// }
		}

		return (
			<div className="post-details" id={post.id} ref={ref => (this._div = ref)}>
				{alert}
				{!showDiffButtons &&
					hasCodeBlock && <div className="no-diffs">This codeblock matches current</div>}
				{commitDiv}
				{showDiffButtons && (
					<div className="button-group">
						<Button
							id="show-diff-button"
							className="control-button"
							tabIndex="2"
							type="submit"
							loading={this.props.loading}
							onClick={this.handleClickShowDiff}
						>
							{showDiffLabel}
						</Button>
						<Button
							id="show-diff-button"
							className="control-button"
							tabIndex="2"
							type="submit"
							loading={this.props.loading}
							onClick={this.handleClickApplyPatch}
						>
							{applyPatchLabel}
						</Button>
					</div>
				)}
			</div>
		);
	}
}

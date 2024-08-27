// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

/* eslint-disable indent */ // Allowing for some custom intent under svDetailsGrid 2D layout.

import { type IObservableValue, autorun, computed, observable } from "mobx";
import { observer } from "mobx-react";
import { Component, Fragment } from "react";
import ReactMarkdown from "react-markdown";
import type { Result, StackFrame, ThreadFlowLocation } from "sarif";
import { decodeFileUri, parseArtifactLocation, parseLocation } from "../shared";
import "./details.scss";
import "./index.scss";
import {
	postRemoveResultFixed,
	postSelectArtifact,
	postSelectLog,
} from "./indexStore";
import {
	List,
	Tab,
	TabPanel,
	renderMessageTextWithEmbeddedLinks,
} from "./widgets";

// ReactMarkdown blocks `vscode:` and `command:` URIs by default. This is a workaround.
// vscode scheme: https://code.visualstudio.com/api/references/vscode-api#window.registerUriHandler
// command scheme: https://code.visualstudio.com/api/extension-guides/command#command-uris
function uriTransformer(uri: string) {
	if (uri.startsWith("vscode:") || uri.startsWith("command:")) return uri;
	return ReactMarkdown.uriTransformer(uri);
}

type TabName = "Info" | "Analysis Steps";

interface DetailsProps {
	result: Result;
	resultsFixed: string[];
	height: IObservableValue<number>;
}
@observer
export class Details extends Component<DetailsProps> {
	private selectedTab = observable.box<TabName>("Info");
	@computed private get threadFlowLocations(): ThreadFlowLocation[] {
		return (
			this.props.result?.codeFlows?.[0]?.threadFlows?.[0].locations ?? []
		);
	}
	@computed private get stacks() {
		return this.props.result?.stacks;
	}
	constructor(props: DetailsProps) {
		super(props);
		autorun(() => {
			const hasThreadFlows = !!this.threadFlowLocations.length;
			this.selectedTab.set(hasThreadFlows ? "Analysis Steps" : "Info");
		});
	}
	render() {
		const renderRuleDesc = (result: Result) => {
			const desc =
				result?._rule?.fullDescription ??
				result?._rule?.shortDescription;
			if (!desc) return "—";
			return desc.markdown ? (
				<ReactMarkdown
					class="svMarkDown"
					source={desc.markdown}
					transformLinkUri={uriTransformer}
				/>
			) : (
				renderMessageTextWithEmbeddedLinks(
					desc.text,
					result,
					vscode.postMessage,
				)
			);
		};

		const { result, resultsFixed, height } = this.props;
		const helpUri = result?._rule?.helpUri;

		return (
			<div class="svDetailsPane" style={{ height: height.get() }}>
				{result && (
					<TabPanel selection={this.selectedTab}>
						<Tab name="Info">
							<div class="svDetailsBody svDetailsInfo">
								{resultsFixed.includes(
									JSON.stringify(result._id),
								) && (
									<div class="svDetailsMessage">
										This result has been marked as
										fixed.&nbsp;
										<a
											href="#"
											onClick={(e) => {
												e.preventDefault(); // Cancel # nav.
												postRemoveResultFixed(result);
											}}>
											Clear
										</a>
										.
									</div>
								)}
								<div class="svDetailsMessage">
									{result._markdown ? (
										<ReactMarkdown
											class="svMarkDown"
											source={result._markdown}
											transformLinkUri={uriTransformer}
										/>
									) : (
										renderMessageTextWithEmbeddedLinks(
											result._message,
											result,
											vscode.postMessage,
										)
									)}
								</div>
								<div class="svDetailsGrid">
									<span>Rule Id</span>{" "}
									{helpUri ? (
										<a
											href={helpUri}
											target="_blank"
											rel="noopener noreferrer">
											{result.ruleId}
										</a>
									) : (
										<span>{result.ruleId}</span>
									)}
									<span>Rule Name</span>{" "}
									<span>{result._rule?.name ?? "—"}</span>
									<span>Rule Description</span>{" "}
									<span>{renderRuleDesc(result)}</span>
									<span>Level</span>{" "}
									<span>{result.level}</span>
									<span>Kind</span>{" "}
									<span>{result.kind ?? "—"}</span>
									<span>Baseline State</span>{" "}
									<span>{result.baselineState}</span>
									<span>Locations</span>{" "}
									<span class="svDetailsGridLocations">
										{result.locations?.map((loc, i) => {
											const ploc = loc.physicalLocation;
											const [uri] = parseArtifactLocation(
												result,
												ploc?.artifactLocation,
											);
											return (
												<a
													key={i}
													href="#"
													class="ellipsis"
													title={uri}
													onClick={(e) => {
														e.preventDefault(); // Cancel # nav.
														postSelectArtifact(
															result,
															ploc,
														);
													}}>
													{uri?.file ?? "-"}
												</a>
											);
										}) ?? <span>—</span>}
									</span>
									<span>Log</span>{" "}
									<a
										href="#"
										title={decodeFileUri(result._log._uri)}
										onClick={(e) => {
											e.preventDefault(); // Cancel # nav.
											postSelectLog(result);
										}}>
										{result._log._uri.file}
										{result._log._uriUpgraded &&
											" (upgraded)"}
									</a>
									{(() => {
										// Rendering "tags" reserved for a future release.
										const { tags, ...rest } =
											result.properties ?? {};
										return (
											<>
												<span>&nbsp;</span>
												<span></span>
												{/* Blank separator line */}
												{Object.entries(rest).map(
													([key, value]) => {
														return (
															<Fragment key={key}>
																<span class="ellipsis">
																	{key}
																</span>
																<span>
																	{(() => {
																		if (
																			key ===
																				"github/alertUrl" &&
																			typeof value ===
																				"string"
																		) {
																			const href =
																				value
																					.replace(
																						"api.github.com/repos",
																						"github.com",
																					)
																					.replace(
																						"/code-scanning/alerts",
																						"/security/code-scanning",
																					);
																			return (
																				<a
																					href={
																						href
																					}>
																					{
																						href
																					}
																				</a>
																			);
																		}
																		if (
																			value ===
																			null
																		)
																			return "—";
																		if (
																			Array.isArray(
																				value,
																			)
																		)
																			return (
																				<span
																					style={{
																						whiteSpace:
																							"pre",
																					}}>
																					{value.join(
																						"\n",
																					)}
																				</span>
																			);
																		if (
																			typeof value ===
																			"boolean"
																		)
																			return JSON.stringify(
																				value,
																				null,
																				2,
																			);
																		if (
																			typeof value ===
																			"object"
																		)
																			return (
																				<pre
																					style={{
																						margin: 0,
																						fontSize:
																							"0.7rem",
																					}}>
																					<code>
																						{JSON.stringify(
																							value,
																							null,
																							2,
																						)}
																					</code>
																				</pre>
																			);
																		return value;
																	})()}
																</span>
															</Fragment>
														);
													},
												)}
											</>
										);
									})()}
								</div>
							</div>
						</Tab>
						<Tab
							name="Analysis Steps"
							count={this.threadFlowLocations.length}>
							<div class="svDetailsBody svDetailsCodeflowAndStacks">
								{(() => {
									const renderThreadFlowLocation = (
										threadFlowLocation: ThreadFlowLocation,
									) => {
										const marginLeft =
											((threadFlowLocation.nestingLevel ??
												1) -
												1) *
											24;
										const { message, uri, region } =
											parseLocation(
												result,
												threadFlowLocation.location,
											);
										return (
											<>
												<div
													class="ellipsis"
													style={{ marginLeft }}>
													{message ?? "—"}
												</div>
												<div class="svSecondary">
													{uri?.file ?? "—"}
												</div>
												<div class="svLineNum">
													{region?.startLine}:
													{region?.startColumn ?? 1}
												</div>
											</>
										);
									};

									const selection = observable.box<
										ThreadFlowLocation | undefined
									>(undefined, { deep: false });
									selection.observe((change) => {
										const threadFlowLocation =
											change.newValue;
										postSelectArtifact(
											result,
											threadFlowLocation?.location
												?.physicalLocation,
										);
									});

									return (
										<List
											items={this.threadFlowLocations}
											renderItem={
												renderThreadFlowLocation
											}
											selection={selection}
											allowClear={true}>
											<span class="svSecondary">
												No analysis steps in selected
												result.
											</span>
										</List>
									);
								})()}
							</div>
						</Tab>
						<Tab name="Stacks" count={this.stacks?.length || 0}>
							<div class="svDetailsBody">
								{(() => {
									if (!this.stacks?.length)
										return (
											<div class="svZeroData">
												<span class="svSecondary">
													No stacks in selected
													result.
												</span>
											</div>
										);

									const renderStack = (
										stackFrame: StackFrame,
									) => {
										const location = stackFrame.location;
										const logicalLocation =
											stackFrame.location
												?.logicalLocations?.[0];
										const { message, uri, region } =
											parseLocation(result, location);
										const text = `${message ?? ""} ${logicalLocation?.fullyQualifiedName ?? ""}`;
										return (
											<>
												<div class="ellipsis">
													{text ?? "—"}
												</div>
												<div class="svSecondary">
													{uri?.file ?? "—"}
												</div>
												<div class="svLineNum">
													{region?.startLine}:1
												</div>
											</>
										);
									};

									return this.stacks.map((stack, key) => {
										const stackFrames = stack.frames;

										const selection = observable.box<
											StackFrame | undefined
										>(undefined, { deep: false });
										selection.observe((change) => {
											const frame = change.newValue;
											postSelectArtifact(
												result,
												frame?.location
													?.physicalLocation,
											);
										});
										if (stack.message?.text) {
											return (
												<div key={key} class="svStack">
													<div class="svStacksMessage">
														{stack?.message?.text}
													</div>
													<div class="svDetailsBody svDetailsCodeflowAndStacks">
														<List
															items={stackFrames}
															renderItem={
																renderStack
															}
															selection={
																selection
															}
															allowClear={true}
														/>
													</div>
												</div>
											);
										}
									});
								})()}
							</div>
						</Tab>
					</TabPanel>
				)}
			</div>
		);
	}
}

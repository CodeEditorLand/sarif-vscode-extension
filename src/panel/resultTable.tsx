// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { observer } from "mobx-react";
import { PureComponent, type ReactNode } from "react";
import type { Result } from "sarif";
import type { ResultTableStore } from "./resultTableStore";
import { Table } from "./table";
import type { Column } from "./tableStore";
import { renderMessageTextWithEmbeddedLinks } from "./widgets";

const levelToIcon = {
	error: "error",
	warning: "warning",
	note: "info",
	none: "issues",
	undefined: "question",
};

interface ResultTableProps<G> {
	store: ResultTableStore<G>;
	onClearFilters: () => void;
	renderGroup: (group: G) => ReactNode;
}
@observer
export class ResultTable<G> extends PureComponent<ResultTableProps<G>> {
	private renderCell = (column: Column<Result>, result: Result) => {
		const customRenderers = {
			File: (result) => (
				<span title={result._uri}>{result._uri?.file ?? "—"}</span>
			),
			Line: (result) => <span>{result._region?.startLine ?? "—"}</span>,
			Message: (result) => (
				<span>
					{renderMessageTextWithEmbeddedLinks(
						result._message,
						result,
						vscode.postMessage,
					)}
				</span>
			),
			Rule: (result) => (
				<>
					<span>{result._rule?.name ?? "—"}</span>
					<span class="svSecondary">{result.ruleId}</span>
				</>
			),
		} as Record<string, (result: Result) => ReactNode>;
		const defaultRenderer = (result: Result) => {
			const capitalize = (str: string) =>
				`${str[0].toUpperCase()}${str.slice(1)}`;
			return <span>{capitalize(column.toString(result))}</span>;
		};
		const renderer = customRenderers[column.name] ?? defaultRenderer;
		return renderer(result);
	};

	render() {
		const { store, onClearFilters, renderGroup } = this.props;
		const { renderCell } = this;
		return (
			<Table
				columns={store.visibleColumns}
				store={store}
				renderIconName={(result) =>
					levelToIcon[result.level ?? "undefined"]
				}
				renderGroup={renderGroup}
				renderCell={renderCell}>
				<div class="svZeroData">
					<span>No results found with provided filter criteria.</span>
					<div onClick={onClearFilters}>Clear Filters</div>
				</div>
			</Table>
		);
	}
}

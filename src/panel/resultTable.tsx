// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { observer } from 'mobx-react';
import * as React from 'react';
import { PureComponent, ReactNode } from 'react';
import { Result } from 'sarif';
import { renderMessageTextWithEmbeddedLinks } from './widgets';
import { ResultTableStore } from './resultTableStore';
import { Table } from './table';
import { Column } from './tableStore';

const levelToIcon = {
    error: 'error',
    warning: 'warning',
    note: 'info',
    none: 'issues',
    undefined: 'question',
};

interface ResultTableProps<G> {
    store: ResultTableStore<G>;
    onClearFilters: () => void;
    renderGroup: (group: G) => ReactNode;
}
@observer export class ResultTable<G> extends PureComponent<ResultTableProps<G>> {
    private renderCell = (column: Column<Result>, result: Result) => {
        const customRenderers = {
            'File':       result => <span title={result._uri}>{result._uri?.file ?? '—'}</span>,
            'Line : Col': result => <span>{lineColRenderer(result)}</span>,
            'Message':    result => <span>{renderMessageTextWithEmbeddedLinks(result._message, result, vscode.postMessage)}</span>,
            'Rule':       result => <>
                <span>{result._rule?.name ?? '—'}</span>
                <span className="svSecondary">{result.ruleId}</span>
            </>,
        } as Record<string, (result: Result) => ReactNode>;
        const lineColRenderer = (result: Result) => {
            if (!result._region?.startLine)
            {
                return '-';
            } else {
                return result._region?.startColumn
                  ? result._region.startLine + ' : ' + result._region?.startColumn
                  : result._region?.startLine.toString();
            }
        };
        const defaultRenderer = (result: Result) => {
            const capitalize = (str: string) => `${str[0].toUpperCase()}${str.slice(1)}`;
            return <span>{capitalize(column.toString(result))}</span>;
        };
        const renderer = customRenderers[column.name] ?? defaultRenderer;
        return renderer(result);
    }

    render() {
        const { store, onClearFilters, renderGroup } = this.props;
        const { renderCell } = this;
        return <Table columns={store.visibleColumns} store={store}
            renderIconName={result => levelToIcon[result.level ?? 'undefined']}
            renderGroup={renderGroup} renderCell={renderCell}>
            <div className="svZeroData">
                <span>No results found with provided filter criteria.</span>
                <div onClick={onClearFilters}>Clear Filters</div>
            </div>
        </Table>;
    }
}

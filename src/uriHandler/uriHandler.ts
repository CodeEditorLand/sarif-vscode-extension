// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// import * as path from 'path';
import * as vscode from 'vscode';
import * as os from 'os';
import { UriHandlerUtilities } from './uriHandlerUtilities';

import { Extension } from '../extension';
import { UriHelpViewUtilities } from './uriHelpViewUtilities';
import { UriMetadata } from './uriHandlerInterfaces';
import { Uri } from 'vscode';
import { FileUtilities } from '../utilities/fileUtilities';

/**
 * Extension URI handler.
 */
export class UriHandler implements vscode.UriHandler {
    /**
     * A null mapping key used for the Component Governance URI in the case that a repo name is not passed in.
     */
    public static readonly nullMappingKey: string = 'nullMappingKey';

    /**
     * A mapping key used to track URI state metadata. (Note: if a repository had the same name as this key, there would be conflicts).
     */
    public static readonly uriMetadataKey: string = 'uriMetadataKey';

    /**
     * Handles a URI request from the extension.
     * @param {vscode.Uri} uri The URI to handle.
     * @returns {Promise<void>} A promise that resolves when the URI has been handled.
     */
    // Must be a class method to implement vscode.UriHandler.
    // eslint-disable-next-line class-methods-use-this
    public async handleUri(uri: vscode.Uri): Promise<void> {
        /**
         * Clean the URI by removing fragment delimiters (#) that could interrupt parameter parsing when another URL is passed as a parameter.
         * For additional context, if "#" is found in a URI, it will denote that as the end of the URI query component. This is an issue if we are using URLs as a query parameter.
         * For example, if we received the URI: vscode://devprod.vulnerability-extension/secCode?workItemUrl=https://msazure.visualstudio.com/DefaultCollection/One/_workitems#_a=edit&amp;id=15724968&amp;triage=true&workItemId=15724968,
         * the # delimiter would cause the URI.query part to resolve to "workItemUrl=https://msazure.visualstudio.com/DefaultCollection/One/_workitems" which causes remaining parameters to resolve as undefined.
         * As a result, we remove all instances of "#" to properly resolve the parameter list.
         *
         * At the moment we don't accept any parameters that utilize the special character "#", but this would affect future implementations that would depend on it.
         * Another workaround would be to split and parse the parameters ourselves.
         */
        // eslint-disable-next-line no-param-reassign
        uri = vscode.Uri.parse(uri.toString().replace('#', ''));

        let message = 'SARIF extension Handled a Uri!';
        if (uri.query) {
            message += ` It came with this query: ${uri.query}`;
        }
        vscode.window.showInformationMessage(message);

        const searchParams: URLSearchParams = new URLSearchParams(uri.query);

        const repositoryUriString = searchParams.get('repoUri');
        const sarifUriString = searchParams.get('sarifUri');
        const repositoryUri: Uri | null = vscode.Uri.parse(repositoryUriString!);
        if (!repositoryUri) {
            // noRepoNameProvidedDuringUriAttempt
            return;
        }

        const repoName = repositoryUri.path.split('/').last;

        // const searchParams2: URLSearchParams = new URLSearchParams(repositoryUri.path);
        // const repoName = searchParams.get()

        // const repositoryName = searchParams.get('repoName');
        // const repoName: string | null = repositoryName ?? uri.path.substring(1);
        // if (!repoName) {
        //     // noRepoNameProvidedDuringUriAttempt
        //     return;
        // }

        // clear for testing if it can find in local path when mapping does not exists
        // await Extension.extensionContext.globalState.update(repoName.toLowerCase(), undefined);

        // FileUtilities.validateAndSaveFIle(sarifUriString!, os.tmpdir(), repoName, repositoryUri);
        FileUtilities.loadRepo(sarifUriString!, os.tmpdir(), repoName, repositoryUri);
        // FileUtilities.validateAndSaveFIle('https://raw.githubusercontent.com/shaopeng-gh/sarifhost/main/1ES.SecMon.UAR.sarif', os.tmpdir());
    }
}
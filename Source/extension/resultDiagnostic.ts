// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import type { Result } from "sarif";
import { Diagnostic, type DiagnosticSeverity, type Range } from "vscode";

export class ResultDiagnostic extends Diagnostic {
	constructor(
		range: Range,
		message: string,
		severity: DiagnosticSeverity,
		readonly result: Result,
	) {
		super(range, message, severity);
	}
}

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { LanguageModelToolInformation, LanguageModelToolResult } from 'vscode';
import { createServiceIdentifier } from '../../../../util/common/services';
import { CancellationToken } from '../../../../util/vs/base/common/cancellation';
import { Conversation } from '../../../prompt/common/conversation';
import { VirtualTool } from './virtualTool';

export interface IToolGrouping {
	/**
	 * Gets or sets the list of tools available for the group.
	 */
	tools: readonly LanguageModelToolInformation[];

	/**
	 * Should be called for each model call. Returns a tool result if the
	 * call was a virtual tool call that was expanded.
	 */
	expand(toolCallName: string): LanguageModelToolResult | undefined;

	/**
	 * Returns a list of tools that should be used for the given request.
	 * Internally re-reads the request and conversation state.
	 */
	compute(token: CancellationToken): Promise<readonly LanguageModelToolInformation[]>;
}

export interface IToolGroupingService {
	_serviceBrand: undefined;
	/**
	 * Creates a tool grouping for a request, based on its conversation and the
	 * initial set of tools.
	 */
	create(conversation: Conversation, tools: readonly LanguageModelToolInformation[]): IToolGrouping;
}

export const IToolGroupingService = createServiceIdentifier<IToolGroupingService>('ITelemetryService');


export interface IToolCategorization {
	/**
	 * Called whenever new tools are added. The function should add each tool into
	 * the appropriate virtual tool or top-level tool in the `root`.
	 */
	categorize(root: VirtualTool, tools: LanguageModelToolInformation[], token: CancellationToken): Promise<void>;
}

export interface ISummarizedToolCategory {
	summary: string;
	name: string;
	tools: LanguageModelToolInformation[];
}

export class SummarizerError extends Error { }

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { LanguageModelToolInformation } from 'vscode';
import { CHAT_MODEL } from '../../../../platform/configuration/common/configurationService';
import { IEndpointProvider } from '../../../../platform/endpoint/common/endpointProvider';
import { CancellationToken } from '../../../../util/vs/base/common/cancellation';
import { groupBy } from '../../../../util/vs/base/common/collections';
import { IInstantiationService } from '../../../../util/vs/platform/instantiation/common/instantiation';
import { LanguageModelToolExtensionSource, LanguageModelToolMCPSource } from '../../../../vscodeTypes';
import { VirtualTool } from './virtualTool';
import { VirtualToolGroupCache } from './virtualToolGroupCache';
import { divideToolsIntoGroups, summarizeToolGroup } from './virtualToolSummarizer';
import { IToolCategorization } from './virtualToolTypes';
import * as Constant from './virtualToolsConstants';

const BUILT_IN_GROUP = 'builtin';
const CATEGORIZATION_ENDPOINT = CHAT_MODEL.GPT4OMINI;
const SUMMARY_PREFIX = 'Calling this tool will give you access to more tools in your next request. These tools are summarized as follows:\n\n';

export class BasicToolCategorization implements IToolCategorization {
	private readonly _cache = this._instantiationService.createInstance(VirtualToolGroupCache);

	constructor(
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IEndpointProvider private readonly _endpointProvider: IEndpointProvider,
	) {
	}

	async categorize(root: VirtualTool, tools: LanguageModelToolInformation[], token: CancellationToken): Promise<void> {
		// If there's no need to group tools, just add them all directly;
		if (tools.length < Constant.START_GROUPING_AFTER_TOOL_COUNT) {
			root.contents = tools;
			return;
		}

		const byToolset = groupBy(tools, t => {
			if (t.source instanceof LanguageModelToolExtensionSource) {
				return 'ext_' + t.source.id;
			} else if (t.source instanceof LanguageModelToolMCPSource) {
				return 'mcp_' + t.source.label;
			} else {
				return BUILT_IN_GROUP;
			}
		});

		const grouped = await Promise.all(Object.entries(byToolset).map(([key, tools]) => {
			if (key === BUILT_IN_GROUP) {
				return tools;
			} else {
				return this.generateGroupsFromToolset(tools, token);
			}
		}));

		const previouslyExpanded = new Set<string>();
		for (const tool of root.all()) {
			if (tool instanceof VirtualTool && tool.isExpanded) {
				previouslyExpanded.add(tool.name);
			}
		}

		this._cache.flush();
		root.contents = grouped.flat();

		for (const tool of root.all()) {
			if (tool instanceof VirtualTool) {
				tool.isExpanded = previouslyExpanded.has(tool.name);
			}
		}
	}

	/** Top-level request to categorize a group of tools from a single source. */
	private async generateGroupsFromToolset(tools: LanguageModelToolInformation[], token: CancellationToken): Promise<(VirtualTool | LanguageModelToolInformation)[]> {
		if (tools.length <= Constant.MIN_TOOLSET_SIZE_TO_GROUP) {
			return tools;
		}

		const virts = await this._cache.getOrInsert(tools, () =>
			tools.length <= Constant.GROUP_WITHIN_TOOLSET
				? this._summarizeToolGroup(tools, token)
				: this._divideToolsIntoGroups(tools, token)
		);

		return virts?.map(v => new VirtualTool(v.name, SUMMARY_PREFIX + v.summary, null)) || tools;
	}

	/** Makes multiple sub-groups from the given tool list. */
	private async _divideToolsIntoGroups(tools: LanguageModelToolInformation[], token: CancellationToken) {
		const endpoint = await this._endpointProvider.getChatEndpoint(CATEGORIZATION_ENDPOINT);

		const summarized = await divideToolsIntoGroups(endpoint, tools, token);
		if (!summarized) {
			return undefined;
		}

		return summarized;
	}

	/** Summarizes the given tool list into a single tool group. */
	private async _summarizeToolGroup(tools: LanguageModelToolInformation[], token: CancellationToken) {
		const endpoint = await this._endpointProvider.getChatEndpoint(CATEGORIZATION_ENDPOINT);

		const summarized = await summarizeToolGroup(endpoint, tools, token);
		return summarized && [summarized];
	}
}

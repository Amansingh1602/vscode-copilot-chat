/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HARD_TOOL_LIMIT } from '../../../../platform/configuration/common/configurationService';

/** Point after which we'll start grouping tools */
export const START_GROUPING_AFTER_TOOL_COUNT = HARD_TOOL_LIMIT; // 64, currently

/** Once we get down to this number of tools, we'll stop grouping. */
export const STOP_GROUPING_AFTER_TOOL_COUNT = HARD_TOOL_LIMIT * 2 / 3;

/**
 * By default we group all MCP/extension tools together. If the number of tools
 * the toolset contains is above this limit, we'll instead categorize tools
 * within the toolset into groups.
 */
export const GROUP_WITHIN_TOOLSET = HARD_TOOL_LIMIT / 8; // 16, currently

/** Minimum number of tools in a toolset to group, vs always just including them individually. */
export const MIN_TOOLSET_SIZE_TO_GROUP = GROUP_WITHIN_TOOLSET / 4; // 4, currently

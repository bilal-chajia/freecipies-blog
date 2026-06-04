import type { DiscoveredModel, ModelSelection } from '../types';

function toSelection(
    discovered: DiscoveredModel,
    stored: ModelSelection | undefined,
    order: number,
): ModelSelection {
    const deprecated = discovered.deprecated === true;
    return {
        id: discovered.id,
        name: discovered.name ?? stored?.name,
        context_window: discovered.context_window ?? stored?.context_window,
        max_tokens: discovered.max_tokens ?? stored?.max_tokens,
        modality: discovered.modality,
        supports_thinking: discovered.supports_thinking ?? stored?.supports_thinking,
        enabled: stored?.enabled ?? false,
        order: stored?.order ?? order,
        deprecated: discovered.deprecated ?? stored?.deprecated,
        status: deprecated ? 'deprecated' : 'available',
        source: stored?.source ?? 'discovered',
    };
}

export function reconcileSelection(
    stored: ModelSelection[],
    discovered: DiscoveredModel[],
): ModelSelection[] {
    const discoveredIds = new Set(discovered.map((model) => model.id));
    const storedById = new Map(stored.map((model) => [model.id, model]));

    const reconciled = discovered.map((model, index) => toSelection(model, storedById.get(model.id), index));

    for (const model of stored) {
        if (discoveredIds.has(model.id)) continue;
        reconciled.push({
            ...model,
            status: 'unavailable',
        });
    }

    return reconciled.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

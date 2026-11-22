// SDK loaders the plugin skill tells plugins to call. The real host provides them on every surface, so the
// fixture hosts answer them from their settings; a missing one leaves the plugin waiting on an unknown method.
export const hostLoaders = (settings) => {
  const ofItemType = (entities, itemTypeId) =>
    Object.values(entities).filter((entity) => entity.relationships?.item_type?.data?.id === itemTypeId);
  return {
    loadItemTypeFields: async (itemTypeId) => ofItemType(settings().fields, itemTypeId),
    loadItemTypeFieldsets: async (itemTypeId) => ofItemType(settings().fieldsets, itemTypeId),
    loadFieldsUsingPlugin: async () => [],
    loadUsers: async () => Object.values(settings().users),
    loadSsoUsers: async () => [],
    // SDK 3.0.0-next.4 loaders (datocms-react-ui 4 Canvas also calls them when present): one entry per
    // requested ID, in order, null when the host has no such record or asset.
    loadItems: async (ids) => ids.map((id) => settings().items?.[id] ?? null),
    loadUploads: async (ids) => ids.map((id) => settings().uploads?.[id] ?? null),
    loadItemPresentationInfo: async (itemsOrIds) => itemsOrIds.map(() => null),
  };
};

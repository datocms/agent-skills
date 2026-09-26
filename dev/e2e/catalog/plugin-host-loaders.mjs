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
  };
};

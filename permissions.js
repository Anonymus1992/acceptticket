function hasAnyRole(member, roleIds = []) {
  if (!member || !Array.isArray(roleIds)) return false;
  return roleIds.some((id) => id && !id.startsWith("PASTE_") && member.roles.cache.has(id));
}

function isStaff(member, config) {
  return hasAnyRole(member, config.roles.staffRoleIds) ||
    hasAnyRole(member, config.roles.adminRoleIds) ||
    Boolean(member?.permissions?.has("Administrator"));
}

function isAdmin(member, config) {
  return hasAnyRole(member, config.roles.adminRoleIds) ||
    Boolean(member?.permissions?.has("Administrator"));
}

module.exports = { isStaff, isAdmin };

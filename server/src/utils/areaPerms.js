// @ts-check
const config = require('@rm/config')

/**
 * @param {string[]} roles
 * @returns {string[]}
 */
function areaPerms(roles) {
  const areaRestrictions = config.getSafe('authentication.areaRestrictions')
  const areas = config.getSafe('areas')

  const perms = []
  for (let i = 0; i < roles.length; i += 1) {
    for (let j = 0; j < areaRestrictions.length; j += 1) {
      if (areaRestrictions[j].roles.includes(roles[i])) {
        const parents = areaRestrictions[j].parent || []
        if (areaRestrictions[j].areas.length || parents.length) {
          for (let k = 0; k < areaRestrictions[j].areas.length; k += 1) {
            if (areas.names.has(areaRestrictions[j].areas[k])) {
              perms.push(areaRestrictions[j].areas[k])
            } else if (areas.withoutParents[areaRestrictions[j].areas[k]]) {
              perms.push(...areas.withoutParents[areaRestrictions[j].areas[k]])
            }
          }
          // Grants every child of the named parent. The parent's own polygon
          // (if it has one) is not included - list it in `areas` to grant it.
          for (let k = 0; k < parents.length; k += 1) {
            if (areas.childrenByParent[parents[k]]) {
              perms.push(...areas.childrenByParent[parents[k]])
            }
          }
        } else {
          return []
        }
      }
    }
  }
  return [...new Set(perms)]
}

module.exports = { areaPerms }

const { Model } = require('objection')

const {
  database: {
    settings: { userTableName, gymBadgeTableName },
  },
} = require('../services/config')
const { log, HELPERS } = require('../services/logger')

class User extends Model {
  /** @returns {string} */
  static get tableName() {
    return userTableName
  }

  static async clearPerms(userId, strategy, botName) {
    await this.query()
      .update({ [`${strategy}Perms`]: null })
      .where({ [`${strategy}Id`]: userId })
      .then(() =>
        log.info(
          HELPERS.custom(botName, '#fff2cc'),
          `Cleared ${strategy} perms for user ${userId}`,
        ),
      )
  }

  static get relationMappings() {
    // eslint-disable-next-line global-require
    const { Db } = require('../services/initialization')
    return {
      badges: {
        relation: Model.HasManyRelation,
        modelClass: Db.models.Badge,
        join: {
          from: `${userTableName}.id`,
          to: `${gymBadgeTableName}.userId`,
        },
      },
      nestSubmissions: {
        relation: Model.HasManyRelation,
        modelClass: Db.models.NestSubmission,
        join: {
          from: `${userTableName}.id`,
          to: `nest_submissions.userId`,
        },
      },
    }
  }
}

module.exports = User

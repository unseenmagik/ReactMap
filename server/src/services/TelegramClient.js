const fetch = require('node-fetch')
const { TelegramStrategy } = require('@rainb0w-clwn/passport-telegram-official')
const passport = require('passport')

const Utility = require('./Utility')
const { Db } = require('./initialization')
const {
  map: { forceTutorial },
  authentication,
} = require('./config')
const { log, HELPERS } = require('./logger')

module.exports = class TelegramClient {
  constructor(strategy, rmStrategy) {
    this.strategy = strategy
    this.rmStrategy = rmStrategy
    this.perms = authentication.perms
    this.alwaysEnabledPerms = authentication.alwaysEnabledPerms
  }

  async getUserGroups(user) {
    if (!user || !user.id) return []

    const groups = [user.id]
    await Promise.all(
      this.strategy.groups.map(async (group) => {
        try {
          const response = await fetch(
            `https://api.telegram.org/bot${this.strategy.botToken}/getChatMember?chat_id=${group}&user_id=${user.id}`,
          )
          if (!response) {
            throw new Error(
              'Unable to query TG API or User is not in the group',
            )
          }
          if (!response.ok) {
            throw new Error(
              `Telegram API error: ${response.status} ${response.statusText}`,
            )
          }
          const json = await response.json()
          if (
            json.result.status !== 'left' &&
            json.result.status !== 'kicked'
          ) {
            groups.push(group)
          }
        } catch (e) {
          log.error(
            HELPERS.custom(this.rmStrategy, '#26A8EA'),
            e,
            `Telegram Group: ${group}`,
            `User: ${user.id} (${user.username})`,
          )
          return null
        }
      }),
    )
    return groups
  }

  getUserPerms(user, groups) {
    const date = new Date()
    const trialActive =
      this.strategy.trialPeriod &&
      date >= this.strategy.trialPeriod.start.js &&
      date <= this.strategy.trialPeriod.end.js

    const newUserObj = {
      ...user,
      perms: {
        ...Object.fromEntries(
          Object.entries(this.perms).map(([perm, info]) => [
            perm,
            info.enabled &&
              (this.alwaysEnabledPerms.includes(perm) ||
                info.roles.some((role) => groups.includes(role)) ||
                (trialActive &&
                  info.trialPeriodEligible &&
                  this.strategy.trialPeriod.roles.some((role) =>
                    groups.includes(role),
                  ))),
          ]),
        ),
        areaRestrictions: Utility.areaPerms(groups, 'telegram', trialActive),
        webhooks: Utility.webhookPerms(groups, 'telegramGroups', trialActive),
        scanner: Utility.scannerPerms(groups, 'telegramGroups', trialActive),
      },
    }
    return newUserObj
  }

  async authHandler(req, profile, done) {
    const baseUser = { ...profile, rmStrategy: this.rmStrategy }
    const groups = await this.getUserGroups(baseUser)
    const user = this.getUserPerms(baseUser, groups)

    if (!user.perms.map) {
      log.warn(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        user.username,
        'was not given map perms',
      )
      return done(null, false, { message: 'access_denied' })
    }
    try {
      await Db.models.User.query()
        .findOne({ telegramId: user.id })
        .then(async (userExists) => {
          if (req.user && userExists?.strategy === 'local') {
            await Db.models.User.query()
              .update({
                telegramId: user.id,
                telegramPerms: JSON.stringify(user.perms),
                webhookStrategy: 'telegram',
              })
              .where('id', req.user.id)
            await Db.models.User.query()
              .where('telegramId', user.id)
              .whereNot('id', req.user.id)
              .delete()
            log.info(
              HELPERS.custom(this.rmStrategy, '#26A8EA'),
              user.username,
              `(${user.id})`,
              'Authenticated successfully.',
            )
            return done(null, {
              ...user,
              ...req.user,
              username: userExists.username || user.username,
              telegramId: user.id,
              perms: Utility.mergePerms(req.user.perms, user.perms),
            })
          }
          if (!userExists) {
            userExists = await Db.models.User.query().insertAndFetch({
              telegramId: user.id,
              strategy: user.provider,
              tutorial: !forceTutorial,
            })
          }
          if (userExists.strategy !== 'telegram') {
            await Db.models.User.query()
              .update({ strategy: 'telegram' })
              .where('id', userExists.id)
            userExists.strategy = 'telegram'
          }
          log.info(
            HELPERS.custom(this.rmStrategy, '#26A8EA'),
            user.username,
            `(${user.id})`,
            'Authenticated successfully.',
          )
          return done(null, {
            ...user,
            ...userExists,
            username: userExists.username || user.username,
          })
        })
    } catch (e) {
      log.error(
        HELPERS.custom(this.rmStrategy, '#26A8EA'),
        'User has failed auth.',
        e,
      )
    }
  }

  initPassport() {
    passport.use(
      this.rmStrategy,
      new TelegramStrategy(
        {
          botToken: this.strategy.botToken,
          passReqToCallback: true,
        },
        (...args) => this.authHandler(...args),
      ),
    )
  }
}

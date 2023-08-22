/* eslint-disable no-nested-ternary */
import React, { Fragment, useState, useEffect } from 'react'
import Check from '@mui/icons-material/Check'
import Clear from '@mui/icons-material/Clear'
import ExpandMore from '@mui/icons-material/ExpandMore'
import MoreVert from '@mui/icons-material/MoreVert'
import {
  Grid,
  Avatar,
  Typography,
  Collapse,
  IconButton,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import ErrorBoundary from '@components/ErrorBoundary'

import GenericTimer from './common/Timer'
import NameTT from './common/NameTT'
import GenderIcon from './common/GenderIcon'
import Navigation from './common/Navigation'
import Coords from './common/Coords'

const rowClass = { width: 30, fontWeight: 'bold' }

const leagueLookup = {
  great: '1500',
  ultra: '2500',
  master: '9000',
}

const getColor = (ivPercent) => {
  switch (true) {
    case ivPercent < 50:
      return 'error.main'
    case ivPercent < 80:
      return 'warning.main'
    case ivPercent < 100:
      return 'info.main'
    case ivPercent === 100:
      return 'success.main'
    default:
      return 'text.primary'
  }
}

export default function PokemonPopup({
  pokemon,
  iconUrl,
  userSettings,
  isTutorial,
  Icons,
  timeOfDay,
}) {
  const { t } = useTranslation()
  const { pokemon_id, cleanPvp, iv, cp } = pokemon
  const { perms } = useStatic((state) => state.auth)
  const pokePerms = isTutorial
    ? {
        pvp: true,
        iv: true,
      }
    : perms
  const {
    pokemon: { [pokemon_id]: metaData },
  } = useStatic((state) => state.masterfile)
  const popups = useStore((state) => state.popups)
  const setPopups = useStore((state) => state.setPopups)
  const hasLeagues = cleanPvp ? Object.keys(cleanPvp) : []
  const hasStats = iv || cp

  useEffect(() => {
    Utility.analytics(
      'Popup',
      `ID: ${pokemon.pokemon_id} IV: ${pokemon.iv}% PVP: #${pokemon.bestPvp}`,
      'Pokemon',
    )
  }, [])

  return (
    <ErrorBoundary noRefresh style={{}} variant="h5">
      <Grid
        container
        style={{ width: 200 }}
        alignItems="center"
        justifyContent="center"
        spacing={1}
      >
        <Header
          pokemon={pokemon}
          metaData={metaData}
          iconUrl={iconUrl}
          t={t}
          perms={perms}
          userSettings={userSettings}
          isTutorial={isTutorial}
        />
        {pokemon.seen_type !== 'encounter' && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <Typography variant="caption">
              {t(`seen_${pokemon.seen_type}`, '')}
            </Typography>
          </Grid>
        )}
        {pokemon.seen_type === 'nearby_cell' && (
          <Typography>{t('pokemon_cell')}</Typography>
        )}
        {!!pokemon.expire_timestamp && (
          <Timer pokemon={pokemon} hasStats={hasStats} t={t} />
        )}
        {hasStats && pokePerms.iv && (
          <>
            <Stats pokemon={pokemon} metaData={metaData} t={t} />
            <Divider orientation="vertical" flexItem />
          </>
        )}
        <Info
          pokemon={pokemon}
          metaData={metaData}
          perms={pokePerms}
          Icons={Icons}
          timeOfDay={timeOfDay}
          t={t}
        />
        <Footer
          pokemon={pokemon}
          popups={popups}
          setPopups={setPopups}
          hasPvp={!!hasLeagues.length}
          Icons={Icons}
        />
        <Collapse in={popups.pvp && perms.pvp} timeout="auto" unmountOnExit>
          {hasLeagues.map((league) => (
            <PvpInfo
              key={league}
              league={league}
              data={cleanPvp[league]}
              t={t}
              Icons={Icons}
              pokemon={pokemon}
            />
          ))}
        </Collapse>
        <Collapse in={popups.extras} timeout="auto" unmountOnExit>
          <ExtraInfo
            pokemon={pokemon}
            perms={pokePerms}
            userSettings={userSettings}
            t={t}
            Icons={Icons}
          />
        </Collapse>
      </Grid>
    </ErrorBoundary>
  )
}

const Header = ({
  pokemon,
  metaData,
  t,
  iconUrl,
  userSettings,
  isTutorial,
}) => {
  const hideList = useStatic((state) => state.hideList)
  const setHideList = useStatic((state) => state.setHideList)
  const excludeList = useStatic((state) => state.excludeList)
  const setExcludeList = useStatic((state) => state.setExcludeList)
  const timerList = useStatic((state) => state.timerList)
  const setTimerList = useStatic((state) => state.setTimerList)
  const filters = useStore((state) => state.filters)
  const setFilters = useStore((state) => state.setFilters)

  const [anchorEl, setAnchorEl] = useState(false)
  const { id, pokemon_id, form, ditto_form, display_pokemon_id } = pokemon

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleHide = () => {
    setAnchorEl(null)
    setHideList([...hideList, id])
  }

  const handleExclude = () => {
    setAnchorEl(null)
    const key = `${pokemon_id}-${form}`
    if (filters?.pokemon?.filter) {
      setFilters({
        ...filters,
        pokemon: {
          ...filters.pokemon,
          filter: {
            ...filters.pokemon.filter,
            [key]: {
              ...filters.pokemon.filter[key],
              enabled: false,
            },
          },
        },
      })
      setExcludeList([...excludeList, key])
    }
  }

  const handleTimer = () => {
    setAnchorEl(null)
    if (timerList.includes(id)) {
      setTimerList(timerList.filter((x) => x !== id))
    } else {
      setTimerList([...timerList, id])
    }
  }

  const options = [
    { name: 'timer', action: handleTimer },
    { name: 'hide', action: handleHide },
  ]
  if (
    isTutorial ||
    filters?.pokemon?.filter?.[`${pokemon_id}-${form}`]?.enabled
  ) {
    options.push({ name: 'exclude', action: handleExclude })
  }
  const pokeName = t(`poke_${metaData.pokedexId}`)
  const formName =
    metaData.forms?.[form]?.name === 'Normal' || form === 0
      ? ''
      : t(`form_${pokemon.form}`)

  return (
    <>
      <Grid item xs={3}>
        {userSettings.showDexNumInPopup ? (
          <Avatar>{metaData.pokedexId}</Avatar>
        ) : (
          <img
            src={iconUrl}
            style={{ maxWidth: 40, maxHeight: 40 }}
            alt={pokemon.pokemon_id}
          />
        )}
      </Grid>
      <Grid item xs={6} style={{ textAlign: 'center' }}>
        <Typography variant={pokeName.length > 8 ? 'h6' : 'h5'}>
          {pokeName}
        </Typography>
        {ditto_form !== null && display_pokemon_id ? (
          <Typography variant="caption">
            ({t(`poke_${display_pokemon_id}`)})
          </Typography>
        ) : (
          <Typography variant="caption">{formName}</Typography>
        )}
      </Grid>
      <Grid item xs={3}>
        <IconButton aria-haspopup="true" onClick={handleClick} size="large">
          <MoreVert />
        </IconButton>
      </Grid>
      <Menu
        anchorEl={anchorEl}
        keepMounted
        open={!!anchorEl}
        onClose={handleClose}
        PaperProps={{
          style: {
            maxHeight: 216,
            minWidth: '20ch',
          },
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.key || option.name} onClick={option.action}>
            {typeof option.name === 'string' ? t(option.name) : option.name}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const Stats = ({ pokemon, t }) => {
  const { cp, iv, atk_iv, def_iv, sta_iv, level, inactive_stats } = pokemon

  return (
    <Grid
      item
      xs={8}
      container
      direction="column"
      justifyContent="space-around"
      alignItems="center"
    >
      {iv !== null && (
        <Grid item>
          <Typography variant="h5" align="center" color={getColor(iv)}>
            {iv.toFixed(2)}
            {t('%')}
          </Typography>
        </Grid>
      )}
      {atk_iv !== null && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {atk_iv} | {def_iv} | {sta_iv} {inactive_stats ? '*' : ''}
          </Typography>
        </Grid>
      )}
      {level !== null && (
        <Grid item>
          <Typography variant="subtitle1" align="center">
            {t('cp')} {cp} | {t('abbreviation_level')}
            {level}
          </Typography>
        </Grid>
      )}
    </Grid>
  )
}

const Info = ({ pokemon, metaData, perms, Icons, timeOfDay, t }) => {
  const { gender, size, weather, form } = pokemon
  const formTypes = metaData?.forms?.[form]?.types || metaData?.types || []

  return (
    <Grid
      item
      xs={perms.iv ? 3 : 11}
      container
      direction={perms.iv ? 'column' : 'row'}
      justifyContent="space-around"
      alignItems="center"
    >
      {weather != 0 && perms.iv && (
        <Grid
          item
          className="grid-item"
          style={{
            height: 24,
            width: 24,
            backgroundImage: `url(${Icons.getWeather(weather, timeOfDay)})`,
          }}
        />
      )}
      {!!gender && (
        <Grid item style={{ textAlign: 'center' }}>
          <GenderIcon gender={gender} />
        </Grid>
      )}
      {!!size && Number.isInteger(size) && (
        <Grid
          item
          style={{
            height: 24,
            width: 24,
            textAlign: 'center',
          }}
        >
          <Typography variant="caption">{t(`size_${size}`)}</Typography>
        </Grid>
      )}

      {formTypes.map((type) => (
        <Grid
          item
          key={type}
          className="grid-item"
          style={{
            height: 20,
            width: 20,
            marginBottom: 5,
            backgroundImage: `url(${Icons.getTypes(type)})`,
          }}
        />
      ))}
    </Grid>
  )
}

const Timer = ({ pokemon, hasStats, t }) => {
  const { expire_timestamp, expire_timestamp_verified } = pokemon
  const despawnTimer = new Date(expire_timestamp * 1000)
  const [timer, setTimer] = useState(Utility.getTimeUntil(despawnTimer, true))

  useEffect(() => {
    const timer2 = setTimeout(() => {
      setTimer(Utility.getTimeUntil(despawnTimer, true))
    }, 1000)
    return () => clearTimeout(timer2)
  })

  return (
    <>
      <Grid item xs={hasStats ? 9 : 6}>
        <Typography variant="h6" align="center">
          {timer.str}
        </Typography>
        <Typography variant="subtitle2" align="center">
          {despawnTimer.toLocaleTimeString(
            localStorage.getItem('i18nextLng') || 'en',
          )}
        </Typography>
      </Grid>
      <Grid item xs={hasStats ? 3 : 2}>
        <Tooltip
          title={
            expire_timestamp_verified
              ? t('timer_verified')
              : t('timer_unverified')
          }
          arrow
          enterTouchDelay={0}
        >
          {expire_timestamp_verified ? (
            <Check fontSize="large" color="success" />
          ) : (
            <Clear fontSize="large" color="error" />
          )}
        </Tooltip>
      </Grid>
    </>
  )
}

const Footer = ({ pokemon, popups, setPopups, hasPvp, Icons }) => {
  const { lat, lon } = pokemon
  const darkMode = useStore((s) => s.darkMode)

  const handleExpandClick = (category) => {
    const opposite = category === 'extras' ? 'pvp' : 'extras'
    setPopups({
      ...popups,
      [category]: !popups[category],
      [opposite]: false,
    })
  }

  return (
    <>
      {hasPvp && (
        <Grid item xs={4}>
          <IconButton
            className={popups.pvp ? 'expanded' : 'closed'}
            name="pvp"
            onClick={() => handleExpandClick('pvp')}
            size="large"
          >
            <img
              alt="pvp"
              className={darkMode ? '' : 'darken-image'}
              src={Icons.getMisc('pvp')}
              height={20}
              width="auto"
            />
          </IconButton>
        </Grid>
      )}
      <Grid item xs={4} style={{ textAlign: 'center' }}>
        <Navigation lat={lat} lon={lon} />
      </Grid>
      <Grid item xs={4}>
        <IconButton
          className={popups.extras ? 'expanded' : 'closed'}
          onClick={() => handleExpandClick('extras')}
          size="large"
        >
          <ExpandMore />
        </IconButton>
      </Grid>
    </>
  )
}

const ExtraInfo = ({ pokemon, perms, userSettings, t, Icons }) => {
  const { moves } = useStatic((state) => state.masterfile)

  const { move_1, move_2, first_seen_timestamp, updated, iv } = pokemon

  return (
    <Grid container alignItems="center" justifyContent="center">
      {perms.iv &&
        iv !== null &&
        [move_1, move_2].map((move) => {
          if (!move) return null
          return (
            <Fragment key={move}>
              <Grid
                item
                xs={2}
                className="grid-item"
                style={{
                  height: 15,
                  width: 15,
                  backgroundImage: `url(${Icons.getTypes(moves[move].type)})`,
                }}
              />
              <Grid item xs={4}>
                <Typography variant="caption">{t(`move_${move}`)}</Typography>
              </Grid>
              {/* <Grid item xs={3} style={{ textAlign: 'right' }}>
                <Typography variant="caption">
                  {i
                    ? `${weight ? weight.toFixed(2) : '? '}${t('kilogram')}`
                    : `${height ? height.toFixed(2) : '? '}${t('meter')}`}
                </Typography>
              </Grid> */}
            </Fragment>
          )
        })}
      <Divider
        flexItem
        style={{ width: '100%', height: 2, margin: '10px 0' }}
      />
      {[first_seen_timestamp, updated].map((time, i) =>
        time ? (
          <Grid
            container
            item
            xs={6}
            key={`${time}-${i ? 'updated' : 'first'}`}
            style={{ flexGrow: i ? 0 : 1, textAlign: 'center' }}
            direction="column"
          >
            <Grid item>
              <Typography variant="subtitle2">
                {i ? t('last_seen') : t('first_seen')}:
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="caption">
                {new Date(time * 1000).toLocaleTimeString(
                  localStorage.getItem('i18nextLng') || 'en',
                )}
              </Typography>
            </Grid>
            <Grid item>
              <GenericTimer expireTime={time} />
            </Grid>
          </Grid>
        ) : null,
      )}
      {process.env.NODE_ENV === 'development' && (
        <Grid item xs={12} style={{ paddingTop: 10 }}>
          <Typography variant="subtitle1" align="center">
            {pokemon.id}
          </Typography>
        </Grid>
      )}
      {userSettings.enablePokemonPopupCoords && (
        <Grid item xs={12} style={{ textAlign: 'center' }}>
          <Coords lat={pokemon.lat.toFixed(6)} lon={pokemon.lon.toFixed(6)} />
        </Grid>
      )}
    </Grid>
  )
}

const PvpInfo = ({ pokemon, league, data, t, Icons }) => {
  if (data === null) return ''

  const rows = data
    .map((each) =>
      each.rank !== null && each.cp !== null
        ? {
            id: `${league}-${each.pokemon}-${each.form}-${each.evolution}-${each.gender}-${each.rank}-${each.cp}-${each.lvl}-${each.cap}`,
            img: (
              <NameTT
                id={[
                  each.evolution
                    ? `evo_${each.evolution}`
                    : each.form
                    ? `form_${each.form}`
                    : '',
                  `poke_${each.pokemon}`,
                ]}
              >
                <img
                  src={Icons.getPokemon(
                    each.pokemon,
                    each.form,
                    each.evolution,
                    each.gender,
                    pokemon.costume,
                  )}
                  style={{ maxWidth: 40, maxHeight: 20 }}
                  alt={t(`poke_${each.pokemon}`)}
                />
              </NameTT>
            ),
            rank: each.rank || 0,
            cp: each.cp || 0,
            lvl: `${each.level || ''}${
              each.cap && !each.capped ? `/${each.cap}` : ''
            }`,
            percent: (each.percentage * 100).toFixed(1) || 0,
          }
        : null,
    )
    .filter(Boolean)

  return (
    <table className="table-pvp">
      <thead>
        <tr>
          <td style={rowClass}>
            <img
              src={Icons.getMisc(leagueLookup[league] || '500')}
              height={20}
              alt={league}
            />
          </td>
          <td style={rowClass}>{t('rank')}</td>
          <td style={rowClass}>{t('cp')}</td>
          <td style={rowClass}>{t('lvl')}</td>
          <td style={rowClass}>{t('%')}</td>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td> {row.img}</td>
            <td>{row.rank}</td>
            <td>{row.cp}</td>
            <td>{row.lvl}</td>
            <td>{row.percent}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

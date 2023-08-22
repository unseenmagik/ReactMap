import React from 'react'
import {
  Divider,
  FormControl,
  InputLabel,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
} from '@mui/material'
import TranslateIcon from '@mui/icons-material/Translate'
import MapIcon from '@mui/icons-material/Map'
import NavIcon from '@mui/icons-material/Navigation'
import StyleIcon from '@mui/icons-material/Style'
import DevicesOtherIcon from '@mui/icons-material/DevicesOther'
import Brightness7Icon from '@mui/icons-material/Brightness7'

import { useTranslation } from 'react-i18next'

import { useStore, useStatic } from '@hooks/useStore'
import Utility from '@services/Utility'
import DrawerActions from './Actions'
import BoolToggle from './BoolToggle'

function FCSelect({ name, label, value, onChange, children, icon }) {
  return (
    <ListItem dense>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <FormControl size="small" fullWidth style={{ margin: '3px 0' }}>
        <InputLabel>{label}</InputLabel>
        <Select
          autoFocus
          name={name}
          value={value}
          onChange={onChange}
          fullWidth
          label={label}
        >
          {children}
        </Select>
      </FormControl>
    </ListItem>
  )
}

const ICON_MAP = {
  localeSelection: TranslateIcon,
  navigation: NavIcon,
  navigationControls: StyleIcon,
  tileServers: MapIcon,
}

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { config, setIcons: setStaticIcons } = useStatic.getState()
  const { setIcons, setSettings } = useStore.getState()

  const Icons = useStatic((s) => s.Icons)
  const staticSettings = useStatic((s) => s.settings)

  const settings = useStore((s) => s.settings)
  const icons = useStore((s) => s.icons)
  const darkMode = useStore((s) => s.darkMode)

  return (
    <>
      {Object.keys(staticSettings).map((setting) => {
        const Icon = ICON_MAP[setting] || DevicesOtherIcon
        return (
          <FCSelect
            key={setting}
            name={setting}
            value={config[setting][settings[setting]]?.name || ''}
            label={t(Utility.camelToSnake(setting))}
            onChange={({ target }) => {
              setSettings({
                ...settings,
                [target.name]: config[target.name][target.value].name,
              })
              if (target.name === 'localeSelection') {
                i18n.changeLanguage(target.value)
              }
            }}
            icon={<Icon />}
          >
            {Object.keys(config[setting]).map((option) => (
              <MenuItem key={option} value={option}>
                {t(
                  `${Utility.camelToSnake(setting)}_${option.toLowerCase()}`,
                  Utility.getProperName(option),
                )}
              </MenuItem>
            ))}
          </FCSelect>
        )
      })}
      <Divider style={{ margin: '10px 0' }} />
      {Icons.customizable.map((category) => (
        <FCSelect
          key={category}
          name={category}
          color="secondary"
          value={icons[category]}
          label={t(`${category}_icons`, `${category} Icons`)}
          onChange={({ target }) => {
            Icons.setSelection(target.name, target.value)
            setStaticIcons(Icons)
            setIcons({ ...icons, [target.name]: target.value })
          }}
          icon={
            <img
              src={Icons.getMisc(category)}
              alt={category}
              width={24}
              className={darkMode ? '' : 'darken-image'}
            />
          }
        >
          {Icons[category].map((option) => (
            <MenuItem key={option} value={option}>
              {t(
                `${category.toLowerCase()}_${option.toLowerCase()}`,
                Utility.getProperName(option),
              )}
            </MenuItem>
          ))}
        </FCSelect>
      ))}
      <Divider style={{ margin: '10px 0' }} />
      <BoolToggle field="darkMode" label="dark_mode">
        <ListItemIcon>
          <Brightness7Icon />
        </ListItemIcon>
      </BoolToggle>
      {!config.map?.separateDrawerActions && (
        <>
          <Divider style={{ margin: '10px 0' }} />
          <DrawerActions />
        </>
      )}
    </>
  )
}

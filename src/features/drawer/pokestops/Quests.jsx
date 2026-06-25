// @ts-check
import * as React from 'react'

import { useStorage } from '@store/useStorage'

import { CollapsibleItem } from '../components/CollapsibleItem'
import { MultiSelectorList, SelectorListMemo } from '../components/SelectorList'

const BaseQuestQuickSelect = () => {
  const enabled = useStorage((s) => !!s.filters?.pokestops?.quests)
  return (
    <CollapsibleItem open={enabled}>
      <MultiSelectorList tabKey="quests">
        <SelectorListMemo
          key="items"
          category="pokestops"
          subCategory="quests"
          label="search_quests"
          height={350}
        />
        <SelectorListMemo
          key="pokemon"
          category="pokestops"
          subCategory="pokemon"
          label="search_quests"
          height={350}
        />
      </MultiSelectorList>
    </CollapsibleItem>
  )
}

export const QuestQuickSelect = React.memo(BaseQuestQuickSelect)

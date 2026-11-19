import { useI18n } from './lib/i18n'
import Dropdown from './Dropdown'

// Language picker: English, Bahasa Malaysia, Chinese (Simplified, as used in Malaysia).
export const LANGS = [
  ['en', 'EN'],
  ['bm', 'BM'],
  ['zh', '中文'],
]

const OPTIONS = LANGS.map(([value, label]) => ({ value, label }))

export default function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <Dropdown
      className="lang-switch"
      compact
      value={lang}
      options={OPTIONS}
      onChange={setLang}
      label="Language / Bahasa / 语言"
    />
  )
}

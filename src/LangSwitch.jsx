import { useI18n } from './lib/i18n'

// Language picker: English, Bahasa Malaysia, Chinese (Simplified, as used in Malaysia).
export const LANGS = [
  ['en', 'EN'],
  ['bm', 'BM'],
  ['zh', '中文'],
]

export default function LangSwitch() {
  const { lang, setLang } = useI18n()
  return (
    <select
      className="lang-switch"
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language / Bahasa / 语言"
    >
      {LANGS.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  )
}

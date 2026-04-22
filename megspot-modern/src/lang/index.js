import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'
import ja from './ja'

const messages = {
  zh,
  en,
  ja
}

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
})

export default i18n

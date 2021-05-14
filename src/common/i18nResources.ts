import type { Resource } from 'i18next';

export default {
  'de-DE': (): Promise<Resource> => import('../i18n/de-DE.i18n.json'),
  'en': (): Promise<Resource> => import('../i18n/en.i18n.json'),
  'fr': (): Promise<Resource> => import('../i18n/fr.i18n.json'),
  'hu': (): Promise<Resource> => import('../i18n/hu.i18n.json'),
  'ja': (): Promise<Resource> => import('../i18n/ja.i18n.json'),
  'pl': (): Promise<Resource> => import('../i18n/pl.i18n.json'),
  'pt-BR': (): Promise<Resource> => import('../i18n/pt-BR.i18n.json'),
  'ru': (): Promise<Resource> => import('../i18n/ru.i18n.json'),
  'tr-TR': (): Promise<Resource> => import('../i18n/tr-TR.i18n.json'),
  'uk-UA': (): Promise<Resource> => import('../i18n/uk-UA.i18n.json'),
  'zh-CN': (): Promise<Resource> => import('../i18n/zh-CN.i18n.json'),
  'zh-TW': (): Promise<Resource> => import('../i18n/zh-TW.i18n.json'),
} as const;

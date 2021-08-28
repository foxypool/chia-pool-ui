import { Injectable } from '@angular/core';
import en from '../snippets/en';
import de from '../snippets/de';
import zh_CN from '../snippets/zh_CN';
import {LocalStorageService} from './local-storage.service';
import {BehaviorSubject} from 'rxjs';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class SnippetService {

  private languages = {
    en: [en, 'English'],
    de: [de, 'Deutsch'],
    zh_CN: [zh_CN, '中文'],
  };
  private readonly _languagesArray;
  private _selectedLanguage;
  private _selectedLanguageSubject = new BehaviorSubject<String>(this.selectedLanguage);

  constructor(
    private localStorageService: LocalStorageService,
  ) {
    let language = 'en';
    if (!localStorageService.getItem('language')) {
      const lang = navigator.language || '';
      if (lang.startsWith('en')) {
        language = 'en';
      } else if (lang.startsWith('de')) {
        language = 'de';
      } else if (lang.startsWith('zh')) {
        language = 'zh_CN';
      }
    }
    this.selectedLanguage = localStorageService.getItem('language') || language;
    this._languagesArray = this.getLanguages();
  }

  getSnippet(key, ...params) {
    let snippet = this.languages[this.selectedLanguage] && this.languages[this.selectedLanguage][0][key];
    if (!snippet) {
      snippet = this.languages.en[0][key];
      if (!snippet) {
        return null;
      }
    }
    params.forEach((value, index) => {
      snippet = snippet.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), value);
    });

    return snippet;
  }

  getSelectedLanguage() {
    const lang = this.languages[this.selectedLanguage];
    if (!lang) {
      return 'Language';
    }

    return lang[1];
  }

  get selectedLanguage() {
    return this._selectedLanguage;
  }

  set selectedLanguage(value) {
    this._selectedLanguage = value;
    this.selectedLanguageSubject.next(value);
    moment.locale(this._selectedLanguage);
  }

  get selectedLanguageSubject(): BehaviorSubject<String> {
    return this._selectedLanguageSubject;
  }

  getLanguages() {
    return Object.keys(this.languages).map(key => ([key, this.languages[key][1]]));
  }

  setLanguage(code) {
    this.selectedLanguage = code;
    this.localStorageService.setItem('language', this.selectedLanguage);
  }

  get languagesArray() {
    return this._languagesArray;
  }
}

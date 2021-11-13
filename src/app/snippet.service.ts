import { Injectable } from '@angular/core';
import en from '../snippets/en';

@Injectable({
  providedIn: 'root'
})
export class SnippetService {
  getSnippet(key, ...params) {
    let snippet = en[key];
    if (!snippet) {
      return null;
    }
    params.forEach((value, index) => {
      snippet = snippet.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), value);
    });

    return snippet;
  }
}

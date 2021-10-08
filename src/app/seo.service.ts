import {Injectable} from '@angular/core';
import {Meta, Title} from '@angular/platform-browser';

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  constructor(
    private title: Title,
    private meta: Meta,
  ) {}

  updateTitle(title: string) {
    if (this.title.getTitle() === title) {
      return;
    }
    this.title.setTitle(title);
  }

  updateMeta({ name, content }) {
    this.meta.updateTag({ name, content });
  }
}

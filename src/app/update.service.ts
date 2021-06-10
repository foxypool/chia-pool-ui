import {Injectable} from "@angular/core";
import {SwUpdate} from "@angular/service-worker";
import {ToastService} from "./toast.service";
import {SnippetService} from "./snippet.service";

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  constructor(
    swUpdate: SwUpdate,
    toastService: ToastService,
    snippetService: SnippetService,
  ) {
    swUpdate.available.subscribe(async () => {
      toastService.showInfoToast(snippetService.getSnippet('update-service.updating'), '', { timeOut: 2 * 1000 });
      await Promise.all([
        swUpdate.activateUpdate(),
        new Promise(resolve => setTimeout(resolve, 2 * 1000)),
      ]);
      document.location.reload();
    });
  }
}

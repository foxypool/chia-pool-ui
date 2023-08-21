import {ToastrService} from 'ngx-toastr'
import {Injectable} from '@angular/core'
import {IndividualConfig} from 'ngx-toastr/toastr/toastr-config'

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private readonly toastr: ToastrService) {}

  showSuccessToast(msg, title = '', options: Partial<IndividualConfig> = {}) {
    options = Object.assign({
      timeOut: 1500,
      progressBar: true,
      tapToDismiss: false,
    }, options)
    this.toastr.success(msg, title, options)
  }

  showInfoToast(msg, title = '', options: Partial<IndividualConfig> = {}) {
    options = Object.assign({
      timeOut: 3000,
      progressBar: true,
      tapToDismiss: false,
    }, options)
    this.toastr.info(msg, title, options)
  }

  showErrorToast(msg, title = '', options: Partial<IndividualConfig> = {}) {
    options = Object.assign({
      timeOut: 5000,
      progressBar: true,
      tapToDismiss: false,
    }, options)
    this.toastr.error(msg, title, options)
  }
}

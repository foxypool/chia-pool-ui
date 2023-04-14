import { ResizeObserver } from '@juggle/resize-observer';

if (!('ResizeObserver' in window)) {
  (window as any).ResizeObserver = ResizeObserver;
}

import { io } from 'socket.io-client';

export class WebsocketService {
  private socket;

  constructor(url: string) {
    this.socket = io(`${url}/stats`, {
      transports: ['websocket']
    });
  }

  subscribe(topic, cb) {
    this.socket.on(topic, cb);
  }

  publish(topic, ...args) {
    this.socket.emit(topic, ...args);
  }
}

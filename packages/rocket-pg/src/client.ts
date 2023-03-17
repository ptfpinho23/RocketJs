import * as net from 'net'
import { EventEmitter } from 'events';

// shift protocol sign bits
const PG_PROTOCOL_VERSION = 3 << 16;

interface PostgresConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export class RocketPGClient extends EventEmitter {
  private config: PostgresConfig;
  private socket?: net.Socket;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  buffer: any;

  constructor(config: PostgresConfig) {
    super();
    this.config = config;
    this.buffer = Buffer.alloc(0)
  }

  connect(): Promise<void> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      return Promise.reject(new Error('Client is already connected or connecting.'));
    }
    this.state = ConnectionState.CONNECTING;
    this.socket = net.connect(this.config.port, this.config.host);
    this.socket.on('connect', () => this.handleConnect());
    this.socket.on('error', (err) => this.handleError(err));
    this.socket.on('close', () => this.handleClose());
    this.socket.on('data', (data) => this.handleData(data));
    return new Promise((resolve) => {
      this.once('connect', () => resolve());
    });
  }

  disconnect(): Promise<void> {
    if (this.state !== ConnectionState.CONNECTED) {
      return Promise.reject(new Error('Client is not connected.'));
    }
    this.socket?.destroy();
    this.state = ConnectionState.DISCONNECTED;
    return Promise.resolve();
  }

  private handleConnect() {
    this.state = ConnectionState.CONNECTED;
    this.emit('connect');
    this.sendStartupMessage();
  }

  private handleError(err: Error) {
    this.state = ConnectionState.ERROR;
    this.emit('error', err);
  }

  private handleClose() {
    if (this.state !== ConnectionState.DISCONNECTED) {
      this.state = ConnectionState.DISCONNECTED;
      this.emit('disconnect');
    }
  }

  private handleData(data: Buffer) {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (this.buffer.length >= 5) {
      const msgType = this.buffer[0];
      const msgLength = this.buffer.readUInt32BE(1) - 4;
      if (this.buffer.length >= msgLength + 5) {
        const message = this.buffer.slice(5, msgLength + 5);
        this.buffer = this.buffer.slice(msgLength + 5);
        switch (msgType) {
          case msgType.AuthenticationOk:
            this.handleAuthenticationOk(message);
            break;
          case msgType.ErrorResponse:

            break;
          case msgType.RowDescription:

            break;
          case msgType.DataRow:

            break;
          case msgType.CommandComplete:

            break;
          default:
            throw new Error(`Unknown message type: ${msgType}`);
        }
      } else {
        break;
      }
    }
  }

  private handleAuthenticationOk(message: Buffer): void {
    // - https://www.postgresql.org/docs/current/protocol-message-formats.html
    // The AuthenticationOk message is a single-byte message with the value 0.
    if (message.length !== 1 || message[0] !== 0) {
      throw new Error('Invalid AuthenticationOk message');
    }
    // Authentication successful, move on to the next step in the startup process.
    this.sendStartupMessage();
  }



  public query(data: any) {
    throw new Error();
  }

  public end() {
    throw new Error();
  }

  private sendStartupMessage() {
    const user = this.config.user;
    const database = this.config.database;
    const msg = Buffer.alloc(4 + 4 + (user.length + 1) + (database.length + 1) + 1);
    let pos = 0;
    msg.writeInt32BE(msg.length);
    pos += 4;
    msg.writeInt32BE(PG_PROTOCOL_VERSION);
    pos += 4;
    pos += msg.write('user', pos, 'ascii') + 1;
    pos += msg.write(user, pos, 'ascii') + 1;
    pos += msg.write('database', pos, 'ascii') + 1;
    pos += msg.write(database, pos, 'ascii') + 1;
    msg.writeInt8(0);
    this.socket?.write(msg);
  }
}

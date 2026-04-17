import net from 'node:net';
import tls from 'node:tls';

type SmtpSocket = net.Socket | tls.TLSSocket;

export interface SmtpRuntimeConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string | null;
}

function readSmtpResponse(socket: SmtpSocket) {
  return new Promise<string>((resolve, reject) => {
    let buffer = '';

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onClose = () => {
      cleanup();
      reject(new Error('SMTP_CONNECTION_CLOSED'));
    };

    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      if (lines.length === 0) {
        return;
      }

      const last = lines[lines.length - 1];
      if (/^\d{3} /.test(last)) {
        cleanup();
        resolve(buffer);
      }
    };

    socket.on('data', onData);
    socket.once('error', onError);
    socket.once('close', onClose);
  });
}

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: string[]) {
  socket.write(`${command}\r\n`);
  const response = await readSmtpResponse(socket);
  const ok = expectedCodes.some((code) => response.startsWith(code));
  if (!ok) {
    throw new Error(`SMTP_COMMAND_FAILED:${command}:${response.trim()}`);
  }
  return response;
}

function createConnection(config: SmtpRuntimeConfig) {
  return new Promise<SmtpSocket>((resolve, reject) => {
    const socket = config.secure
      ? tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        })
      : net.connect({
          host: config.host,
          port: config.port,
        });

    const onError = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    socket.once('error', onError);
    socket.once('connect', () => {
      socket.off('error', onError);
      resolve(socket);
    });
  });
}

async function maybeUpgradeToTls(socket: SmtpSocket, config: SmtpRuntimeConfig, ehloResponse: string) {
  if (config.secure || !/\bSTARTTLS\b/i.test(ehloResponse)) {
    return socket;
  }

  await sendCommand(socket, 'STARTTLS', ['220']);

  return new Promise<SmtpSocket>((resolve, reject) => {
    const secureSocket = tls.connect({
      socket: socket as net.Socket,
      servername: config.host,
    });

    const onError = (error: Error) => {
      secureSocket.destroy();
      reject(error);
    };

    secureSocket.once('error', onError);
    secureSocket.once('secureConnect', () => {
      secureSocket.off('error', onError);
      resolve(secureSocket);
    });
  });
}

function formatAddress(name: string, email: string) {
  const safeName = name.replace(/"/g, '\\"').trim();
  return safeName ? `"${safeName}" <${email}>` : `<${email}>`;
}

export async function sendSmtpMail(
  config: SmtpRuntimeConfig,
  input: {
    to: string;
    subject: string;
    text: string;
    html?: string | null;
  }
) {
  let socket: SmtpSocket | null = null;

  try {
    socket = await createConnection(config);
    await readSmtpResponse(socket);

    const hostLabel = 'localhost';
    let ehloResponse = await sendCommand(socket, `EHLO ${hostLabel}`, ['250']);
    socket = await maybeUpgradeToTls(socket, config, ehloResponse);
    if (socket instanceof tls.TLSSocket && !config.secure) {
      ehloResponse = await sendCommand(socket, `EHLO ${hostLabel}`, ['250']);
    }

    if (config.user && config.password) {
      if (/\bAUTH\b/i.test(ehloResponse) && /\bPLAIN\b/i.test(ehloResponse)) {
        const token = Buffer.from(`\u0000${config.user}\u0000${config.password}`).toString('base64');
        await sendCommand(socket, `AUTH PLAIN ${token}`, ['235']);
      } else {
        await sendCommand(socket, 'AUTH LOGIN', ['334']);
        await sendCommand(socket, Buffer.from(config.user).toString('base64'), ['334']);
        await sendCommand(socket, Buffer.from(config.password).toString('base64'), ['235']);
      }
    }

    await sendCommand(socket, `MAIL FROM:<${config.fromEmail}>`, ['250']);
    await sendCommand(socket, `RCPT TO:<${input.to}>`, ['250', '251']);
    await sendCommand(socket, 'DATA', ['354']);

    const boundary = `waslmedia-${Date.now().toString(36)}`;
    const headers = [
      `From: ${formatAddress(config.fromName, config.fromEmail)}`,
      `To: <${input.to}>`,
      `Subject: ${input.subject}`,
      'MIME-Version: 1.0',
      `Date: ${new Date().toUTCString()}`,
      ...(config.replyTo ? [`Reply-To: ${config.replyTo}`] : []),
      ...(input.html
        ? [`Content-Type: multipart/alternative; boundary="${boundary}"`]
        : ['Content-Type: text/plain; charset="utf-8"', 'Content-Transfer-Encoding: 8bit']),
      '',
    ];

    const body = input.html
      ? [
          `--${boundary}`,
          'Content-Type: text/plain; charset="utf-8"',
          'Content-Transfer-Encoding: 8bit',
          '',
          input.text,
          '',
          `--${boundary}`,
          'Content-Type: text/html; charset="utf-8"',
          'Content-Transfer-Encoding: 8bit',
          '',
          input.html,
          '',
          `--${boundary}--`,
        ].join('\r\n')
      : input.text;

    socket.write(`${headers.join('\r\n')}${body}\r\n.\r\n`);
    const dataResponse = await readSmtpResponse(socket);
    if (!dataResponse.startsWith('250')) {
      throw new Error(`SMTP_DATA_FAILED:${dataResponse.trim()}`);
    }

    await sendCommand(socket, 'QUIT', ['221']);
  } finally {
    socket?.destroy();
  }
}

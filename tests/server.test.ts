import { resolve } from 'node:path';

type ServerLoadOptions = {
  port?: string;
  httpsEnabled?: string;
  httpsKeyPath?: string;
  httpsCertPath?: string;
  httpsPassphrase?: string;
};

type ServerLoadResult = {
  resolveMock: jest.Mock;
  appListenMock: jest.Mock;
  httpsListenMock: jest.Mock;
  buildAppMock: jest.Mock;
  createServerMock: jest.Mock;
  readFileSyncMock: jest.Mock;
  appMock: { listen: jest.Mock };
  tokens: { AuthController: string };
};

const ENV_KEYS = ['PORT', 'HTTPS_ENABLED', 'HTTPS_KEY_PATH', 'HTTPS_CERT_PATH', 'HTTPS_PASSPHRASE'] as const;

const loadServerModule = (options: ServerLoadOptions): ServerLoadResult => {
  jest.resetModules();

  const previousEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  for (const key of ENV_KEYS) {
    previousEnv[key] = process.env[key];
    delete process.env[key];
  }

  if (options.port !== undefined) process.env.PORT = options.port;
  if (options.httpsEnabled !== undefined) process.env.HTTPS_ENABLED = options.httpsEnabled;
  if (options.httpsKeyPath !== undefined) process.env.HTTPS_KEY_PATH = options.httpsKeyPath;
  if (options.httpsCertPath !== undefined) process.env.HTTPS_CERT_PATH = options.httpsCertPath;
  if (options.httpsPassphrase !== undefined) process.env.HTTPS_PASSPHRASE = options.httpsPassphrase;

  const resolveMock = jest.fn().mockReturnValue({ id: 'controller' });
  const appListenMock = jest.fn((_port: number, callback: () => void) => {
    callback();
  });
  const httpsListenMock = jest.fn((_port: number, callback: () => void) => {
    callback();
  });
  const appMock = { listen: appListenMock };
  const buildAppMock = jest.fn().mockReturnValue(appMock);
  const createServerMock = jest.fn().mockReturnValue({ listen: httpsListenMock });
  const readFileSyncMock = jest.fn((path: string) => Buffer.from(`content:${path}`));

  const tokens = { AuthController: 'AuthController' };
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

  try {
    jest.isolateModules(() => {
      jest.doMock('dotenv/config', () => ({}));

      jest.doMock('../src/adapters/http/app', () => ({
        buildApp: buildAppMock
      }));

      jest.doMock('../src/infrastructure/di/dependencies', () => ({
        container: { resolve: resolveMock },
        TOKENS: tokens
      }));

      jest.doMock('node:https', () => ({
        createServer: createServerMock
      }));

      jest.doMock('node:fs', () => ({
        readFileSync: readFileSyncMock
      }));

      require('../src/server');
    });
  } finally {
    consoleSpy.mockRestore();

    for (const key of ENV_KEYS) {
      const value = previousEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }

  return {
    resolveMock,
    appListenMock,
    httpsListenMock,
    buildAppMock,
    createServerMock,
    readFileSyncMock,
    appMock,
    tokens
  };
};

describe('server bootstrap', () => {
  describe('#module execution', () => {
    it('should resolve controller and listen on configured PORT over HTTP by default', () => {
      // Arrange
      const { resolveMock, appListenMock, buildAppMock, createServerMock, tokens } = loadServerModule({ port: '4500' });

      // Act
      // Module execution happens during load

      // Assert
      expect(resolveMock).toHaveBeenCalledWith(tokens.AuthController);
      expect(buildAppMock).toHaveBeenCalledWith({ id: 'controller' });
      expect(appListenMock).toHaveBeenCalledWith(4500, expect.any(Function));
      expect(createServerMock).not.toHaveBeenCalled();
    });

    it('should fallback to default port 3000 when PORT is missing', () => {
      // Arrange
      const { appListenMock } = loadServerModule({});

      // Act
      // Module execution happens during load

      // Assert
      expect(appListenMock).toHaveBeenCalledWith(3000, expect.any(Function));
    });

    it('should create HTTPS server when HTTPS is enabled', () => {
      // Arrange
      const options: ServerLoadOptions = {
        port: '4443',
        httpsEnabled: 'true',
        httpsKeyPath: 'certs/dev-key.pem',
        httpsCertPath: 'certs/dev-cert.pem',
        httpsPassphrase: 'local-passphrase'
      };
      const { appMock, appListenMock, httpsListenMock, createServerMock, readFileSyncMock } = loadServerModule(options);
      const expectedKeyPath = resolve(options.httpsKeyPath!);
      const expectedCertPath = resolve(options.httpsCertPath!);

      // Act
      // Module execution happens during load

      // Assert
      expect(readFileSyncMock).toHaveBeenNthCalledWith(1, expectedKeyPath);
      expect(readFileSyncMock).toHaveBeenNthCalledWith(2, expectedCertPath);
      expect(createServerMock).toHaveBeenCalledWith(
        {
          key: Buffer.from(`content:${expectedKeyPath}`),
          cert: Buffer.from(`content:${expectedCertPath}`),
          passphrase: 'local-passphrase'
        },
        appMock
      );
      expect(httpsListenMock).toHaveBeenCalledWith(4443, expect.any(Function));
      expect(appListenMock).not.toHaveBeenCalled();
    });

    it('should throw when HTTPS is enabled without key and cert paths', () => {
      // Arrange + Act + Assert
      expect(() => loadServerModule({ httpsEnabled: 'true' })).toThrow(
        'HTTPS_ENABLED=true requires HTTPS_KEY_PATH and HTTPS_CERT_PATH'
      );
    });
  });
});

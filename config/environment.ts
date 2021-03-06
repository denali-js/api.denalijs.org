export default function environmentConfig(environment: string) {
  let config = {
    server: {
      port: process.env.PORT || 3000
    },
    // == Migrations
    //
    // If you are planning on using migrations with your database, uncomment this
    // section and provide the relevant database driver and connection details
    //
    migrations: {
      db: { }
    },
    database: {

    },
    githubToken: process.env.GITHUB_TOKEN
  };

  if (environment === 'development') {
    // development-specific config
    config.database = {
      client: 'sqlite3',
      useNullAsDefault: true,
      connection: {
        filename: '.data/development.db'
      }
    };
    config.migrations.db = config.database;
  }

  if (environment === 'test') {
    config.database = {
      client: 'pg',
      useNullAsDefault: true,
      connection: {
        host: 'localhost',
        user: 'postgres',
        database: 'denali-website'
      }
    };
    config.migrations.db = config.database;
  }

  if (environment === 'production') {
    config.database = {
      client: 'pg',
      useNullAsDefault: true,
      connection: process.env.DATABASE_URL
    };
    config.migrations.db = config.database;
    // production-specific config

    // == SSL
    //
    // You can start Denali in SSL mode by providing your private key and
    // certificate, or your pfx file contents
    //
    // config.server.ssl = {
    //   key: fs.readFileSync('privatekey.pem'),
    //   cert: fs.readFileSync('certificate.pem')
    // };
    //
    // or,
    //
    // config.server.ssl = {
    //   pfx: fs.readFileSync('server.pfx')
    // };
    //
  }

  return config;
}

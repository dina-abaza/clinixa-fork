import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Clinixa Server is running on http://localhost:${env.PORT}`);
  console.log(`🔧 Environment: ${env.NODE_ENV}`);
});

export default server;

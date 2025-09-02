import { AuthUser } from '../../auth';
import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

import { Router } from 'denali';
import cors from 'cors';

export default function middleware(router: Router) {

  router.use(cors());

}

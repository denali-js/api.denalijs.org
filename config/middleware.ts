import { Router } from '@denali-js/core';
import cors from 'cors';

export default function middleware(router: Router) {

  router.use(cors());

}

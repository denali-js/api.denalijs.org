import { RegisterContextual } from 'ava';
import { AcceptanceTestContext } from 'denali';

export default function setupApp(test: RegisterContextual<AcceptanceTestContext>) {
  test.beforeEach(async (t) => {
    t.context.app.setHeader('content-type', 'application/vnd.api+json');
  });
}
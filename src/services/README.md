# Services layer

Every domain service follows the same pattern:

```typescript
import { mockOrApi } from '@/services/mock';
import { BaseApiService } from '@/services/base';
import { domainMock } from './domain.mock';

class ExampleService extends BaseApiService {
  async list(): Promise<Item[]> {
    return mockOrApi(
      () => domainMock.list(),                    // VITE_MOCK_MODE=true
      () => this.get<Item[]>('/api/items'),       // live API
    );
  }
}

export const exampleService = new ExampleService();
```

## Mock mode

Set in `.env`:

```env
VITE_MOCK_MODE=true
```

`mockOrApi(mockFn, apiFn)` runs `mockFn` when mock mode is on; otherwise calls the HTTP client on `BaseApiService` (`get`, `post`, `patch`, `delete`).

Mock data lives in co-located `*.mock.ts` files. Mutations update in-memory state until page reload.

## Structure

| Folder | Services | Notes |
|--------|----------|-------|
| `liverCare/` | Orders, enquiries, pathology, portal, … | Primary product domain |
| `admin/` | Operations hub overview, audit log | |
| `notifications/` | Staff/patient push inbox | |
| `appointments/` | Legacy scheduling + care sessions | Secondary to orders |
| `sampleCollection/` | Home-visit sample schedule only | Lab portal methods removed |
| `external/` | Dummy payment, AI, PDF, WhatsApp | Interface + dummy impl |
| `mock/` | `mockOrApi`, `isMockMode`, session | Infrastructure |
| `base/` | `BaseApiService`, `apiClient` | HTTP + auth interceptor |

## Naming

- **File**: `PascalCaseService.ts` (e.g. `OrderService.ts`)
- **Class**: `OrderService extends BaseApiService`
- **Export**: `export const liverCareOrderService = new OrderService()` when alias clarifies domain

## Not used / removed

- In-house **lab partner portal** (`/lab/sample-collections/*` methods) — partner lab is external; see `PathologyService`
- `LabSamplesPage`, `AdminOperationsSamplesTab` — deleted

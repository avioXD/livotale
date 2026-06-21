# Services layer

All domain services extend `BaseApiService` and call the FastAPI backend at `VITE_API_BASE_URL`.

```ts
import { BaseApiService } from '@/services/base';

class ExampleService extends BaseApiService {
  async list() {
    return this.get<Item[]>('/example/items');
  }
}
```

## Environment

```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

## Layout

| Folder | Role |
|--------|------|
| `auth/` | Login, register, sessions |
| `liverCare/` | Orders, pathology, patient portal |
| `staff/` | Staff directory, profiles, onboarding |
| `appointments/` | Scheduling |
| `external/` | Payment, WhatsApp, PDF stubs until live providers are wired |

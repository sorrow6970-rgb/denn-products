import { APP_IDS, BRAND } from "@denn/shared";
import { UI_CLASS } from "@denn/ui";

// Scaffold shell only: identity + status, no product-like controls (spec 010).
export function App(): React.JSX.Element {
  return (
    <main className={UI_CLASS.shell}>
      <div className={UI_CLASS.card}>
        <span className={UI_CLASS.badge}>Scaffold ready</span>
        <h1>{BRAND} Mockup Rebuild</h1>
        <p data-testid="app-id">{APP_IDS.mockup}</p>
      </div>
    </main>
  );
}

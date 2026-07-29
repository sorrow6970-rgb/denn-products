// The explicit "미리보기 만들기" step (spec 027 §UX 1-2). Completing the catalog selection does NOT
// build a Canvas: the customer opens the composer on purpose, and the parent remounts this section
// (via `key`) whenever the selection changes, which closes the composer and disposes every local
// image owner it held.

import { useState } from "react";
import { PreviewComposer, type PreviewComposerProps } from "./PreviewComposer";

export function PreviewSection(props: PreviewComposerProps): React.JSX.Element {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="denn-composer__intro">
        <button
          type="button"
          className="denn-composer__open"
          data-testid="preview-open"
          onClick={() => setOpen(true)}
        >
          미리보기 만들기
        </button>
      </div>
    );
  }
  return <PreviewComposer {...props} />;
}

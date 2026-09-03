// Customer V2 proof screen (spec 080 §3 N-5).
//
// The saved proof PNG is the whole product here, so this component is a quiet Modern Studio frame
// around one Canvas: no catalog read, no template art, no font gate, no placeholder image, and no
// download / save / order / share / admin affordance. Existing `@denn/ui` tokens only — no new
// colour, font, icon, dependency or decorative motion.

import { Badge } from "@denn/ui";
import type { PreviewRenderPlan } from "@denn/render";
import { PreviewCanvasSurface } from "../canvas/PreviewCanvasSurface";
import type { PreviewImageBindings } from "../canvas/types";

export interface SpaceV2ProofViewProps {
  readonly plan: PreviewRenderPlan;
  readonly imageBindings: PreviewImageBindings;
}

export function SpaceV2ProofView({
  plan,
  imageBindings,
}: SpaceV2ProofViewProps): React.JSX.Element {
  return (
    <section
      className="denn-stack"
      aria-labelledby="space-v2-proof-title"
      data-testid="space-v2-proof-view"
    >
      <Badge>저장된 시안 · 열람 전용</Badge>
      {/* spec 087 (spec 084 F-3): the gate no longer prints `내 공간 시안 확인` above this, so this is
          the only heading the authenticated customer sees. Same text, same id, same
          `aria-labelledby` — only the level moved. */}
      <h1 id="space-v2-proof-title">내 공간 시안</h1>
      <p>저장된 액자 구성을 확인할 수 있습니다.</p>
      <PreviewCanvasSurface
        plan={plan}
        imageBindings={imageBindings}
        accessibleName="저장된 액자 시안"
      />
    </section>
  );
}

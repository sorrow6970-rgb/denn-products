import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge, Button, Card, Chip, TextField, VisuallyHidden } from "../index";

/** Render a primitive to static HTML so we can assert semantic/ARIA output in node (no DOM env). */
const html = (el: React.JSX.Element): string => renderToStaticMarkup(el);

describe("Button", () => {
  it("defaults to type=button so it never submits a form by accident", () => {
    expect(html(<Button>저장</Button>)).toContain('type="button"');
  });

  it("preserves a caller-specified type", () => {
    expect(html(<Button type="submit">전송</Button>)).toContain('type="submit"');
  });

  it("maps variant to a fixed class and passes standard props through", () => {
    const out = html(
      <Button variant="kakao" aria-label="카카오 주문" disabled>
        주문
      </Button>,
    );
    expect(out).toContain("denn-btn--kakao");
    expect(out).toContain('aria-label="카카오 주문"');
    expect(out).toContain("disabled");
  });
});

describe("Chip", () => {
  it("mirrors selected into aria-pressed (state is not color-only)", () => {
    expect(html(<Chip>A4</Chip>)).toContain('aria-pressed="false"');
    const on = html(<Chip selected>A4</Chip>);
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain("denn-chip--on");
  });

  it("defaults to type=button", () => {
    expect(html(<Chip>A4</Chip>)).toContain('type="button"');
  });

  it("passes native disabled through", () => {
    const out = html(
      <Chip disabled selected>
        A4
      </Chip>,
    );
    expect(out).toContain("disabled");
    // still reflects its selected state while disabled
    expect(out).toContain('aria-pressed="true"');
  });
});

describe("TextField", () => {
  it("renders a visible label bound to the input id", () => {
    const out = html(<TextField label="이름" name="name" />);
    const inputId = out.match(/<input[^>]*\sid="([^"]+)"/)?.[1];
    expect(inputId).toBeTruthy();
    expect(out).toContain(`for="${inputId}"`);
    expect(out).toContain("이름");
    expect(out).not.toContain("aria-invalid");
  });

  it("links description via aria-describedby", () => {
    const out = html(<TextField label="이메일" description="주문 확인용" />);
    const descId = out.match(/<p[^>]*\sid="([^"]+-desc)"/)?.[1];
    expect(descId).toBeTruthy();
    expect(out).toMatch(new RegExp(`aria-describedby="[^"]*${descId}`));
    expect(out).toContain("주문 확인용");
  });

  it("sets aria-invalid and renders the error text, linked by aria-describedby", () => {
    const out = html(<TextField label="전화" error="필수 항목입니다" />);
    expect(out).toContain('aria-invalid="true"');
    expect(out).toContain("필수 항목입니다");
    const errId = out.match(/<p[^>]*\sid="([^"]+-err)"/)?.[1];
    expect(errId).toBeTruthy();
    expect(out).toMatch(new RegExp(`aria-describedby="[^"]*${errId}`));
  });
});

describe("Card / Badge / VisuallyHidden", () => {
  it("Card is a plain surface container with passthrough children", () => {
    const out = html(<Card data-testid="pane">내용</Card>);
    expect(out).toContain("denn-card");
    expect(out).toContain('data-testid="pane"');
    expect(out).toContain("내용");
  });

  it("Badge renders status text with the badge class", () => {
    expect(html(<Badge>대기</Badge>)).toContain("denn-badge");
  });

  it("VisuallyHidden keeps text (clip pattern, not display:none)", () => {
    const out = html(<VisuallyHidden>메뉴 열기</VisuallyHidden>);
    expect(out).toContain("denn-visually-hidden");
    expect(out).toContain("메뉴 열기");
  });
});
